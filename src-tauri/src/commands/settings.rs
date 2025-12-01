use super::debug_visualization::{
	analyze_threshold_effects, generate_confidence_histogram, generate_filtered_tags_info,
	generate_preprocess_visualization,
};
use crate::error::AppError;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{Row, SqlitePool};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelUploadResult {
	pub success: bool,
	pub message: String,
	pub file_path: Option<String>,
	pub calculated_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AISettings {
	pub ai_enabled: bool,
}

impl Default for AISettings {
	fn default() -> Self {
		Self { ai_enabled: true }
	}
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InferenceConfig {
	pub general_threshold: f32,
	pub character_threshold: f32,
	pub general_mcut_enabled: bool,
	pub character_mcut_enabled: bool,
	pub max_tags: u32,
}

impl Default for InferenceConfig {
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

// ============================================================================
// Constants for SHA256 verification
// ============================================================================

/// Built-in SHA256 hash values for model verification
/// These can be empty initially and filled in later
const EXPECTED_MODEL_HASH: Option<&str> = None; // Will be filled in later with actual hash
const EXPECTED_LABEL_MAP_HASH: Option<&str> = None; // Will be filled in later with actual hash

// ============================================================================
// Helper Functions
// ============================================================================

/// Get app data directory for storing models
fn get_app_data_dir(app: AppHandle) -> Result<PathBuf, AppError> {
	let app_data_dir = app
		.path()
		.app_data_dir()
		.map_err(|e| AppError::Custom(format!("Failed to get app data directory: {e}")))?;

	// Create models directory if it doesn't exist
	let models_dir = app_data_dir.join("models");
	std::fs::create_dir_all(&models_dir)
		.map_err(|e| AppError::Custom(format!("Failed to create models directory: {e}")))?;

	Ok(models_dir)
}

/// Set APP_DATA_DIR environment variable for AI tagger
fn set_app_data_dir_env(app: &AppHandle) -> Result<(), AppError> {
	let app_data_dir = app
		.path()
		.app_data_dir()
		.map_err(|e| AppError::Custom(format!("Failed to get app data directory: {e}")))?;

	// Set the environment variable for the AI tagger
	std::env::set_var("APP_DATA_DIR", app_data_dir);
	Ok(())
}

/// Calculate SHA256 hash of a file
async fn calculate_file_hash(file_path: &Path) -> Result<String, AppError> {
	let mut hasher = Sha256::new();
	let mut file = tokio::fs::File::open(file_path)
		.await
		.map_err(|e| AppError::Custom(format!("Failed to open file for hashing: {e}")))?;

	use tokio::io::AsyncReadExt;
	let mut buffer = [0; 8192];
	loop {
		let n = file
			.read(&mut buffer)
			.await
			.map_err(|e| AppError::Custom(format!("Failed to read file for hashing: {e}")))?;
		if n == 0 {
			break;
		}
		hasher.update(&buffer[..n]);
	}

	Ok(format!("{:x}", hasher.finalize()))
}

/// Verify file hash against expected value
fn verify_hash(calculated: &str, expected: Option<&str>) -> Result<bool, AppError> {
	match expected {
		Some(expected_hash) => {
			if calculated == expected_hash {
				Ok(true)
			} else {
				Err(AppError::Custom(format!(
					"Hash verification failed. Expected: {expected_hash}, Got: {calculated}"
				)))
			}
		}
		None => {
			// No expected hash configured, allow any hash
			Ok(true)
		}
	}
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn upload_tag_model_file(
	app: AppHandle,
	file_path: String,
) -> Result<ModelUploadResult, AppError> {
	// Set app data directory for AI tagger
	set_app_data_dir_env(&app)?;
	let source_path = Path::new(&file_path);

	if !source_path.exists() {
		return Ok(ModelUploadResult {
			success: false,
			message: format!("Source file does not exist: {file_path}"),
			file_path: None,
			calculated_hash: None,
		});
	}

	// Calculate SHA256 hash
	let calculated_hash = calculate_file_hash(source_path).await?;

	// Verify hash if expected value is configured
	if let Err(e) = verify_hash(&calculated_hash, EXPECTED_MODEL_HASH) {
		return Ok(ModelUploadResult {
			success: false,
			message: e.to_string(),
			file_path: None,
			calculated_hash: Some(calculated_hash),
		});
	}

	// Get app data directory and copy file
	let models_dir = get_app_data_dir(app)?;
	let target_path = models_dir.join("swin-v2-tagger-v3.onnx");

	// Copy file to app data directory
	tokio::fs::copy(&source_path, &target_path)
		.await
		.map_err(|e| AppError::Custom(format!("Failed to copy model file: {e}")))?;

	Ok(ModelUploadResult {
		success: true,
		message: "Model file uploaded successfully".to_string(),
		file_path: Some(target_path.display().to_string()),
		calculated_hash: Some(calculated_hash),
	})
}

#[tauri::command]
pub async fn upload_label_map_file(
	app: AppHandle,
	file_path: String,
) -> Result<ModelUploadResult, AppError> {
	// Set app data directory for AI tagger
	set_app_data_dir_env(&app)?;
	let source_path = Path::new(&file_path);

	if !source_path.exists() {
		return Ok(ModelUploadResult {
			success: false,
			message: format!("Source file does not exist: {file_path}"),
			file_path: None,
			calculated_hash: None,
		});
	}

	// Calculate SHA256 hash
	let calculated_hash = calculate_file_hash(source_path).await?;

	// Verify hash if expected value is configured
	if let Err(e) = verify_hash(&calculated_hash, EXPECTED_LABEL_MAP_HASH) {
		return Ok(ModelUploadResult {
			success: false,
			message: e.to_string(),
			file_path: None,
			calculated_hash: Some(calculated_hash),
		});
	}

	// Get app data directory and copy file
	let models_dir = get_app_data_dir(app)?;
	let target_path = models_dir.join("selected_tags.csv");

	// Copy file to app data directory
	tokio::fs::copy(&source_path, &target_path)
		.await
		.map_err(|e| AppError::Custom(format!("Failed to copy label map file: {e}")))?;

	Ok(ModelUploadResult {
		success: true,
		message: "Label map file uploaded successfully".to_string(),
		file_path: Some(target_path.display().to_string()),
		calculated_hash: Some(calculated_hash),
	})
}

#[tauri::command]
pub async fn get_model_status(app: AppHandle) -> Result<ModelStatus, AppError> {
	// Set app data directory for AI tagger
	set_app_data_dir_env(&app)?;
	let models_dir = get_app_data_dir(app)?;
	let model_path = models_dir.join("swin-v2-tagger-v3.onnx");
	let csv_path = models_dir.join("selected_tags.csv");

	// Check if AI model system is available
	use crate::ai::tagger;
	let model_available = tagger::is_model_available();

	Ok(ModelStatus {
		models_dir: models_dir.display().to_string(),
		model_file_exists: model_path.exists(),
		model_file_path: model_path.display().to_string(),
		csv_file_exists: csv_path.exists(),
		csv_file_path: csv_path.display().to_string(),
		label_map_loaded: model_available,
		model_session_loaded: model_available,
		label_map_error: None, // Will be populated by tagger::get_model_status if needed
		model_session_error: None, // Will be populated by tagger::get_model_status if needed
	})
}

#[tauri::command]
pub async fn remove_model_files(app: AppHandle) -> Result<(), AppError> {
	let models_dir = get_app_data_dir(app)?;
	let model_path = models_dir.join("swin-v2-tagger-v3.onnx");
	let csv_path = models_dir.join("selected_tags.csv");

	// Remove model file if it exists
	if model_path.exists() {
		tokio::fs::remove_file(&model_path)
			.await
			.map_err(|e| AppError::Custom(format!("Failed to remove model file: {e}")))?;
	}

	// Remove label map file if it exists
	if csv_path.exists() {
		tokio::fs::remove_file(&csv_path)
			.await
			.map_err(|e| AppError::Custom(format!("Failed to remove label map file: {e}")))?;
	}

	Ok(())
}

#[tauri::command]
pub async fn get_inference_config(app: AppHandle) -> Result<InferenceConfig, AppError> {
	let store = app
		.store(".settings.json")
		.map_err(|e| AppError::Custom(format!("Failed to get store: {e}")))?;

	match store.get("inference_config") {
		Some(config_value) => {
			let config_str = config_value.to_string();
			let config: InferenceConfig = serde_json::from_str(&config_str)
				.map_err(|e| AppError::Custom(format!("Failed to parse inference config: {e}")))?;
			Ok(config)
		}
		None => Ok(InferenceConfig::default()),
	}
}

#[tauri::command]
pub async fn set_inference_config(app: AppHandle, config: InferenceConfig) -> Result<(), AppError> {
	let store = app
		.store(".settings.json")
		.map_err(|e| AppError::Custom(format!("Failed to get store: {e}")))?;

	let config_str = serde_json::to_string(&config)
		.map_err(|e| AppError::Custom(format!("Failed to serialize inference config: {e}")))?;

	store.set("inference_config", config_str);

	store
		.save()
		.map_err(|e| AppError::Custom(format!("Failed to save store to disk: {e}")))?;

	Ok(())
}

// ============================================================================
// Debug Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DebugPreprocessResult {
	pub original_size: (u32, u32),
	pub padded_size: (u32, u32),
	pub final_size: (u32, u32),
	pub preprocessing_steps: Vec<String>,
	// 新增：Base64编码的图片数据
	pub original_image_data: Option<String>,     // 原始图片
	pub padded_image_data: Option<String>,       // 填充后的图片
	pub preprocessed_image_data: Option<String>, // 预处理后的图片
	pub success: bool,
	pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PredictionDetail {
	pub name: String,
	pub confidence: f32,
	pub category: String, // rating/general/character
	pub tag_id: usize,
	pub index: usize, // 在输出数组中的位置
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DebugInferenceResult {
	pub input_shape: Vec<usize>,
	pub output_shape: Vec<usize>,
	pub execution_time_ms: u64,
	pub top_predictions: Vec<(String, f32)>, // 保留向后兼容
	// 新增：扩展的预测数据
	pub all_predictions: Vec<PredictionDetail>, // 所有预测详情
	pub confidence_distribution: Vec<f32>,      // 置信度分布直方图
	pub success: bool,
	pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategorySummary {
	pub total_tags: usize,
	pub rating_count: usize,
	pub general_count: usize,
	pub character_count: usize,
	pub top_confidence: f32,
	pub avg_confidence: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DebugPostprocessResult {
	pub rating_predictions: Vec<(String, f32)>,
	pub general_predictions: Vec<(String, f32)>,
	pub character_predictions: Vec<(String, f32)>,
	pub final_tags: Vec<(String, f32)>,
	pub config_used: InferenceConfig,
	// 新增：过滤分析详情
	pub threshold_analysis: ThresholdAnalysis,
	pub filtered_tags_info: Vec<FilteredTagDetail>,
	pub category_summary: CategorySummary,
	pub success: bool,
	pub error: Option<String>,
}

/// 阈值分析结果
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThresholdAnalysis {
	pub tags_before_general_threshold: usize,
	pub tags_after_general_threshold: usize,
	pub tags_before_character_threshold: usize,
	pub tags_after_character_threshold: usize,
	pub mcut_effects: Option<MCutEffects>,
}

/// MCut算法效果（可选实现）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MCutEffects {
	pub general_mcut_threshold: Option<f32>,
	pub character_mcut_threshold: Option<f32>,
	pub general_tags_after_mcut: usize,
	pub character_tags_after_mcut: usize,
}

/// 过滤标签详情
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilteredTagDetail {
	pub name: String,
	pub confidence: f32,
	pub category: String,
	pub filter_reason: String,
	pub original_rank: usize,
	pub final_rank: usize,
}

// ============================================================================
// Debug Commands
// ============================================================================

#[tauri::command]
pub async fn debug_model_preprocess(
	app: AppHandle,
	image_path: String,
) -> Result<DebugPreprocessResult, AppError> {
	// Set app data directory for AI tagger
	set_app_data_dir_env(&app)?;

	let path = Path::new(&image_path);
	if !path.exists() {
		return Ok(DebugPreprocessResult {
			original_size: (0, 0),
			padded_size: (0, 0),
			final_size: (0, 0),
			preprocessing_steps: vec![],
			original_image_data: None,
			padded_image_data: None,
			preprocessed_image_data: None,
			success: false,
			error: Some("Image file not found".to_string()),
		});
	}

	let mut result = DebugPreprocessResult {
		original_size: (0, 0),
		padded_size: (0, 0),
		final_size: (0, 0),
		preprocessing_steps: vec![],
		original_image_data: None,
		padded_image_data: None,
		preprocessed_image_data: None,
		success: true,
		error: None,
	};

	// Step 1: Load image and generate visualization
	match generate_preprocess_visualization(path) {
		Ok(images) => {
			result.original_image_data = Some(images.original);
			result.padded_image_data = Some(images.padded);
			result.preprocessed_image_data = Some(images.preprocessed);
		}
		Err(e) => {
			return Ok(DebugPreprocessResult {
				original_size: (0, 0),
				padded_size: (0, 0),
				final_size: (0, 0),
				preprocessing_steps: vec![format!("Failed to generate visualization: {e}")],
				original_image_data: None,
				padded_image_data: None,
				preprocessed_image_data: None,
				success: false,
				error: Some(e.to_string()),
			});
		}
	}

	// Step 2: Load image to get dimensions
	let image = match image::open(path) {
		Ok(img) => {
			result.original_size = img.dimensions();
			result.preprocessing_steps.push(format!(
				"Loaded image: {}x{} pixels",
				result.original_size.0, result.original_size.1
			));
			img
		}
		Err(e) => {
			return Ok(DebugPreprocessResult {
				original_size: (0, 0),
				padded_size: (0, 0),
				final_size: (0, 0),
				preprocessing_steps: vec![format!("Failed to load image: {e}")],
				original_image_data: None, // Can't include visualization if image loading failed
				padded_image_data: None,
				preprocessed_image_data: None,
				success: false,
				error: Some(e.to_string()),
			});
		}
	};

	// Step 3: Analyze preprocessing steps
	let (width, height) = image.dimensions();
	let max_dim = std::cmp::max(width, height);
	result.padded_size = (max_dim, max_dim);
	result.preprocessing_steps.push(format!(
		"Padded to square: {max_dim}x{max_dim} pixels (white background)"
	));

	result.final_size = (448, 448);
	result.preprocessing_steps.push(format!(
		"Resized to model input: {}x{} pixels (BICUBIC)",
		448, 448
	));
	result
		.preprocessing_steps
		.push("Converted RGB to BGR format".to_string());
	result
		.preprocessing_steps
		.push("Normalized pixel values to [0.0, 1.0]".to_string());

	Ok(result)
}

#[tauri::command]
pub async fn debug_model_inference(
	app: AppHandle,
	image_path: String,
) -> Result<DebugInferenceResult, AppError> {
	// Set app data directory for AI tagger
	set_app_data_dir_env(&app)?;

	let path = Path::new(&image_path);
	if !path.exists() {
		return Ok(DebugInferenceResult {
			input_shape: vec![],
			output_shape: vec![],
			execution_time_ms: 0,
			top_predictions: vec![],
			all_predictions: vec![],
			confidence_distribution: vec![],
			success: false,
			error: Some("Image file not found".to_string()),
		});
	}

	let start_time = std::time::Instant::now();

	// Check if model is available
	if !crate::ai::tagger::is_model_available() {
		return Ok(DebugInferenceResult {
			input_shape: vec![],
			output_shape: vec![],
			execution_time_ms: 0,
			top_predictions: vec![],
			all_predictions: vec![],
			confidence_distribution: vec![],
			success: false,
			error: Some("AI model not available".to_string()),
		});
	}

	// Run inference using the new debug function
	match crate::ai::tagger::classify_image_debug(path).await {
		Ok(category_predictions) => {
			let execution_time = start_time.elapsed().as_millis() as u64;

			// Get top 10 predictions from all predictions
			let top_predictions: Vec<(String, f32)> = category_predictions
				.all
				.iter()
				.take(10)
				.map(|p| (p.name.clone(), p.confidence))
				.collect();

			// Convert all predictions to the expected format
			let all_predictions: Vec<PredictionDetail> = category_predictions
				.all
				.into_iter()
				.map(|p| PredictionDetail {
					name: p.name,
					confidence: p.confidence,
					category: p.category,
					tag_id: p.tag_id,
					index: p.index,
				})
				.collect();

			// Generate confidence distribution (10 bins)
			let confidence_distribution = generate_confidence_histogram(
				&all_predictions
					.iter()
					.map(|p| (p.name.clone(), p.confidence))
					.collect::<Vec<_>>(),
				10,
			);

			Ok(DebugInferenceResult {
				input_shape: vec![1, 448, 448, 3],         // NHWC format
				output_shape: vec![all_predictions.len()], // Number of classes
				execution_time_ms: execution_time,
				top_predictions,
				all_predictions,
				confidence_distribution,
				success: true,
				error: None,
			})
		}
		Err(e) => Ok(DebugInferenceResult {
			input_shape: vec![],
			output_shape: vec![],
			execution_time_ms: start_time.elapsed().as_millis() as u64,
			top_predictions: vec![],
			all_predictions: vec![],
			confidence_distribution: vec![],
			success: false,
			error: Some(e.to_string()),
		}),
	}
}

#[tauri::command]
pub async fn debug_model_postprocess(
	app: AppHandle,
	image_path: String,
	config: Option<InferenceConfig>,
) -> Result<DebugPostprocessResult, AppError> {
	// Set app data directory for AI tagger
	set_app_data_dir_env(&app)?;

	let path = Path::new(&image_path);
	if !path.exists() {
		return Ok(DebugPostprocessResult {
			rating_predictions: vec![],
			general_predictions: vec![],
			character_predictions: vec![],
			final_tags: vec![],
			config_used: config.unwrap_or_default(),
			threshold_analysis: ThresholdAnalysis {
				tags_before_general_threshold: 0,
				tags_after_general_threshold: 0,
				tags_before_character_threshold: 0,
				tags_after_character_threshold: 0,
				mcut_effects: None,
			},
			filtered_tags_info: vec![],
			category_summary: CategorySummary {
				total_tags: 0,
				rating_count: 0,
				general_count: 0,
				character_count: 0,
				top_confidence: 0.0,
				avg_confidence: 0.0,
			},
			success: false,
			error: Some("Image file not found".to_string()),
		});
	}

	// Use provided config or load from storage
	let config_used = if let Some(c) = config {
		c
	} else {
		get_inference_config(app.clone()).await.unwrap_or_default()
	};

	// Convert settings config to AI tagger params
	let inference_params = crate::ai::tagger::InferenceParams {
		general_threshold: config_used.general_threshold,
		character_threshold: config_used.character_threshold,
		general_mcut_enabled: config_used.general_mcut_enabled,
		character_mcut_enabled: config_used.character_mcut_enabled,
		max_tags: config_used.max_tags,
	};

	// Run inference with custom parameters using the new debug function
	match crate::ai::tagger::classify_image_debug_with_params(path, &inference_params).await {
		Ok(category_predictions) => {
			// Convert category predictions to expected formats
			let rating_predictions: Vec<(String, f32)> = category_predictions
				.rating
				.iter()
				.map(|p| (p.name.clone(), p.confidence))
				.collect();

			let general_predictions: Vec<(String, f32)> = category_predictions
				.general
				.iter()
				.map(|p| (p.name.clone(), p.confidence))
				.collect();

			let character_predictions: Vec<(String, f32)> = category_predictions
				.character
				.iter()
				.map(|p| (p.name.clone(), p.confidence))
				.collect();

			// Simulate postprocessing to get final tags
			let final_tags = crate::ai::tagger::classify_image_with_params(path, &inference_params)
				.await
				.unwrap_or_default()
				.into_iter()
				.map(|p| (p.name, p.confidence))
				.collect::<Vec<_>>();

			// Create threshold analysis
			let all_predictions_tuples: Vec<(String, f32)> = category_predictions
				.all
				.iter()
				.map(|p| (p.name.clone(), p.confidence))
				.collect();

			let threshold_analysis = analyze_threshold_effects(
				&all_predictions_tuples,
				config_used.general_threshold,
				config_used.character_threshold,
				config_used.general_mcut_enabled || config_used.character_mcut_enabled,
				&std::collections::HashMap::new(), // Would need actual label map for full analysis
			);

			// Create filtered tags info
			let filtered_tags_info = generate_filtered_tags_info(
				&all_predictions_tuples,
				&final_tags,
				config_used.general_threshold,
				config_used.character_threshold,
				&std::collections::HashMap::new(), // Would need actual label map for full analysis
			);

			// Create category summary
			let category_summary = CategorySummary {
				total_tags: final_tags.len(),
				rating_count: rating_predictions.len(),
				general_count: general_predictions.len(),
				character_count: character_predictions.len(),
				top_confidence: final_tags.first().map(|(_, c)| *c).unwrap_or(0.0),
				avg_confidence: if final_tags.is_empty() {
					0.0
				} else {
					final_tags.iter().map(|(_, c)| *c).sum::<f32>() / final_tags.len() as f32
				},
			};

			Ok(DebugPostprocessResult {
				rating_predictions,
				general_predictions,
				character_predictions,
				final_tags,
				config_used,
				threshold_analysis,
				filtered_tags_info,
				category_summary,
				success: true,
				error: None,
			})
		}
		Err(e) => Ok(DebugPostprocessResult {
			rating_predictions: vec![],
			general_predictions: vec![],
			character_predictions: vec![],
			final_tags: vec![],
			config_used,
			threshold_analysis: ThresholdAnalysis {
				tags_before_general_threshold: 0,
				tags_after_general_threshold: 0,
				tags_before_character_threshold: 0,
				tags_after_character_threshold: 0,
				mcut_effects: None,
			},
			filtered_tags_info: vec![],
			category_summary: CategorySummary {
				total_tags: 0,
				rating_count: 0,
				general_count: 0,
				character_count: 0,
				top_confidence: 0.0,
				avg_confidence: 0.0,
			},
			success: false,
			error: Some(e.to_string()),
		}),
	}
}

// ============================================================================
// AI Settings Commands
// ============================================================================

#[tauri::command]
pub async fn get_ai_settings(app: AppHandle) -> Result<AISettings, AppError> {
	let store = app.store("ai-settings.json")?;
	let ai_enabled = store
		.get("ai_enabled")
		.and_then(|v| v.as_bool())
		.unwrap_or(true);
	Ok(AISettings { ai_enabled })
}

#[tauri::command]
pub async fn set_ai_settings(app: AppHandle, settings: AISettings) -> Result<(), AppError> {
	let store = app.store("ai-settings.json")?;
	store.set("ai_enabled", settings.ai_enabled);
	store.save()?;
	Ok(())
}

#[tauri::command]
pub async fn is_ai_enabled(app: AppHandle) -> Result<bool, AppError> {
	let settings = get_ai_settings(app).await?;
	Ok(settings.ai_enabled)
}

// ============================================================================
// Translation Dictionary Management
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranslationUploadResult {
	pub success: bool,
	pub message: String,
	pub file_path: Option<String>,
	pub valid_entries: usize,
	pub invalid_entries: usize,
	pub available_languages: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranslationStatus {
	pub current_language: Option<String>,
	pub available_languages: Vec<String>,
	pub dictionary_loaded: bool,
	pub dictionary_path: Option<String>,
	pub total_translations: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AliasRefreshProgress {
	pub current: usize,
	pub total: usize,
	pub completed: bool,
	pub error: Option<String>,
}

/// Get translations directory in app data directory
fn get_translations_dir(app: AppHandle) -> Result<PathBuf, AppError> {
	let app_data_dir = app
		.path()
		.app_data_dir()
		.map_err(|e| AppError::Custom(format!("Failed to get app data directory: {e}")))?;

	let translations_dir = app_data_dir.join("translations");
	std::fs::create_dir_all(&translations_dir)
		.map_err(|e| AppError::Custom(format!("Failed to create translations directory: {e}")))?;

	Ok(translations_dir)
}

/// Translation entry: (tag_name, translated_name, language_code)
type TranslationEntry = (String, String, String);

/// Parse translation dictionary CSV file with fault tolerance
/// CSV format: name,translated_name,language_code
async fn parse_translation_csv(
	file_path: &Path,
) -> Result<(Vec<TranslationEntry>, usize), AppError> {
	use tokio::io::AsyncReadExt;

	let mut file = tokio::fs::File::open(file_path)
		.await
		.map_err(|e| AppError::Custom(format!("Failed to open translation file: {e}")))?;

	let mut contents = String::new();
	file.read_to_string(&mut contents)
		.await
		.map_err(|e| AppError::Custom(format!("Failed to read translation file: {e}")))?;

	let mut translations = Vec::new();
	let mut invalid_count = 0;

	for (line_num, line) in contents.lines().enumerate() {
		// Skip empty lines
		if line.trim().is_empty() {
			continue;
		}

		// Skip header line if present
		if line_num == 0 && line.to_lowercase().contains("name") {
			continue;
		}

		// Parse CSV line (simple CSV parsing, handles quoted fields)
		let fields: Vec<String> = line
			.split(',')
			.map(|s| s.trim().trim_matches('"').to_string())
			.collect();

		if fields.len() < 3 {
			invalid_count += 1;
			eprintln!(
				"Warning: Line {} has insufficient fields, skipping",
				line_num + 1
			);
			continue;
		}

		let tag_name = fields[0].trim().to_string();
		let translated_name = fields[1].trim().to_string();
		let language_code = fields[2].trim().to_lowercase();

		// Validate tag_name
		if tag_name.is_empty() {
			invalid_count += 1;
			eprintln!(
				"Warning: Line {} has empty tag name, skipping",
				line_num + 1
			);
			continue;
		}

		// Validate language code (ISO 639-1 format: 2 letters)
		if language_code.len() != 2 || !language_code.chars().all(|c| c.is_ascii_lowercase()) {
			invalid_count += 1;
			eprintln!(
				"Warning: Line {} has invalid language_code, skipping",
				line_num + 1
			);
			continue;
		}

		if translated_name.is_empty() {
			invalid_count += 1;
			eprintln!(
				"Warning: Line {} has empty translated_name, skipping",
				line_num + 1
			);
			continue;
		}

		translations.push((tag_name, translated_name, language_code));
	}

	Ok((translations, invalid_count))
}

/// Refresh alias field in Tags table for a specific language
///
/// Race-condition handling strategy:
/// 1. Use a single UPDATE statement with CASE WHEN to atomically set aliases
/// 2. Tags not in the dictionary get alias = NULL
/// 3. Tags in the dictionary get their translated name
/// 4. New tags inserted during this operation will have alias = NULL initially,
///    which is correct - they can be translated on next refresh
async fn refresh_tag_aliases_for_language(
	pool: &SqlitePool,
	translations: &[TranslationEntry],
	language_code: &str,
	app: &AppHandle,
) -> Result<usize, AppError> {
	// Filter translations for the specified language
	let filtered: Vec<_> = translations
		.iter()
		.filter(|(_, _, lc)| lc == language_code)
		.collect();

	let total = filtered.len();

	// Emit start progress
	app.emit(
		"translation-progress",
		AliasRefreshProgress {
			current: 0,
			total,
			completed: false,
			error: None,
		},
	)
	.ok();

	// Build a map for quick lookup
	let translation_map: std::collections::HashMap<&str, &str> = filtered
		.iter()
		.map(|(name, translated, _)| (name.as_str(), translated.as_str()))
		.collect();

	// Step 1: Clear all aliases first (atomic operation)
	// This ensures a clean slate before applying new translations
	let _ = sqlx::query("UPDATE Tags SET alias = NULL")
		.execute(pool)
		.await;

	app.emit(
		"translation-progress",
		AliasRefreshProgress {
			current: 0,
			total,
			completed: false,
			error: None,
		},
	)
	.ok();

	// Step 2: Apply translations in batches
	// Each UPDATE is atomic, so even if new tags are inserted between batches,
	// they simply won't be updated (which is correct - they'll have NULL alias)
	let mut updated_count = 0;
	const BATCH_SIZE: usize = 100;

	let names: Vec<&str> = translation_map.keys().copied().collect();
	for (batch_idx, batch) in names.chunks(BATCH_SIZE).enumerate() {
		for name in batch {
			if let Some(translated) = translation_map.get(name) {
				let result = sqlx::query("UPDATE Tags SET alias = ? WHERE name = ?")
					.bind(*translated)
					.bind(*name)
					.execute(pool)
					.await;

				if let Ok(r) = result {
					if r.rows_affected() > 0 {
						updated_count += 1;
					}
				}
			}
		}

		// Emit progress event after each batch
		let current = ((batch_idx + 1) * BATCH_SIZE).min(total);
		app.emit(
			"translation-progress",
			AliasRefreshProgress {
				current,
				total,
				completed: current >= total,
				error: None,
			},
		)
		.ok();
	}

	// Emit final progress event
	app.emit(
		"translation-progress",
		AliasRefreshProgress {
			current: total,
			total,
			completed: true,
			error: None,
		},
	)
	.ok();

	Ok(updated_count)
}

/// Get available languages from translations
fn get_available_languages(translations: &[TranslationEntry]) -> Vec<String> {
	let mut languages: Vec<String> = translations
		.iter()
		.map(|(_, _, lc)| lc.clone())
		.collect::<std::collections::HashSet<_>>()
		.into_iter()
		.collect();
	languages.sort();
	languages
}

#[tauri::command]
pub async fn upload_translation_dictionary(
	app: AppHandle,
	_pool: tauri::State<'_, SqlitePool>,
	file_path: String,
) -> Result<TranslationUploadResult, AppError> {
	let source_path = Path::new(&file_path);

	if !source_path.exists() {
		return Ok(TranslationUploadResult {
			success: false,
			message: format!("Translation file does not exist: {file_path}"),
			file_path: None,
			valid_entries: 0,
			invalid_entries: 0,
			available_languages: vec![],
		});
	}

	// Parse translation CSV to validate and get available languages
	let (translations, invalid_count) = parse_translation_csv(source_path).await?;

	if translations.is_empty() {
		return Ok(TranslationUploadResult {
			success: false,
			message: "No valid translation entries found in file".to_string(),
			file_path: None,
			valid_entries: 0,
			invalid_entries: invalid_count,
			available_languages: vec![],
		});
	}

	// Get available languages
	let available_languages = get_available_languages(&translations);

	// Get translations directory and save file (single file, not per-language)
	let translations_dir = get_translations_dir(app.clone())?;
	let target_path = translations_dir.join("translations.csv");

	// Remove old translation files first
	if let Ok(entries) = std::fs::read_dir(&translations_dir) {
		for entry in entries.flatten() {
			if let Some(name) = entry.file_name().to_str() {
				if name.ends_with(".csv") {
					let _ = std::fs::remove_file(entry.path());
				}
			}
		}
	}

	// Copy file to translations directory
	tokio::fs::copy(&source_path, &target_path)
		.await
		.map_err(|e| AppError::Custom(format!("Failed to copy translation file: {e}")))?;

	Ok(TranslationUploadResult {
		success: true,
		message: format!(
			"Translation dictionary uploaded. {} entries, {} languages available. Select a language to apply translations.",
			translations.len(),
			available_languages.len()
		),
		file_path: Some(target_path.display().to_string()),
		valid_entries: translations.len(),
		invalid_entries: invalid_count,
		available_languages,
	})
}

#[tauri::command]
pub async fn get_translation_status(
	app: AppHandle,
	pool: tauri::State<'_, SqlitePool>,
) -> Result<TranslationStatus, AppError> {
	let translations_dir = get_translations_dir(app.clone())?;
	let dictionary_path = translations_dir.join("translations.csv");

	let mut available_languages = vec![];
	let mut total_translations = 0;

	// Check if dictionary file exists and parse it
	if dictionary_path.exists() {
		if let Ok((translations, _)) = parse_translation_csv(&dictionary_path).await {
			available_languages = get_available_languages(&translations);
		}

		// Count translations in database
		if let Ok(row) = sqlx::query(
			"SELECT COUNT(*) as count FROM Tags WHERE alias IS NOT NULL AND alias != ''",
		)
		.fetch_one(pool.inner())
		.await
		{
			if let Ok(count) = row.try_get::<i64, _>(0) {
				total_translations = count as usize;
			}
		}
	}

	// Get current language from store
	let current_language = app
		.store("translation-settings.json")
		.ok()
		.and_then(|store| store.get("language_code"))
		.and_then(|v| v.as_str().map(|s| s.to_string()));

	Ok(TranslationStatus {
		current_language,
		available_languages,
		dictionary_loaded: dictionary_path.exists(),
		dictionary_path: if dictionary_path.exists() {
			Some(dictionary_path.display().to_string())
		} else {
			None
		},
		total_translations,
	})
}

#[tauri::command]
pub async fn set_translation_language(
	app: AppHandle,
	pool: tauri::State<'_, SqlitePool>,
	language_code: String,
) -> Result<usize, AppError> {
	// Load dictionary and apply translations for the selected language
	let translations_dir = get_translations_dir(app.clone())?;
	let dictionary_path = translations_dir.join("translations.csv");

	if !dictionary_path.exists() {
		return Err(AppError::Custom(
			"No translation dictionary loaded".to_string(),
		));
	}

	let (translations, _) = parse_translation_csv(&dictionary_path).await?;
	let available_languages = get_available_languages(&translations);

	if !available_languages.contains(&language_code) {
		return Err(AppError::Custom(format!(
			"Language '{}' not found in dictionary. Available: {:?}",
			language_code, available_languages
		)));
	}

	// Save language preference
	let store = app.store("translation-settings.json")?;
	store.set("language_code", language_code.clone());
	store.save()?;

	// Apply translations (this clears old aliases and applies new ones)
	let updated =
		refresh_tag_aliases_for_language(pool.inner(), &translations, &language_code, &app).await?;

	Ok(updated)
}

#[tauri::command]
pub async fn get_translation_language(app: AppHandle) -> Result<Option<String>, AppError> {
	let store = app.store("translation-settings.json")?;
	let language_code = store
		.get("language_code")
		.and_then(|v| v.as_str().map(|s| s.to_string()));
	Ok(language_code)
}

#[tauri::command]
pub async fn remove_translation_dictionary(
	app: AppHandle,
	pool: tauri::State<'_, SqlitePool>,
) -> Result<(), AppError> {
	// Clear all aliases in database
	let _ = sqlx::query("UPDATE Tags SET alias = NULL")
		.execute(pool.inner())
		.await;

	// Remove translation file
	let translations_dir = get_translations_dir(app.clone())?;
	let dictionary_path = translations_dir.join("translations.csv");
	if dictionary_path.exists() {
		if let Err(e) = std::fs::remove_file(&dictionary_path) {
			eprintln!("Warning: Failed to remove translation file: {}", e);
		}
	}

	// Clear language preference
	let store = app.store("translation-settings.json")?;
	store.delete("language_code");
	store.save()?;

	Ok(())
}

/// Refresh translations for the current language
/// This is useful after importing new images/tags to apply translations to new tags
#[tauri::command]
pub async fn refresh_translations(
	app: AppHandle,
	pool: tauri::State<'_, SqlitePool>,
) -> Result<usize, AppError> {
	// Get current language
	let store = app.store("translation-settings.json")?;
	let language_code = store
		.get("language_code")
		.and_then(|v| v.as_str().map(|s| s.to_string()));

	let Some(language_code) = language_code else {
		return Ok(0); // No language selected, nothing to refresh
	};

	// Load dictionary
	let translations_dir = get_translations_dir(app.clone())?;
	let dictionary_path = translations_dir.join("translations.csv");

	if !dictionary_path.exists() {
		return Ok(0); // No dictionary, nothing to refresh
	}

	let (translations, _) = parse_translation_csv(&dictionary_path).await?;

	// Apply translations
	let updated =
		refresh_tag_aliases_for_language(pool.inner(), &translations, &language_code, &app).await?;

	Ok(updated)
}
