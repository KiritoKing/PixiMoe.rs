use crate::error::AppError;
use image::DynamicImage;
use ndarray::Array4;
use once_cell::sync::Lazy;
use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone)]
pub struct TagPrediction {
    pub name: String,
    pub confidence: f32,
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_INPUT_SIZE: u32 = 448;
const CONFIDENCE_THRESHOLD: f32 = 0.35;
const MAX_TAGS: usize = 50;

// ============================================================================
// Label Map and Model Loading
// ============================================================================

/// Label map: tag_id -> tag_name
static LABEL_MAP: Lazy<Result<HashMap<usize, (String, u32)>, AppError>> =
    Lazy::new(|| load_label_map());

/// ONNX model session wrapped in Mutex for interior mutability
static MODEL_SESSION: Lazy<Result<Arc<Mutex<Session>>, AppError>> = Lazy::new(|| load_model());

/// Load label map from CSV file
/// CSV format: tag_id,name,category,count
fn load_label_map() -> Result<HashMap<usize, (String, u32)>, AppError> {
    let csv_path = get_models_dir()?.join("selected_tags.csv");

    if !csv_path.exists() {
        return Err(AppError::Custom(format!(
            "Label map file not found: {}. Please download selected_tags.csv from Hugging Face.",
            csv_path.display()
        )));
    }

    let mut map = HashMap::new();
    let content = std::fs::read_to_string(&csv_path)
        .map_err(|e| AppError::Custom(format!("Failed to read label map: {}", e)))?;

    for (idx, line) in content.lines().enumerate() {
        if idx == 0 {
            continue; // Skip header
        }

        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 4 {
            if let (Ok(tag_id), Ok(category)) = (parts[0].parse::<usize>(), parts[2].parse::<u32>())
            {
                let name = parts[1].to_string();
                map.insert(tag_id, (name, category));
            }
        }
    }

    if map.is_empty() {
        return Err(AppError::Custom(
            "Label map is empty or invalid".to_string(),
        ));
    }

    Ok(map)
}

/// Load ONNX model
fn load_model() -> Result<Arc<Mutex<Session>>, AppError> {
    let model_path = get_models_dir()?.join("swin-v2-tagger-v3.onnx");

    if !model_path.exists() {
        return Err(AppError::Custom(format!(
            "Model file not found: {}. Please download model.onnx from Hugging Face and rename to swin-v2-tagger-v3.onnx.",
            model_path.display()
        )));
    }

    let session = Session::builder()
        .map_err(|e| AppError::Custom(format!("Failed to create ONNX session builder: {}", e)))?
        .with_optimization_level(GraphOptimizationLevel::Level3)
        .map_err(|e| AppError::Custom(format!("Failed to set optimization level: {}", e)))?
        .commit_from_file(&model_path)
        .map_err(|e| AppError::Custom(format!("Failed to load model: {}", e)))?;

    Ok(Arc::new(Mutex::new(session)))
}

/// Get models directory path
fn get_models_dir() -> Result<PathBuf, AppError> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| AppError::Custom(format!("Failed to get executable directory: {}", e)))?
        .parent()
        .ok_or_else(|| AppError::Custom("Failed to get parent directory".to_string()))?
        .to_path_buf();

    // In development, models are in src-tauri/models
    // In production, they should be in the same directory as the executable
    let dev_models = exe_dir
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .map(|p| p.join("src-tauri").join("models"));

    if let Some(dev_path) = dev_models {
        if dev_path.exists() {
            return Ok(dev_path);
        }
    }

    // Fallback to exe directory
    Ok(exe_dir.join("models"))
}

// ============================================================================
// Image Preprocessing
// ============================================================================

/// Preprocess image for model input
/// - Resize to 448x448
/// - Convert to RGB
/// - Normalize to [0.0, 1.0]
/// - Convert to NCHW format (batch, channels, height, width)
fn preprocess_image(image: DynamicImage) -> Result<Array4<f32>, AppError> {
    // Resize to model input size
    let resized = image.resize_exact(
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
        image::imageops::FilterType::Lanczos3,
    );

    // Convert to RGB
    let rgb_image = resized.to_rgb8();

    // Create ndarray with shape [1, 3, 448, 448] (NCHW format)
    let mut array =
        Array4::<f32>::zeros((1, 3, MODEL_INPUT_SIZE as usize, MODEL_INPUT_SIZE as usize));

    for (x, y, pixel) in rgb_image.enumerate_pixels() {
        let r = pixel[0] as f32 / 255.0;
        let g = pixel[1] as f32 / 255.0;
        let b = pixel[2] as f32 / 255.0;

        array[[0, 0, y as usize, x as usize]] = r;
        array[[0, 1, y as usize, x as usize]] = g;
        array[[0, 2, y as usize, x as usize]] = b;
    }

    Ok(array)
}

// ============================================================================
// Inference and Postprocessing
// ============================================================================

/// Classify an image and return predicted tags
pub async fn classify_image(image_path: &Path) -> Result<Vec<TagPrediction>, AppError> {
    // Check if model is available
    if !is_model_available() {
        return Err(AppError::Custom(
            "AI model not available. Please check models/README.md for setup instructions."
                .to_string(),
        ));
    }

    // Load image
    let image = image::open(image_path)
        .map_err(|e| AppError::Custom(format!("Failed to load image: {}", e)))?;

    // Preprocess image
    let input_tensor = preprocess_image(image)?;

    // Get model session
    let session_arc = MODEL_SESSION
        .as_ref()
        .map_err(|e| AppError::Custom(format!("Model not loaded: {}", e)))?
        .clone();

    // Run inference in blocking task
    let predictions = tokio::task::spawn_blocking(move || {
        // Create ort Value from ndarray
        let input_value = ort::value::Value::from_array(input_tensor)
            .map_err(|e| AppError::Custom(format!("Failed to create input value: {}", e)))?;

        // Lock the session
        let mut session = session_arc
            .lock()
            .map_err(|e| AppError::Custom(format!("Failed to lock session: {}", e)))?;

        // Get output name first
        let output_name = session
            .outputs
            .first()
            .ok_or_else(|| AppError::Custom("No output defined in model".to_string()))?
            .name
            .clone();

        let outputs = session
            .run(ort::inputs![input_value])
            .map_err(|e| AppError::Custom(format!("Inference failed: {}", e)))?;

        let output_value = outputs
            .get(&output_name)
            .ok_or_else(|| AppError::Custom("No output from model".to_string()))?;

        let output_tensor = output_value
            .try_extract_tensor::<f32>()
            .map_err(|e| AppError::Custom(format!("Failed to extract output tensor: {}", e)))?;

        // Convert to Vec<f32>
        let (_shape, data) = output_tensor;
        let probabilities: Vec<f32> = data.iter().copied().collect();

        Ok::<Vec<f32>, AppError>(probabilities)
    })
    .await
    .map_err(|e| AppError::Custom(format!("Inference task failed: {}", e)))??;

    // Postprocess predictions
    let label_map = LABEL_MAP
        .as_ref()
        .map_err(|e| AppError::Custom(format!("Label map not loaded: {}", e)))?;

    let mut results: Vec<TagPrediction> = predictions
        .iter()
        .enumerate()
        .filter_map(|(idx, &confidence)| {
            if confidence > CONFIDENCE_THRESHOLD {
                if let Some((name, category)) = label_map.get(&idx) {
                    // Exclude "meta" category (category 9)
                    if *category != 9 {
                        return Some(TagPrediction {
                            name: name.clone(),
                            confidence,
                        });
                    }
                }
            }
            None
        })
        .collect();

    // Sort by confidence descending
    results.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

    // Take top N tags
    results.truncate(MAX_TAGS);

    Ok(results)
}

/// Check if AI tagging is available
pub fn is_model_available() -> bool {
    LABEL_MAP.is_ok() && MODEL_SESSION.is_ok()
}
