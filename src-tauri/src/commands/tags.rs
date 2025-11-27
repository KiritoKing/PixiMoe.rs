use crate::error::AppError;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
	pub tag_id: i64,
	pub name: String,
	#[serde(rename = "type")]
	pub tag_type: String,
	pub file_count: Option<i64>,
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn get_all_tags(pool: tauri::State<'_, SqlitePool>) -> Result<Vec<Tag>, AppError> {
	let tags = sqlx::query!(
		r#"
        SELECT t.tag_id, t.name, t.type,
               COUNT(ft.file_hash) as "file_count: i64"
        FROM Tags t
        LEFT JOIN FileTags ft ON t.tag_id = ft.tag_id
        GROUP BY t.tag_id
        ORDER BY t.name ASC
        "#
	)
	.fetch_all(pool.inner())
	.await?
	.into_iter()
	.map(|row| Tag {
		tag_id: row.tag_id,
		name: row.name,
		tag_type: row.r#type,
		file_count: Some(row.file_count),
	})
	.collect();

	Ok(tags)
}

#[tauri::command]
pub async fn get_file_tags(
	pool: tauri::State<'_, SqlitePool>,
	file_hash: String,
) -> Result<Vec<Tag>, AppError> {
	let tags = sqlx::query!(
		r#"
        SELECT t.tag_id, t.name, t.type
        FROM Tags t
        INNER JOIN FileTags ft ON t.tag_id = ft.tag_id
        WHERE ft.file_hash = ?
        ORDER BY t.name ASC
        "#,
		file_hash
	)
	.fetch_all(pool.inner())
	.await?
	.into_iter()
	.map(|row| Tag {
		tag_id: row.tag_id.unwrap_or(0),
		name: row.name,
		tag_type: row.r#type,
		file_count: None,
	})
	.collect();

	Ok(tags)
}

#[tauri::command]
pub async fn add_tag_to_file(
	pool: tauri::State<'_, SqlitePool>,
	file_hash: String,
	tag_name: String,
	tag_type: Option<String>,
) -> Result<i64, AppError> {
	let tag_type = tag_type.unwrap_or_else(|| "general".to_string());

	// Get or create tag
	let tag = sqlx::query!(
		r#"
        INSERT INTO Tags (name, type)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET type=type
        RETURNING tag_id
        "#,
		tag_name,
		tag_type
	)
	.fetch_one(pool.inner())
	.await?;

	// Add file-tag association (ignore if already exists)
	sqlx::query!(
		r#"
        INSERT OR IGNORE INTO FileTags (file_hash, tag_id)
        VALUES (?, ?)
        "#,
		file_hash,
		tag.tag_id
	)
	.execute(pool.inner())
	.await?;

	Ok(tag.tag_id)
}

#[tauri::command]
pub async fn add_tags_to_files(
	pool: tauri::State<'_, SqlitePool>,
	file_hashes: Vec<String>,
	tag_names: Vec<String>,
	tag_type: Option<String>,
) -> Result<usize, AppError> {
	let tag_type = tag_type.unwrap_or_else(|| "general".to_string());
	let mut added_count = 0;

	for tag_name in tag_names {
		// Get or create tag
		let tag = sqlx::query!(
			r#"
            INSERT INTO Tags (name, type)
            VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET type=type
            RETURNING tag_id
            "#,
			tag_name,
			tag_type
		)
		.fetch_one(pool.inner())
		.await?;

		// Add to all files
		for file_hash in &file_hashes {
			let result = sqlx::query!(
				r#"
                INSERT OR IGNORE INTO FileTags (file_hash, tag_id)
                VALUES (?, ?)
                "#,
				file_hash,
				tag.tag_id
			)
			.execute(pool.inner())
			.await?;

			if result.rows_affected() > 0 {
				added_count += 1;
			}
		}
	}

	Ok(added_count)
}

#[tauri::command]
pub async fn remove_tag_from_file(
	pool: tauri::State<'_, SqlitePool>,
	file_hash: String,
	tag_id: i64,
) -> Result<(), AppError> {
	sqlx::query!(
		"DELETE FROM FileTags WHERE file_hash = ? AND tag_id = ?",
		file_hash,
		tag_id
	)
	.execute(pool.inner())
	.await?;

	Ok(())
}

#[tauri::command]
pub async fn remove_tag_from_files(
	pool: tauri::State<'_, SqlitePool>,
	file_hashes: Vec<String>,
	tag_id: i64,
) -> Result<usize, AppError> {
	let mut removed_count = 0;

	for file_hash in file_hashes {
		let result = sqlx::query!(
			"DELETE FROM FileTags WHERE file_hash = ? AND tag_id = ?",
			file_hash,
			tag_id
		)
		.execute(pool.inner())
		.await?;

		removed_count += result.rows_affected() as usize;
	}

	Ok(removed_count)
}

#[tauri::command]
pub async fn create_tag(
	pool: tauri::State<'_, SqlitePool>,
	name: String,
	tag_type: String,
) -> Result<i64, AppError> {
	// Validate tag type
	let valid_types = ["general", "character", "artist", "meta", "copyright"];
	if !valid_types.contains(&tag_type.as_str()) {
		return Err(AppError::Custom(format!(
			"Invalid tag type '{}'. Must be one of: {}",
			tag_type,
			valid_types.join(", ")
		)));
	}

	// Insert or return existing tag
	let tag = sqlx::query!(
		r#"
        INSERT INTO Tags (name, type)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET type=?
        RETURNING tag_id
        "#,
		name,
		tag_type,
		tag_type
	)
	.fetch_one(pool.inner())
	.await?;

	Ok(tag.tag_id)
}

#[tauri::command]
pub async fn search_tags(
	pool: tauri::State<'_, SqlitePool>,
	prefix: String,
	limit: Option<i64>,
) -> Result<Vec<Tag>, AppError> {
	let limit = limit.unwrap_or(20);
	let search_pattern = format!("{prefix}%");

	let tags = sqlx::query!(
		r#"
        SELECT t.tag_id, t.name, t.type,
               COUNT(ft.file_hash) as file_count
        FROM Tags t
        LEFT JOIN FileTags ft ON t.tag_id = ft.tag_id
        WHERE t.name LIKE ?
        GROUP BY t.tag_id
        ORDER BY COUNT(ft.file_hash) DESC, t.name ASC
        LIMIT ?
        "#,
		search_pattern,
		limit
	)
	.fetch_all(pool.inner())
	.await?
	.into_iter()
	.map(|row| Tag {
		tag_id: row.tag_id,
		name: row.name,
		tag_type: row.r#type,
		file_count: Some(row.file_count),
	})
	.collect();

	Ok(tags)
}
