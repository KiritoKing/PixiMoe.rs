use crate::error::AppError;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::Semaphore;

// Global semaphore to limit concurrent health checking
static HEALTH_CHECK_SEMAPHORE: Lazy<Semaphore> = Lazy::new(|| {
	let max_concurrent = std::thread::available_parallelism()
        .map(|n| n.get().min(4)) // Lower than thumbnails to avoid overwhelming system
        .unwrap_or(2); // Fallback to 2 if unavailable
	Semaphore::new(max_concurrent)
});

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ImageHealthStatus {
	Healthy,
	ThumbnailMissing,
	OriginalMissing,
	BothMissing,
	OriginalCorrupted,
	ThumbnailCorrupted,
}

#[derive(Debug, Serialize, Clone)]
pub struct HealthCheckResult {
	pub total_checked: usize,
	pub healthy_count: usize,
	pub issues_found: usize,
	pub thumbnail_missing_count: usize,
	pub original_missing_count: usize,
	pub thumbnail_corrupted_count: usize,
	pub original_corrupted_count: usize,
	pub both_missing_count: usize,
	pub has_missing_originals: bool,
}

#[derive(Debug, Serialize, Clone, Default)]
pub struct HealthCheckProgressEvent {
	pub stage: String,
	pub message: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub file_hash: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub current: Option<usize>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub total: Option<usize>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub status: Option<ImageHealthStatus>,
}

#[derive(Debug, Serialize, Clone)]
pub struct FileHealthStatus {
	pub file_hash: String,
	pub original_path: String,
	pub health_status: ImageHealthStatus,
	pub thumbnail_health: i64, // 0=healthy, 1=missing, 2=corrupted
	pub last_health_check: i64,
}

// ============================================================================
// Health Checker Service
// ============================================================================

pub struct ImageHealthChecker {
	thumbnail_dir: PathBuf,
}

impl Default for ImageHealthChecker {
	fn default() -> Self {
		Self::new()
	}
}

impl ImageHealthChecker {
	pub fn new() -> Self {
		// Get thumbnail directory from environment or use default
		let thumbnail_dir = std::env::var("THUMBNAIL_DIR")
			.ok()
			.and_then(|path| PathBuf::from(path).canonicalize().ok())
			.unwrap_or_else(|| {
				// Default: use data directory / thumbnails
				let app_data_dir = std::env::var("APP_DATA_DIR")
					.expect("APP_DATA_DIR should be set during startup");
				PathBuf::from(app_data_dir).join("thumbnails")
			});

		Self { thumbnail_dir }
	}

	/// Check all files' health status in the database
	pub async fn check_all_files_health(
		&self,
		pool: &SqlitePool,
		app_handle: &AppHandle,
	) -> Result<HealthCheckResult, AppError> {
		// Get all files from database
		let rows = sqlx::query(
            "SELECT file_hash, original_path, COALESCE(thumbnail_health, 0) as thumbnail_health, last_health_check, is_missing
             FROM Files
             ORDER BY date_imported DESC"
        )
        .fetch_all(pool)
        .await?;

		let total_files = rows.len();
		let mut result = HealthCheckResult {
			total_checked: 0,
			healthy_count: 0,
			issues_found: 0,
			thumbnail_missing_count: 0,
			original_missing_count: 0,
			thumbnail_corrupted_count: 0,
			original_corrupted_count: 0,
			both_missing_count: 0,
			has_missing_originals: false,
		};

		// Emit start event
		app_handle.emit(
			"health_check_progress",
			HealthCheckProgressEvent {
				stage: "starting".to_string(),
				message: format!("Starting health check for {total_files} files"),
				current: Some(0),
				total: Some(total_files),
				..Default::default()
			},
		)?;

		// Process files in batches to avoid overwhelming the system
		const BATCH_SIZE: usize = 50;
		for (index, file_row) in rows.iter().enumerate() {
			// Acquire semaphore permit
			let _permit = HEALTH_CHECK_SEMAPHORE.acquire().await;

			// Check if we need to emit progress (every 10 files or at start/end)
			let file_hash: String = file_row.get("file_hash");
			let original_path: String = file_row.get("original_path");

			if index % 10 == 0 || index == total_files - 1 {
				app_handle.emit(
					"health_check_progress",
					HealthCheckProgressEvent {
						stage: "checking".to_string(),
						message: format!("Checking file {} of {}", index + 1, total_files),
						current: Some(index + 1),
						total: Some(total_files),
						file_hash: Some(file_hash.clone()),
						..Default::default()
					},
				)?;
			}

			// Perform health check for this file
			match self.check_file_health(&file_hash, &original_path).await {
				Ok((health_status, thumbnail_health)) => {
					// Determine if original is missing
					let is_missing: i64 = match health_status {
						ImageHealthStatus::OriginalMissing
						| ImageHealthStatus::BothMissing
						| ImageHealthStatus::OriginalCorrupted => 1,
						_ => 0,
					};

					// Update database with new health status (including is_missing)
					sqlx::query(
						"UPDATE Files
                         SET thumbnail_health = ?, last_health_check = ?, is_missing = ?
                         WHERE file_hash = ?",
					)
					.bind(thumbnail_health)
					.bind(
						SystemTime::now()
							.duration_since(UNIX_EPOCH)
							.unwrap()
							.as_secs() as i64,
					)
					.bind(is_missing)
					.bind(&file_hash)
					.execute(pool)
					.await?;

					// Update counters
					result.total_checked += 1;
					match health_status {
						ImageHealthStatus::Healthy => result.healthy_count += 1,
						ImageHealthStatus::ThumbnailMissing => {
							result.issues_found += 1;
							result.thumbnail_missing_count += 1;
						}
						ImageHealthStatus::OriginalMissing => {
							result.issues_found += 1;
							result.original_missing_count += 1;
							result.has_missing_originals = true;
						}
						ImageHealthStatus::BothMissing => {
							result.issues_found += 1;
							result.both_missing_count += 1;
							result.has_missing_originals = true;
						}
						ImageHealthStatus::OriginalCorrupted => {
							result.issues_found += 1;
							result.original_corrupted_count += 1;
						}
						ImageHealthStatus::ThumbnailCorrupted => {
							result.issues_found += 1;
							result.thumbnail_corrupted_count += 1;
						}
					}
				}
				Err(e) => {
					eprintln!("Health check failed for file {file_hash}: {e}");
					// Mark as corrupted if check fails
					sqlx::query(
						"UPDATE Files
                         SET thumbnail_health = 2, last_health_check = ?
                         WHERE file_hash = ?",
					)
					.bind(
						SystemTime::now()
							.duration_since(UNIX_EPOCH)
							.unwrap()
							.as_secs() as i64,
					)
					.bind(&file_hash)
					.execute(pool)
					.await?;

					result.issues_found += 1;
					result.thumbnail_corrupted_count += 1;
				}
			}

			// Add small delay to avoid overwhelming the system
			if index % BATCH_SIZE == BATCH_SIZE - 1 && index < total_files - 1 {
				tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
			}
		}

		// Emit completion event
		app_handle.emit("health_check_complete", &result)?;

		Ok(result)
	}

	/// Check health status of a single file
	pub async fn check_file_health(
		&self,
		file_hash: &str,
		original_path: &str,
	) -> Result<(ImageHealthStatus, i64), AppError> {
		let original_exists = Path::new(original_path).exists();
		let thumbnail_path = self.get_thumbnail_path(file_hash);
		let thumbnail_exists = thumbnail_path.exists();

		// Determine health status
		let (health_status, thumbnail_health) = match (original_exists, thumbnail_exists) {
			(true, true) => {
				// Both exist, check for corruption
				let original_corrupted = self.is_image_corrupted(original_path).await?;
				let thumbnail_corrupted = self.is_webp_corrupted(&thumbnail_path).await?;

				if original_corrupted && thumbnail_corrupted {
					(ImageHealthStatus::ThumbnailCorrupted, 2) // Mark as thumbnail corrupted
				} else if original_corrupted {
					(ImageHealthStatus::OriginalCorrupted, 0)
				} else if thumbnail_corrupted {
					(ImageHealthStatus::ThumbnailCorrupted, 2)
				} else {
					(ImageHealthStatus::Healthy, 0)
				}
			}
			(false, true) => {
				// Original missing, thumbnail exists
				let thumbnail_corrupted = self.is_webp_corrupted(&thumbnail_path).await?;
				if thumbnail_corrupted {
					(ImageHealthStatus::ThumbnailCorrupted, 2)
				} else {
					(ImageHealthStatus::OriginalMissing, 0)
				}
			}
			(true, false) => {
				// Original exists, thumbnail missing
				(ImageHealthStatus::ThumbnailMissing, 1)
			}
			(false, false) => {
				// Both missing
				(ImageHealthStatus::BothMissing, 1)
			}
		};

		Ok((health_status, thumbnail_health))
	}

	/// Get thumbnail path for a file hash
	fn get_thumbnail_path(&self, file_hash: &str) -> PathBuf {
		self.thumbnail_dir.join(format!("{file_hash}.webp"))
	}

	/// Check if an image file is corrupted
	async fn is_image_corrupted(&self, image_path: &str) -> Result<bool, AppError> {
		// Use tokio::task::spawn_blocking for CPU-intensive image processing
		let path = image_path.to_string();
		tokio::task::spawn_blocking(move || {
			match image::open(&path) {
				Ok(_) => Ok(false), // Image loaded successfully
				Err(_) => Ok(true), // Failed to load, likely corrupted
			}
		})
		.await
		.map_err(|e| AppError::Custom(format!("Task join error: {e}")))?
	}

	/// Check if a WebP thumbnail is corrupted
	async fn is_webp_corrupted(&self, webp_path: &Path) -> Result<bool, AppError> {
		// Use tokio::task::spawn_blocking for file I/O intensive operations
		let path = webp_path.to_path_buf();
		tokio::task::spawn_blocking(move || {
			// First, check if file is readable
			match fs::read(&path) {
				Ok(data) => {
					// Check WebP header
					if data.len() < 12 {
						return Ok(true); // Too small to be valid
					}

					// WebP files should start with "RIFF" and have "WEBP" in header
					if &data[0..4] != b"RIFF" || &data[8..12] != b"WEBP" {
						return Ok(true); // Invalid WebP header
					}

					// Try to decode with image crate
					match image::load_from_memory(&data) {
						Ok(_) => Ok(false),
						Err(_) => Ok(true),
					}
				}
				Err(_) => Ok(true), // File not readable
			}
		})
		.await
		.map_err(|e| AppError::Custom(format!("Task join error: {e}")))?
	}

	/// Is thumbnail healthy (exists and readable)
	pub fn is_thumbnail_healthy(&self, file_hash: &str) -> bool {
		let thumbnail_path = self.get_thumbnail_path(file_hash);
		thumbnail_path.exists()
	}

	/// Is original image healthy (exists and readable)
	pub async fn is_original_healthy(&self, original_path: &str) -> bool {
		let path = Path::new(original_path);
		if !path.exists() {
			return false;
		}

		// Try to open the image to verify it's not corrupted
		!self.is_image_corrupted(original_path).await.unwrap_or(true)
	}
}
