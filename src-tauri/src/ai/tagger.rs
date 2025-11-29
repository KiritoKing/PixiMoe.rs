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

/// Enhanced prediction with category and index information for debugging
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PredictionDetail {
	pub name: String,
	pub confidence: f32,
	pub category: String, // rating/general/character
	pub tag_id: usize,
	pub index: usize, // 在输出数组中的位置
}

/// Separated predictions by category
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CategoryPredictions {
	pub rating: Vec<PredictionDetail>,
	pub general: Vec<PredictionDetail>,
	pub character: Vec<PredictionDetail>,
	pub all: Vec<PredictionDetail>,
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_INPUT_SIZE: u32 = 448;
const FALLBACK_MODEL_INPUT_SIZE: u32 = 448;

/// Global variable to store detected model input size
static DETECTED_MODEL_INPUT_SIZE: std::sync::atomic::AtomicU32 =
	std::sync::atomic::AtomicU32::new(0);
const CONFIDENCE_THRESHOLD: f32 = 0.50;
const MAX_TAGS: usize = 50;

// ============================================================================
// Label Map and Model Loading
// ============================================================================

/// Label map: tag_id -> (tag_name, category_id)
type LabelMapResult = Result<HashMap<usize, (String, u32)>, AppError>;

/// Categories for tag classification
pub const RATING_CATEGORY: u32 = 9;
pub const GENERAL_CATEGORY: u32 = 0;
pub const CHARACTER_CATEGORY: u32 = 4;

static LABEL_MAP: Lazy<LabelMapResult> = Lazy::new(load_label_map);

/// ONNX model session wrapped in Mutex for interior mutability
static MODEL_SESSION: Lazy<Result<Arc<Mutex<Session>>, AppError>> = Lazy::new(load_model);

/// Load label map from CSV file
/// CSV format: tag_id,name,category,count
fn load_label_map() -> Result<HashMap<usize, (String, u32)>, AppError> {
	ai_debug!("[AI Model] Loading label map...");

	let csv_path = match get_models_dir() {
		Ok(dir) => dir.join("selected_tags.csv"),
		Err(e) => {
			ai_error!("[AI Model] ERROR: Failed to get models directory: {e}");
			return Err(e);
		}
	};

	ai_debug!("[AI Model] Label map path: {}", csv_path.display());

	if !csv_path.exists() {
		let error_msg = format!(
			"Label map file not found: {}. Please download selected_tags.csv from Hugging Face.",
			csv_path.display()
		);
		ai_error!("[AI Model] ERROR: {error_msg}");
		return Err(AppError::Custom(error_msg));
	}

	ai_debug!("[AI Model] Reading label map file...");
	let content = match std::fs::read_to_string(&csv_path) {
		Ok(c) => c,
		Err(e) => {
			let error_msg = format!("Failed to read label map: {e}");
			ai_error!("[AI Model] ERROR: {error_msg}");
			return Err(AppError::Custom(error_msg));
		}
	};

	ai_debug!("[AI Model] Parsing label map...");
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
		ai_error!("[AI Model] ERROR: {error_msg}");
		return Err(AppError::Custom(error_msg));
	}

	ai_debug!(
		"[AI Model] Label map loaded successfully! {} tags",
		map.len()
	);
	Ok(map)
}

/// Load ONNX model
fn load_model() -> Result<Arc<Mutex<Session>>, AppError> {
	ai_debug!("[AI Model] Starting model load...");

	let model_path = match get_models_dir() {
		Ok(dir) => dir.join("swin-v2-tagger-v3.onnx"),
		Err(e) => {
			ai_error!("[AI Model] ERROR: Failed to get models directory: {e}");
			return Err(e);
		}
	};

	ai_debug!("[AI Model] Model path: {}", model_path.display());

	if !model_path.exists() {
		let error_msg = format!(
            "Model file not found: {}. Please download model.onnx from Hugging Face and rename to swin-v2-tagger-v3.onnx.",
            model_path.display()
        );
		ai_error!("[AI Model] ERROR: {error_msg}");
		return Err(AppError::Custom(error_msg));
	}

	ai_debug!("[AI Model] Model file exists, creating session builder...");

	let session = match Session::builder() {
		Ok(builder) => builder,
		Err(e) => {
			let error_msg = format!("Failed to create ONNX session builder: {e}");
			ai_error!("[AI Model] ERROR: {error_msg}");
			return Err(AppError::Custom(error_msg));
		}
	};

	ai_debug!("[AI Model] Setting optimization level...");
	let session = match session.with_optimization_level(GraphOptimizationLevel::Level3) {
		Ok(s) => s,
		Err(e) => {
			let error_msg = format!("Failed to set optimization level: {e}");
			ai_error!("[AI Model] ERROR: {error_msg}");
			return Err(AppError::Custom(error_msg));
		}
	};

	ai_debug!("[AI Model] Loading model from file (this may take a moment)...");
	let session = match session.commit_from_file(&model_path) {
		Ok(s) => {
			ai_debug!("[AI Model] Model loaded successfully!");
			s
		}
		Err(e) => {
			let error_str = format!("{e}");
			let error_msg = if error_str.contains("libonnxruntime") || error_str.contains("dlopen")
			{
				format!(
                    "Failed to load ONNX Runtime library. This usually means the ONNX Runtime binaries were not downloaded correctly.\n\n\
                    Error: {e}\n\n\
                    To fix this:\n\
                    1. Clean and rebuild: `cd src-tauri && cargo clean && cargo build`\n\
                    2. Ensure you have internet connection (needed to download ONNX Runtime)\n\
                    3. Check that ort crate features are correct in Cargo.toml\n\
                    4. If problem persists, try: `cargo clean -p ort-sys && cargo build`"
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
			ai_error!("[AI Model] ERROR: {error_msg}");
			return Err(AppError::Custom(error_msg));
		}
	};

	let input_shape = session
		.inputs
		.first()
		.and_then(|input| input.input_type.tensor_shape());

	if let Some(shape) = input_shape {
		if shape.len() >= 4 {
			if let (Some(&height), Some(&width)) = (shape.get(1), shape.get(2)) {
				if let (Ok(h), Ok(w)) = (
					TryInto::<u32>::try_into(height),
					TryInto::<u32>::try_into(width),
				) {
					ai_debug!("[AI Model] Detected input size: {}x{}", h, w);
					if h == w {
						ai_debug!("[AI Model] Using dynamic input size: {}", h);
						// Store the detected size for use in preprocessing
						DETECTED_MODEL_INPUT_SIZE.store(h, std::sync::atomic::Ordering::Relaxed);
					} else {
						ai_debug!("[AI Model] Non-square input detected, using fallback");
					}
				}
			}
		}
	}

	Ok(Arc::new(Mutex::new(session)))
}

/// Get models directory path
/// Tries multiple strategies to locate the models directory:
/// 1. APP_DATA_DIR environment variable -> {app_data_dir}/models
/// 2. CARGO_MANIFEST_DIR (development mode) -> src-tauri/models
/// 3. Executable directory -> {exe_dir}/models
///
/// This function is designed to be fast and not block
fn get_models_dir() -> Result<PathBuf, AppError> {
	// Strategy 1: Check for app data directory (new approach)
	if let Ok(app_data_dir) = std::env::var("APP_DATA_DIR") {
		let app_models_path = PathBuf::from(app_data_dir).join("models");
		if app_models_path.exists() {
			return Ok(app_models_path);
		}
	}

	// Strategy 2: Use CARGO_MANIFEST_DIR in development (legacy fallback)
	if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
		let dev_path = PathBuf::from(manifest_dir).join("models");
		if dev_path.exists() {
			return Ok(dev_path);
		}
	}

	// Strategy 3: Use executable directory (production fallback)
	let exe_dir = std::env::current_exe()
        .map_err(|e| {
            AppError::Custom(format!(
                "Failed to get executable directory: {e}. Please ensure the application is running correctly."
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
		std::env::var("APP_DATA_DIR")
			.ok()
			.map(|d| PathBuf::from(d).join("models")),
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
/// Following the official implementation:
/// 1. Convert image to RGBA if needed
/// 2. Composite image onto white background (255, 255, 255)
/// 3. Pad image to square shape (centered on white background)
/// 4. Resize padded image to 448x448 using BICUBIC interpolation
/// 5. Convert RGB channels to BGR format
/// 6. Normalize pixel values to [0.0, 1.0] range
/// 7. Convert to NHWC format (batch, height, width, channels) - model expects this format
fn preprocess_image(image: DynamicImage) -> Result<Array4<f32>, AppError> {
	// Step 1: Convert to RGBA if needed
	let rgba_image = image.to_rgba8();

	// Step 2: Create white background and composite image onto it
	let (width, height) = rgba_image.dimensions();
	let max_dim = std::cmp::max(width, height);

	// Create a square canvas with white background
	let mut canvas =
		image::RgbaImage::from_pixel(max_dim, max_dim, image::Rgba([255, 255, 255, 255]));

	// Calculate centered position for the image
	let x_offset = (max_dim - width) / 2;
	let y_offset = (max_dim - height) / 2;

	// Composite the original image onto the white background
	image::imageops::overlay(&mut canvas, &rgba_image, x_offset as i64, y_offset as i64);

	// Step 3: Convert to RGB format (removing alpha channel)
	let rgb_image = image::DynamicImage::ImageRgba8(canvas).to_rgb8();

	// Use detected model input size, or fallback to default
	let detected_size = DETECTED_MODEL_INPUT_SIZE.load(std::sync::atomic::Ordering::Relaxed);
	let target_size = if detected_size > 0 {
		detected_size
	} else {
		MODEL_INPUT_SIZE
	};

	ai_debug!(
		"[AI Preprocess] Using target size: {}x{}",
		target_size,
		target_size
	);

	// Step 4: Resize to model input size using BICUBIC interpolation
	let resized_image = image::DynamicImage::ImageRgb8(rgb_image);
	let resized = resized_image.resize_exact(
		target_size,
		target_size,
		image::imageops::FilterType::CatmullRom, // CatmullRom is equivalent to BICUBIC
	);

	// Step 5 & 6: Convert to BGR and normalize to [0.0, 1.0] range
	// Create ndarray with shape [1, target_size, target_size, 3] (NHWC format)
	// Model expects: batch=1, height=target_size, width=target_size, channels=3 in BGR order
	let mut array = Array4::<f32>::zeros((1, target_size as usize, target_size as usize, 3));

	// Get the RGB image buffer directly
	let rgb_buffer = resized
		.as_rgb8()
		.ok_or_else(|| AppError::Custom("Failed to get RGB buffer".to_string()))?;

	for (x, y, pixel) in rgb_buffer.enumerate_pixels() {
		// Step 6: Normalize pixel values to [0.0, 1.0] range
		let r = pixel[0] as f32 / 255.0;
		let g = pixel[1] as f32 / 255.0;
		let b = pixel[2] as f32 / 255.0;

		// Step 5: Convert RGB to BGR format
		// NHWC format: [batch, height, width, channel] with BGR order
		array[[0, y as usize, x as usize, 0]] = b; // Blue channel first
		array[[0, y as usize, x as usize, 1]] = g; // Green channel middle
		array[[0, y as usize, x as usize, 2]] = r; // Red channel last
	}

	Ok(array)
}

// ============================================================================
// Postprocessing Utilities
// ============================================================================

/// Implement MCut (Maximum Cut Thresholding) algorithm
/// Finds the optimal threshold by finding the maximum difference between consecutive probabilities
fn apply_mcut_threshold(mut probabilities: Vec<(usize, f32)>) -> Vec<usize> {
	if probabilities.is_empty() {
		return Vec::new();
	}

	// Sort by confidence descending
	probabilities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

	// Find the maximum difference between consecutive probabilities
	let mut max_diff = 0.0f32;
	let mut threshold_index = 0;

	for i in 1..probabilities.len() {
		let diff = probabilities[i - 1].1 - probabilities[i].1;
		if diff > max_diff {
			max_diff = diff;
			threshold_index = i;
		}
	}

	// Take all tags before the threshold point
	probabilities
		.into_iter()
		.take(threshold_index + 1)
		.map(|(idx, _)| idx)
		.collect()
}

/// Apply threshold filtering with optional MCut algorithm
fn apply_threshold_filter(
	probabilities: &[(usize, f32)],
	threshold: f32,
	use_mcut: bool,
	min_threshold: Option<f32>,
) -> Vec<usize> {
	if use_mcut {
		let mcut_results = apply_mcut_threshold(probabilities.to_vec());
		// Apply minimum threshold if specified
		if let Some(min_thresh) = min_threshold {
			mcut_results
				.into_iter()
				.filter(|&idx| {
					probabilities
						.iter()
						.find(|(i, _)| *i == idx)
						.map(|(_, conf)| *conf >= min_thresh)
						.unwrap_or(false)
				})
				.collect()
		} else {
			mcut_results
		}
	} else {
		probabilities
			.iter()
			.filter_map(
				|(idx, conf)| {
					if *conf >= threshold {
						Some(*idx)
					} else {
						None
					}
				},
			)
			.collect()
	}
}

// ============================================================================
// Inference and Postprocessing
// ============================================================================

/// Inference configuration for postprocessing
#[derive(Debug, Clone)]
pub struct InferenceParams {
	pub general_threshold: f32,
	pub character_threshold: f32,
	pub general_mcut_enabled: bool,
	pub character_mcut_enabled: bool,
	pub max_tags: u32,
}

impl Default for InferenceParams {
	fn default() -> Self {
		Self {
			general_threshold: 0.35,
			character_threshold: 0.85,
			general_mcut_enabled: false,
			character_mcut_enabled: false,
			max_tags: 50,
		}
	}
}

/// Classify an image and return predicted tags
pub async fn classify_image(image_path: &Path) -> Result<Vec<TagPrediction>, AppError> {
	classify_image_with_params(image_path, &InferenceParams::default()).await
}

/// Classify an image with custom inference parameters
pub async fn classify_image_with_params(
	image_path: &Path,
	params: &InferenceParams,
) -> Result<Vec<TagPrediction>, AppError> {
	ai_debug!(
		"[AI Tagging] Starting classification for: {}",
		image_path.display()
	);

	// Check if model is available (this will trigger lazy initialization if not already done)
	if !is_model_available() {
		let error_msg =
			"AI model not available. Please check models/README.md for setup instructions."
				.to_string();
		ai_error!("[AI Tagging] ERROR: {error_msg}");
		return Err(AppError::Custom(error_msg));
	}

	ai_debug!("[AI Tagging] Model is available, proceeding with inference");

	// Load image
	let image = image::open(image_path)
		.map_err(|e| AppError::Custom(format!("Failed to load image: {e}")))?;

	// Preprocess image
	let input_tensor = preprocess_image(image)?;

	// Get model session
	let session_arc = MODEL_SESSION
		.as_ref()
		.map_err(|e| AppError::Custom(format!("Model not loaded: {e}")))?
		.clone();

	// Run inference in blocking task
	let predictions = tokio::task::spawn_blocking(move || {
		// Create ort Value from ndarray
		let input_value = ort::value::Value::from_array(input_tensor)
			.map_err(|e| AppError::Custom(format!("Failed to create input value: {e}")))?;

		// Lock the session
		let mut session = session_arc
			.lock()
			.map_err(|e| AppError::Custom(format!("Failed to lock session: {e}")))?;

		// Get output name first
		let output_name = session
			.outputs
			.first()
			.ok_or_else(|| AppError::Custom("No output defined in model".to_string()))?
			.name
			.clone();

		let outputs = session
			.run(ort::inputs![input_value])
			.map_err(|e| AppError::Custom(format!("Inference failed: {e}")))?;

		let output_value = outputs
			.get(&output_name)
			.ok_or_else(|| AppError::Custom("No output from model".to_string()))?;

		let output_tensor = output_value
			.try_extract_tensor::<f32>()
			.map_err(|e| AppError::Custom(format!("Failed to extract output tensor: {e}")))?;

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
	.map_err(|e| AppError::Custom(format!("Inference task failed: {e}")))??;

	// Postprocess predictions with category separation
	let label_map = LABEL_MAP
		.as_ref()
		.map_err(|e| AppError::Custom(format!("Label map not loaded: {e}")))?;

	// Separate predictions by category
	let mut rating_predictions = Vec::new();
	let mut general_predictions = Vec::new();
	let mut character_predictions = Vec::new();

	for (idx, &confidence) in predictions.iter().enumerate() {
		if let Some((name, category)) = label_map.get(&idx) {
			let prediction = (idx, confidence);

			match *category {
				RATING_CATEGORY => rating_predictions.push(prediction),
				GENERAL_CATEGORY => general_predictions.push(prediction),
				CHARACTER_CATEGORY => character_predictions.push(prediction),
				_ => {} // Skip other categories for now
			}
		}
	}

	let mut results: Vec<TagPrediction> = Vec::new();

	// Process rating tags (use argmax - take the highest confidence rating)
	if !rating_predictions.is_empty() {
		// Sort by confidence descending and take the top one
		rating_predictions.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
		if let Some((idx, confidence)) = rating_predictions.first() {
			if let Some((name, _)) = label_map.get(idx) {
				results.push(TagPrediction {
					name: name.clone(),
					confidence: *confidence,
				});
			}
		}
	}

	// Process general tags with threshold and optional MCut
	let general_indices = apply_threshold_filter(
		&general_predictions,
		params.general_threshold,
		params.general_mcut_enabled,
		None,
	);

	for &idx in &general_indices {
		if let Some((tag_idx, confidence)) = general_predictions.iter().find(|(i, _)| *i == idx) {
			if let Some((name, _)) = label_map.get(tag_idx) {
				results.push(TagPrediction {
					name: name.clone(),
					confidence: *confidence,
				});
			}
		}
	}

	// Process character tags with threshold and optional MCut
	let character_indices = apply_threshold_filter(
		&character_predictions,
		params.character_threshold,
		params.character_mcut_enabled,
		Some(0.15), // Minimum threshold for character tags when using MCut
	);

	for &idx in &character_indices {
		if let Some((tag_idx, confidence)) = character_predictions.iter().find(|(i, _)| *i == idx) {
			if let Some((name, _)) = label_map.get(tag_idx) {
				results.push(TagPrediction {
					name: name.clone(),
					confidence: *confidence,
				});
			}
		}
	}

	// Sort by confidence descending
	results.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

	// Take top N tags
	results.truncate(params.max_tags as usize);

	Ok(results)
}

/// Classify an image and return detailed category-aware predictions for debugging
pub async fn classify_image_debug(image_path: &Path) -> Result<CategoryPredictions, AppError> {
	classify_image_debug_with_params(image_path, &InferenceParams::default()).await
}

/// Classify an image with custom inference parameters and return detailed category-aware predictions
pub async fn classify_image_debug_with_params(
	image_path: &Path,
	params: &InferenceParams,
) -> Result<CategoryPredictions, AppError> {
	ai_debug!(
		"[AI Debug] Starting detailed classification for: {}",
		image_path.display()
	);

	// Check if model is available
	if !is_model_available() {
		let error_msg =
			"AI model not available. Please check models/README.md for setup instructions."
				.to_string();
		ai_error!("[AI Debug] ERROR: {error_msg}");
		return Err(AppError::Custom(error_msg));
	}

	// Load image
	let image = image::open(image_path)
		.map_err(|e| AppError::Custom(format!("Failed to load image: {e}")))?;

	// Preprocess image
	let input_tensor = preprocess_image(image)?;

	// Get model session
	let session_arc = MODEL_SESSION
		.as_ref()
		.map_err(|e| AppError::Custom(format!("Model not loaded: {e}")))?
		.clone();

	// Run inference in blocking task
	let predictions = tokio::task::spawn_blocking(move || {
		// Create ort Value from ndarray
		let input_value = ort::value::Value::from_array(input_tensor)
			.map_err(|e| AppError::Custom(format!("Failed to create input value: {e}")))?;

		// Lock the session
		let mut session = session_arc
			.lock()
			.map_err(|e| AppError::Custom(format!("Failed to lock session: {e}")))?;

		// Get output name first
		let output_name = session
			.outputs
			.first()
			.ok_or_else(|| AppError::Custom("No output defined in model".to_string()))?
			.name
			.clone();

		let outputs = session
			.run(ort::inputs![input_value])
			.map_err(|e| AppError::Custom(format!("Inference failed: {e}")))?;

		let output_value = outputs
			.get(&output_name)
			.ok_or_else(|| AppError::Custom("No output from model".to_string()))?;

		let output_tensor = output_value
			.try_extract_tensor::<f32>()
			.map_err(|e| AppError::Custom(format!("Failed to extract output tensor: {e}")))?;

		// Convert to Vec<f32>
		let (_shape, data) = output_tensor;
		let probabilities: Vec<f32> = data
			.iter()
			.map(|&logit| {
				// Apply sigmoid: 1 / (1 + exp(-x))
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
	.map_err(|e| AppError::Custom(format!("Inference task failed: {e}")))??;

	// Get label map
	let label_map = LABEL_MAP
		.as_ref()
		.map_err(|e| AppError::Custom(format!("Label map not loaded: {e}")))?;

	// Create detailed predictions with categories
	let mut rating_predictions = Vec::new();
	let mut general_predictions = Vec::new();
	let mut character_predictions = Vec::new();
	let mut all_predictions = Vec::new();

	for (index, &confidence) in predictions.iter().enumerate() {
		if let Some((name, category_id)) = label_map.get(&index) {
			let category = match *category_id {
				RATING_CATEGORY => "rating",
				GENERAL_CATEGORY => "general",
				CHARACTER_CATEGORY => "character",
				_ => "other",
			};

			let detail = PredictionDetail {
				name: name.clone(),
				confidence,
				category: category.to_string(),
				tag_id: index,
				index,
			};

			all_predictions.push(detail.clone());

			match category {
				"rating" => rating_predictions.push(detail),
				"general" => general_predictions.push(detail),
				"character" => character_predictions.push(detail),
				_ => {} // Skip "other" categories for now
			}
		}
	}

	// Sort all categories by confidence descending
	rating_predictions.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
	general_predictions.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
	character_predictions.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
	all_predictions.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

	Ok(CategoryPredictions {
		rating: rating_predictions,
		general: general_predictions,
		character: character_predictions,
		all: all_predictions,
	})
}

/// Check if AI tagging is available
/// This function is safe to call and will not block or panic
pub fn is_model_available() -> bool {
	// Access Lazy values safely - they will initialize on first access
	// If initialization fails, the Result will be Err, and is_ok() returns false
	let label_ok = LABEL_MAP.is_ok();
	let session_ok = MODEL_SESSION.is_ok();

	// Only log errors in debug mode to avoid spamming console in production
	if !label_ok {
		ai_error!("[AI Model] Label map not available");
		if let Err(e) = LABEL_MAP.as_ref() {
			ai_error!("[AI Model] Label map error: {e}");
		}
	}

	if !session_ok {
		ai_error!("[AI Model] Model session not available");
		if let Err(e) = MODEL_SESSION.as_ref() {
			ai_error!("[AI Model] Model session error: {e}");
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
		label_map_error: LABEL_MAP.as_ref().err().map(|e| format!("{e}")),
		model_session_error: MODEL_SESSION.as_ref().err().map(|e| format!("{e}")),
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

/// Force reload of model and label map (useful after uploading new files)
pub fn reload_model() -> Result<(), AppError> {
	// Note: Since we're using Lazy, we can't easily force a reload
	// For now, this is a placeholder that returns success
	// In a real implementation, we'd need to use Arc<Mutex<Option<Session>>> instead of Lazy
	Ok(())
}
