use super::files::ProgressEvent;
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct ClearDatabaseResult {
	pub tables_cleared: Vec<String>,
	pub records_deleted: u64,
	pub sequences_reset: bool,
}

#[tauri::command]
pub async fn clear_database(
	app: AppHandle,
	pool: tauri::State<'_, SqlitePool>,
	confirmation: String,
) -> Result<ClearDatabaseResult, AppError> {
	// Verify confirmation text matches expected value
	let required_confirmation = "CLEAR_ALL_DATA_PERMANENTLY";
	if confirmation != required_confirmation {
		return Err(AppError::Custom("Invalid confirmation text".to_string()));
	}

	// Emit progress events
	app.emit(
		"clear_database_progress",
		ProgressEvent {
			stage: "preparation".to_string(),
			message: "准备清空数据库...".to_string(),
			file_hash: None,
			current: Some(0),
			total: Some(8),
		},
	)
	.map_err(|e| AppError::Custom(format!("Failed to emit progress: {e}")))?;

	// Disable foreign keys for faster deletion
	sqlx::query("PRAGMA foreign_keys = OFF")
		.execute(pool.inner())
		.await?;

	let tables = [
		"FileTags",
		"FileFolders",
		"Faces",
		"Files",
		"Tags",
		"Folders",
		"Persons",
	];

	let mut total_deleted = 0u64;
	let mut tables_cleared = Vec::new();

	for (index, table) in tables.iter().enumerate() {
		// Emit progress for each table
		app.emit(
			"clear_database_progress",
			ProgressEvent {
				stage: format!("clearing_{}", table.to_lowercase()),
				message: format!("正在清空表 {table}..."),
				file_hash: None,
				current: Some(index + 1),
				total: Some(8),
			},
		)
		.map_err(|e| AppError::Custom(format!("Failed to emit progress: {e}")))?;

		let result = sqlx::query(&format!("DELETE FROM {table}"))
			.execute(pool.inner())
			.await?;

		let deleted_count = result.rows_affected();
		total_deleted += deleted_count as u64;

		if deleted_count > 0 {
			tables_cleared.push(format!("{table} ({deleted_count} 条记录)"));
		}
	}

	// Re-enable foreign keys
	app.emit(
		"clear_database_progress",
		ProgressEvent {
			stage: "reenabling_foreign_keys".to_string(),
			message: "重新启用外键约束...".to_string(),
			file_hash: None,
			current: Some(7),
			total: Some(8),
		},
	)
	.map_err(|e| AppError::Custom(format!("Failed to emit progress: {e}")))?;

	sqlx::query("PRAGMA foreign_keys = ON")
		.execute(pool.inner())
		.await?;

	// Reset auto-increment sequences
	app.emit(
		"clear_database_progress",
		ProgressEvent {
			stage: "resetting_sequences".to_string(),
			message: "重置自增序列...".to_string(),
			file_hash: None,
			current: Some(8),
			total: Some(8),
		},
	)
	.map_err(|e| AppError::Custom(format!("Failed to emit progress: {e}")))?;

	sqlx::query("DELETE FROM sqlite_sequence")
		.execute(pool.inner())
		.await?;

	// Emit completion event
	app.emit(
		"clear_database_progress",
		ProgressEvent {
			stage: "completed".to_string(),
			message: "数据库清空完成！".to_string(),
			file_hash: None,
			current: Some(8),
			total: Some(8),
		},
	)
	.map_err(|e| AppError::Custom(format!("Failed to emit progress: {e}")))?;

	Ok(ClearDatabaseResult {
		tables_cleared,
		records_deleted: total_deleted,
		sequences_reset: true,
	})
}

// Additional admin commands can be added here
#[tauri::command]
pub async fn get_database_stats(
	pool: tauri::State<'_, SqlitePool>,
) -> Result<serde_json::Value, AppError> {
	// Query counts from each table
	let files_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Files")
		.fetch_one(pool.inner())
		.await?;

	let tags_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Tags")
		.fetch_one(pool.inner())
		.await?;

	let folders_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Folders")
		.fetch_one(pool.inner())
		.await?;

	let persons_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Persons")
		.fetch_one(pool.inner())
		.await?;

	Ok(serde_json::json!({
		"files": files_count,
		"tags": tags_count,
		"folders": folders_count,
		"persons": persons_count
	}))
}
