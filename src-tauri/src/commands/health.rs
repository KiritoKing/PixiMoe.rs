use crate::error::AppError;
use crate::health_check::ImageHealthChecker;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileWithHealthStatus {
	pub file_hash: String,
	pub original_path: String,
	pub file_size_bytes: i64,
	pub file_last_modified: i64,
	pub width: i64,
	pub height: i64,
	pub date_imported: i64,
	pub is_missing: i64,
	pub thumbnail_health: i64,
	pub last_health_check: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct RecoveryResult {
	pub success: bool,
	pub message: String,
	pub regenerated_count: Option<usize>,
}

/// Check health of all images in the library
#[tauri::command]
pub async fn check_all_images_health(
	app_handle: AppHandle,
	pool: State<'_, SqlitePool>,
) -> Result<crate::health_check::HealthCheckResult, AppError> {
	let health_checker = ImageHealthChecker::new();
	health_checker
		.check_all_files_health(&pool, &app_handle)
		.await
}

/// Get files filtered by health status
#[tauri::command]
pub async fn get_files_by_health_status(
	health_status: String,
	pool: State<'_, SqlitePool>,
) -> Result<Vec<FileWithHealthStatus>, AppError> {
	let query_str = match health_status.as_str() {
		"original_missing" => {
			r#"
            SELECT
                file_hash,
                original_path,
                file_size_bytes,
                file_last_modified,
                width,
                height,
                date_imported,
                is_missing,
                COALESCE(thumbnail_health, 0) as thumbnail_health,
                last_health_check
            FROM Files
            WHERE is_missing = 1
            ORDER BY date_imported DESC
            "#
		}
		"thumbnail_missing" => {
			r#"
            SELECT
                file_hash,
                original_path,
                file_size_bytes,
                file_last_modified,
                width,
                height,
                date_imported,
                is_missing,
                COALESCE(thumbnail_health, 0) as thumbnail_health,
                last_health_check
            FROM Files
            WHERE COALESCE(thumbnail_health, 0) = 1
            ORDER BY date_imported DESC
            "#
		}
		"thumbnail_corrupted" => {
			r#"
            SELECT
                file_hash,
                original_path,
                file_size_bytes,
                file_last_modified,
                width,
                height,
                date_imported,
                is_missing,
                COALESCE(thumbnail_health, 0) as thumbnail_health,
                last_health_check
            FROM Files
            WHERE COALESCE(thumbnail_health, 0) = 2
            ORDER BY date_imported DESC
            "#
		}
		"healthy" => {
			r#"
            SELECT
                file_hash,
                original_path,
                file_size_bytes,
                file_last_modified,
                width,
                height,
                date_imported,
                is_missing,
                COALESCE(thumbnail_health, 0) as thumbnail_health,
                last_health_check
            FROM Files
            WHERE is_missing = 0 AND COALESCE(thumbnail_health, 0) = 0
            ORDER BY date_imported DESC
            "#
		}
		"all_with_issues" => {
			r#"
            SELECT
                file_hash,
                original_path,
                file_size_bytes,
                file_last_modified,
                width,
                height,
                date_imported,
                is_missing,
                COALESCE(thumbnail_health, 0) as thumbnail_health,
                last_health_check
            FROM Files
            WHERE is_missing = 1 OR COALESCE(thumbnail_health, 0) != 0
            ORDER BY date_imported DESC
            "#
		}
		_ => {
			return Err(AppError::Custom(format!(
				"Unknown health status filter: {health_status}"
			)));
		}
	};

	let rows = sqlx::query(query_str).fetch_all(pool.inner()).await?;
	let mut files = Vec::new();

	for row in rows {
		files.push(FileWithHealthStatus {
			file_hash: row.get("file_hash"),
			original_path: row.get("original_path"),
			file_size_bytes: row.get("file_size_bytes"),
			file_last_modified: row.get("file_last_modified"),
			width: row.get("width"),
			height: row.get("height"),
			date_imported: row.get("date_imported"),
			is_missing: row.get("is_missing"),
			thumbnail_health: row.get("thumbnail_health"),
			last_health_check: row.get("last_health_check"),
		});
	}

	Ok(files)
}

/// Attempt to regenerate missing thumbnails for files with missing thumbnails
#[tauri::command]
pub async fn regenerate_missing_thumbnails_health(
	app_handle: AppHandle,
	pool: State<'_, SqlitePool>,
) -> Result<RecoveryResult, AppError> {
	// Import the thumbnail generation function from files module
	use crate::commands::files::generate_thumbnail;

	// Get files with missing thumbnails
	let files_with_missing_thumbnails = sqlx::query(
		"SELECT file_hash, original_path FROM Files WHERE COALESCE(thumbnail_health, 0) = 1",
	)
	.fetch_all(pool.inner())
	.await?;

	let total_missing = files_with_missing_thumbnails.len();
	if total_missing == 0 {
		return Ok(RecoveryResult {
			success: true,
			message: "No missing thumbnails found".to_string(),
			regenerated_count: Some(0),
		});
	}

	// Get thumbnail directory
	let thumbnail_dir = std::env::var("THUMBNAIL_DIR")
		.ok()
		.and_then(|path| std::path::PathBuf::from(path).canonicalize().ok())
		.unwrap_or_else(|| {
			let app_data_dir =
				std::env::var("APP_DATA_DIR").expect("APP_DATA_DIR should be set during startup");
			std::path::PathBuf::from(app_data_dir).join("thumbnails")
		});

	let mut regenerated_count = 0;
	let mut error_count = 0;

	// Emit progress events
	app_handle.emit(
		"health_check_progress",
		crate::health_check::HealthCheckProgressEvent {
			stage: "regenerating_thumbnails".to_string(),
			message: format!("Regenerating {total_missing} missing thumbnails"),
			current: Some(0),
			total: Some(total_missing),
			file_hash: None,
			status: None,
		},
	)?;

	// Process each file
	for (index, file_row) in files_with_missing_thumbnails.iter().enumerate() {
		let file_hash: String = file_row.get("file_hash");
		let original_path: String = file_row.get("original_path");

		// Update progress
		if index % 5 == 0 || index == total_missing - 1 {
			app_handle.emit(
				"health_check_progress",
				crate::health_check::HealthCheckProgressEvent {
					stage: "regenerating_thumbnails".to_string(),
					message: format!("Regenerating thumbnail {} of {}", index + 1, total_missing),
					current: Some(index + 1),
					total: Some(total_missing),
					file_hash: Some(file_hash.clone()),
					status: None,
				},
			)?;
		}

		// Generate thumbnail
		let thumbnail_path = thumbnail_dir.join(format!("{file_hash}.webp"));
		match generate_thumbnail(
			std::path::Path::new(&original_path),
			&thumbnail_path,
			256, // thumbnail size
		) {
			Ok(_) => {
				// Update database to mark thumbnail as healthy
				sqlx::query(
                    "UPDATE Files SET thumbnail_health = 0, last_health_check = ? WHERE file_hash = ?"
                )
                .bind(SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64)
                .bind(&file_hash)
                .execute(pool.inner())
                .await?;
				regenerated_count += 1;
			}
			Err(e) => {
				eprintln!("Failed to generate thumbnail for {file_hash}: {e}");
				// Mark thumbnail as corrupted
				sqlx::query(
                    "UPDATE Files SET thumbnail_health = 2, last_health_check = ? WHERE file_hash = ?"
                )
                .bind(SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64)
                .bind(&file_hash)
                .execute(pool.inner())
                .await?;
				error_count += 1;
			}
		}
	}

	// Emit completion event
	app_handle.emit(
		"thumbnail_regeneration_complete",
		serde_json::json!({
			"regenerated_count": regenerated_count,
			"error_count": error_count,
			"total_processed": total_missing
		}),
	)?;

	Ok(RecoveryResult {
		success: error_count == 0,
		message: format!(
			"Regenerated {regenerated_count} thumbnails successfully. {error_count} failed."
		),
		regenerated_count: Some(regenerated_count),
	})
}

/// Get health status summary for the entire library
#[tauri::command]
pub async fn get_health_summary(
	pool: State<'_, SqlitePool>,
) -> Result<crate::health_check::HealthCheckResult, AppError> {
	let row = sqlx::query(
        r#"
        SELECT
            COUNT(*) as total_files,
            SUM(CASE WHEN is_missing = 0 AND COALESCE(thumbnail_health, 0) = 0 THEN 1 ELSE 0 END) as healthy_count,
            SUM(CASE WHEN COALESCE(thumbnail_health, 0) = 1 THEN 1 ELSE 0 END) as thumbnail_missing_count,
            SUM(CASE WHEN COALESCE(thumbnail_health, 0) = 2 THEN 1 ELSE 0 END) as thumbnail_corrupted_count,
            SUM(CASE WHEN is_missing = 1 THEN 1 ELSE 0 END) as original_missing_count,
            SUM(CASE WHEN is_missing = 1 AND COALESCE(thumbnail_health, 0) = 1 THEN 1 ELSE 0 END) as both_missing_count
        FROM Files
        "#
    )
    .fetch_one(pool.inner())
    .await?;

	let total_files: i64 = row.get("total_files");
	let healthy_count: i64 = row.get("healthy_count");
	let thumbnail_missing_count: i64 = row.get("thumbnail_missing_count");
	let thumbnail_corrupted_count: i64 = row.get("thumbnail_corrupted_count");
	let original_missing_count: i64 = row.get("original_missing_count");
	let both_missing_count: i64 = row.get("both_missing_count");
	let issues_found = thumbnail_missing_count + thumbnail_corrupted_count + original_missing_count;

	Ok(crate::health_check::HealthCheckResult {
		total_checked: total_files as usize,
		healthy_count: healthy_count as usize,
		issues_found: issues_found as usize,
		thumbnail_missing_count: thumbnail_missing_count as usize,
		original_missing_count: original_missing_count as usize,
		thumbnail_corrupted_count: thumbnail_corrupted_count as usize,
		original_corrupted_count: 0, // We don't track this specifically yet
		both_missing_count: both_missing_count as usize,
		has_missing_originals: original_missing_count > 0,
	})
}

/// Force health check for a specific file
#[tauri::command]
pub async fn check_file_health(
	file_hash: String,
	pool: State<'_, SqlitePool>,
) -> Result<FileWithHealthStatus, AppError> {
	let health_checker = ImageHealthChecker::new();

	// Get file info
	let file_info_row = sqlx::query("SELECT original_path FROM Files WHERE file_hash = ?")
		.bind(&file_hash)
		.fetch_optional(pool.inner())
		.await?;

	let file_info = file_info_row
		.ok_or_else(|| AppError::Custom(format!("File with hash {file_hash} not found")))?;

	// Check health
	let original_path: String = file_info.get("original_path");
	let (_health_status, thumbnail_health) = health_checker
		.check_file_health(&file_hash, &original_path)
		.await?;

	// Update database
	sqlx::query("UPDATE Files SET thumbnail_health = ?, last_health_check = ? WHERE file_hash = ?")
		.bind(thumbnail_health)
		.bind(
			SystemTime::now()
				.duration_since(UNIX_EPOCH)
				.unwrap()
				.as_secs() as i64,
		)
		.bind(&file_hash)
		.execute(pool.inner())
		.await?;

	// Return updated file info
	let row = sqlx::query(
		r#"
        SELECT
            file_hash,
            original_path,
            file_size_bytes,
            file_last_modified,
            width,
            height,
            date_imported,
            is_missing,
            COALESCE(thumbnail_health, 0) as thumbnail_health,
            last_health_check
        FROM Files
        WHERE file_hash = ?
        "#,
	)
	.bind(&file_hash)
	.fetch_one(pool.inner())
	.await?;

	Ok(FileWithHealthStatus {
		file_hash: row.get("file_hash"),
		original_path: row.get("original_path"),
		file_size_bytes: row.get("file_size_bytes"),
		file_last_modified: row.get("file_last_modified"),
		width: row.get("width"),
		height: row.get("height"),
		date_imported: row.get("date_imported"),
		is_missing: row.get("is_missing"),
		thumbnail_health: row.get("thumbnail_health"),
		last_health_check: row.get("last_health_check"),
	})
}
