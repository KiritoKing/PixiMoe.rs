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
const CONFIDENCE_THRESHOLD: f32 = 0.50;
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
	eprintln!("[AI Model] Loading label map...");

	let csv_path = match get_models_dir() {
		Ok(dir) => dir.join("selected_tags.csv"),
		Err(e) => {
			eprintln!("[AI Model] ERROR: Failed to get models directory: {}", e);
			return Err(e);
		}
	};

	eprintln!("[AI Model] Label map path: {}", csv_path.display());

	if !csv_path.exists() {
		let error_msg = format!(
			"Label map file not found: {}. Please download selected_tags.csv from Hugging Face.",
			csv_path.display()
		);
		eprintln!("[AI Model] ERROR: {}", error_msg);
		return Err(AppError::Custom(error_msg));
	}

	eprintln!("[AI Model] Reading label map file...");
	let content = match std::fs::read_to_string(&csv_path) {
		Ok(c) => c,
		Err(e) => {
			let error_msg = format!("Failed to read label map: {}", e);
			eprintln!("[AI Model] ERROR: {}", error_msg);
			return Err(AppError::Custom(error_msg));
		}
	};

	eprintln!("[AI Model] Parsing label map...");
	let mut map = HashMap::new();
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
		let error_msg = "Label map is empty or invalid".to_string();
		eprintln!("[AI Model] ERROR: {}", error_msg);
		return Err(AppError::Custom(error_msg));
	}

	eprintln!(
		"[AI Model] Label map loaded successfully! {} tags",
		map.len()
	);
	Ok(map)
}

/// Load ONNX model
fn load_model() -> Result<Arc<Mutex<Session>>, AppError> {
	eprintln!("[AI Model] Starting model load...");

	let model_path = match get_models_dir() {
		Ok(dir) => dir.join("swin-v2-tagger-v3.onnx"),
		Err(e) => {
			eprintln!("[AI Model] ERROR: Failed to get models directory: {}", e);
			return Err(e);
		}
	};

	eprintln!("[AI Model] Model path: {}", model_path.display());

	if !model_path.exists() {
		let error_msg = format!(
            "Model file not found: {}. Please download model.onnx from Hugging Face and rename to swin-v2-tagger-v3.onnx.",
            model_path.display()
        );
		eprintln!("[AI Model] ERROR: {}", error_msg);
		return Err(AppError::Custom(error_msg));
	}

	eprintln!("[AI Model] Model file exists, creating session builder...");

	let session = match Session::builder() {
		Ok(builder) => builder,
		Err(e) => {
			let error_msg = format!("Failed to create ONNX session builder: {}", e);
			eprintln!("[AI Model] ERROR: {}", error_msg);
			return Err(AppError::Custom(error_msg));
		}
	};

	eprintln!("[AI Model] Setting optimization level...");
	let session = match session.with_optimization_level(GraphOptimizationLevel::Level3) {
		Ok(s) => s,
		Err(e) => {
			let error_msg = format!("Failed to set optimization level: {}", e);
			eprintln!("[AI Model] ERROR: {}", error_msg);
			return Err(AppError::Custom(error_msg));
		}
	};

	eprintln!("[AI Model] Loading model from file (this may take a moment)...");
	let session = match session.commit_from_file(&model_path) {
		Ok(s) => {
			eprintln!("[AI Model] Model loaded successfully!");
			s
		}
		Err(e) => {
			let error_str = format!("{}", e);
			let error_msg = if error_str.contains("libonnxruntime") || error_str.contains("dlopen")
			{
				format!(
                    "Failed to load ONNX Runtime library. This usually means the ONNX Runtime binaries were not downloaded correctly.\n\n\
                    Error: {}\n\n\
                    To fix this:\n\
                    1. Clean and rebuild: `cd src-tauri && cargo clean && cargo build`\n\
                    2. Ensure you have internet connection (needed to download ONNX Runtime)\n\
                    3. Check that ort crate features are correct in Cargo.toml\n\
                    4. If problem persists, try: `cargo clean -p ort-sys && cargo build`",
                    e
                )
			} else {
				format!(
					"Failed to load model from {}: {}\n\n\
                    This might be due to:\n\
                    - Corrupted model file\n\
                    - Missing ONNX Runtime dependencies\n\
                    - Incompatible model version",
					model_path.display(),
					e
				)
			};
			eprintln!("[AI Model] ERROR: {}", error_msg);
			return Err(AppError::Custom(error_msg));
		}
	};

	Ok(Arc::new(Mutex::new(session)))
}

/// Get models directory path
/// Tries multiple strategies to locate the models directory:
/// 1. CARGO_MANIFEST_DIR (development mode) -> src-tauri/models
/// 2. Executable directory -> {exe_dir}/models
/// This function is designed to be fast and not block
fn get_models_dir() -> Result<PathBuf, AppError> {
	// Strategy 1: Use CARGO_MANIFEST_DIR in development (fastest path)
	if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
		let dev_path = PathBuf::from(manifest_dir).join("models");
		if dev_path.exists() {
			return Ok(dev_path);
		}
	}

	// Strategy 2: Use executable directory (production or fallback)
	let exe_dir = std::env::current_exe()
        .map_err(|e| {
            AppError::Custom(format!(
                "Failed to get executable directory: {}. Please ensure the application is running correctly.",
                e
            ))
        })?
        .parent()
        .ok_or_else(|| {
            AppError::Custom(
                "Failed to get executable parent directory. Please ensure the application is running correctly.".to_string()
            )
        })?
        .to_path_buf();

	let prod_path = exe_dir.join("models");
	if prod_path.exists() {
		return Ok(prod_path);
	}

	// All strategies failed - return error with helpful message
	let attempted_paths = vec![
		std::env::var("CARGO_MANIFEST_DIR")
			.ok()
			.map(|d| PathBuf::from(d).join("models")),
		Some(prod_path.clone()),
	]
	.into_iter()
	.flatten()
	.collect::<Vec<_>>();

	Err(AppError::Custom(format!(
        "Models directory not found. Tried:\n  {}\n\nPlease ensure model files (swin-v2-tagger-v3.onnx and selected_tags.csv) are in one of these locations.",
        attempted_paths
            .iter()
            .map(|p| format!("  - {}", p.display()))
            .collect::<Vec<_>>()
            .join("\n")
    )))
}

// ============================================================================
// Image Preprocessing
// ============================================================================

/// Preprocess image for model input
/// - Resize to 448x448
/// - Convert to RGB
/// - Normalize to [0.0, 1.0]
/// - Convert to NHWC format (batch, height, width, channels) - model expects this format
fn preprocess_image(image: DynamicImage) -> Result<Array4<f32>, AppError> {
	// Resize to model input size
	let resized = image.resize_exact(
		MODEL_INPUT_SIZE,
		MODEL_INPUT_SIZE,
		image::imageops::FilterType::Lanczos3,
	);

	// Convert to RGB
	let rgb_image = resized.to_rgb8();

	// Create ndarray with shape [1, 448, 448, 3] (NHWC format)
	// Model expects: batch=1, height=448, width=448, channels=3
	let mut array =
		Array4::<f32>::zeros((1, MODEL_INPUT_SIZE as usize, MODEL_INPUT_SIZE as usize, 3));

	for (x, y, pixel) in rgb_image.enumerate_pixels() {
		let r = pixel[0] as f32 / 255.0;
		let g = pixel[1] as f32 / 255.0;
		let b = pixel[2] as f32 / 255.0;

		// NHWC format: [batch, height, width, channel]
		array[[0, y as usize, x as usize, 0]] = r;
		array[[0, y as usize, x as usize, 1]] = g;
		array[[0, y as usize, x as usize, 2]] = b;
	}

	Ok(array)
}

// ============================================================================
// Inference and Postprocessing
// ============================================================================

/// Classify an image and return predicted tags
pub async fn classify_image(image_path: &Path) -> Result<Vec<TagPrediction>, AppError> {
	eprintln!(
		"[AI Tagging] Starting classification for: {}",
		image_path.display()
	);

	// Check if model is available (this will trigger lazy initialization if not already done)
	if !is_model_available() {
		let error_msg =
			"AI model not available. Please check models/README.md for setup instructions."
				.to_string();
		eprintln!("[AI Tagging] ERROR: {}", error_msg);
		return Err(AppError::Custom(error_msg));
	}

	eprintln!("[AI Tagging] Model is available, proceeding with inference");

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
		// Model outputs logits, need to apply sigmoid to get probabilities
		let (_shape, data) = output_tensor;
		let probabilities: Vec<f32> = data
			.iter()
			.map(|&logit| {
				// Apply sigmoid: 1 / (1 + exp(-x))
				// Use stable sigmoid to avoid overflow
				if logit >= 0.0 {
					1.0 / (1.0 + (-logit).exp())
				} else {
					let exp_x = logit.exp();
					exp_x / (1.0 + exp_x)
				}
			})
			.collect();

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
/// This function is safe to call and will not block or panic
pub fn is_model_available() -> bool {
	// Access Lazy values safely - they will initialize on first access
	// If initialization fails, the Result will be Err, and is_ok() returns false
	let label_ok = LABEL_MAP.is_ok();
	let session_ok = MODEL_SESSION.is_ok();

	if !label_ok {
		eprintln!("[AI Model] Label map not available");
		if let Err(e) = LABEL_MAP.as_ref() {
			eprintln!("[AI Model] Label map error: {}", e);
		}
	}

	if !session_ok {
		eprintln!("[AI Model] Model session not available");
		if let Err(e) = MODEL_SESSION.as_ref() {
			eprintln!("[AI Model] Model session error: {}", e);
		}
	}

	label_ok && session_ok
}

/// Get model status information for debugging
pub fn get_model_status() -> Result<ModelStatus, AppError> {
	let models_dir = get_models_dir()?;
	let model_path = models_dir.join("swin-v2-tagger-v3.onnx");
	let csv_path = models_dir.join("selected_tags.csv");

	Ok(ModelStatus {
		models_dir: models_dir.display().to_string(),
		model_file_exists: model_path.exists(),
		model_file_path: model_path.display().to_string(),
		csv_file_exists: csv_path.exists(),
		csv_file_path: csv_path.display().to_string(),
		label_map_loaded: LABEL_MAP.is_ok(),
		model_session_loaded: MODEL_SESSION.is_ok(),
		label_map_error: LABEL_MAP.as_ref().err().map(|e| format!("{}", e)),
		model_session_error: MODEL_SESSION.as_ref().err().map(|e| format!("{}", e)),
	})
}

/// Model status information for debugging
#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelStatus {
	pub models_dir: String,
	pub model_file_exists: bool,
	pub model_file_path: String,
	pub csv_file_exists: bool,
	pub csv_file_path: String,
	pub label_map_loaded: bool,
	pub model_session_loaded: bool,
	pub label_map_error: Option<String>,
	pub model_session_error: Option<String>,
}
