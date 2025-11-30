use crate::error::AppError;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct Favorite {
	pub favorite_id: i64,
	pub file_hash: String,
	pub created_at: String, // ISO 8601 datetime string
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Toggle favorite status for a file
/// Returns the new favorite status (true if added, false if removed)
#[tauri::command]
pub async fn toggle_favorite(
	pool: tauri::State<'_, SqlitePool>,
	file_hash: String,
) -> Result<bool, AppError> {
	// Check if file exists
	let file = sqlx::query!("SELECT file_hash FROM Files WHERE file_hash = ?", file_hash)
		.fetch_optional(pool.inner())
		.await?;

	if file.is_none() {
		return Err(AppError::Custom(format!("File not found: {file_hash}")));
	}

	// Check if favorite already exists
	let existing = sqlx::query!(
		"SELECT favorite_id FROM Favorites WHERE file_hash = ?",
		file_hash
	)
	.fetch_optional(pool.inner())
	.await?;

	if existing.is_some() {
		// Remove favorite
		sqlx::query!("DELETE FROM Favorites WHERE file_hash = ?", file_hash)
			.execute(pool.inner())
			.await?;
		Ok(false)
	} else {
		// Add favorite
		sqlx::query!("INSERT INTO Favorites (file_hash) VALUES (?)", file_hash)
			.execute(pool.inner())
			.await?;
		Ok(true)
	}
}

/// Get favorite status for a single file
#[tauri::command]
pub async fn get_favorite_status(
	pool: tauri::State<'_, SqlitePool>,
	file_hash: String,
) -> Result<bool, AppError> {
	let favorite = sqlx::query!(
		"SELECT favorite_id FROM Favorites WHERE file_hash = ?",
		file_hash
	)
	.fetch_optional(pool.inner())
	.await?;

	Ok(favorite.is_some())
}

/// Get favorite status for multiple files
#[tauri::command]
pub async fn get_favorite_statuses(
	pool: tauri::State<'_, SqlitePool>,
	file_hashes: Vec<String>,
) -> Result<std::collections::HashMap<String, bool>, AppError> {
	if file_hashes.is_empty() {
		return Ok(std::collections::HashMap::new());
	}

	// Build query with placeholders
	let placeholders = file_hashes
		.iter()
		.map(|_| "?")
		.collect::<Vec<_>>()
		.join(",");
	let query = format!("SELECT file_hash FROM Favorites WHERE file_hash IN ({placeholders})");

	let mut query_builder = sqlx::query(&query);
	for file_hash in &file_hashes {
		query_builder = query_builder.bind(file_hash);
	}

	let favorites = query_builder
		.fetch_all(pool.inner())
		.await?
		.into_iter()
		.map(|row| row.get::<String, _>("file_hash"))
		.collect::<std::collections::HashSet<String>>();

	// Build result map
	let mut result = std::collections::HashMap::new();
	for file_hash in file_hashes {
		result.insert(file_hash.clone(), favorites.contains(&file_hash));
	}

	Ok(result)
}

/// Get all favorites
#[tauri::command]
pub async fn get_all_favorites(
	pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Favorite>, AppError> {
	let rows = sqlx::query!(
		r#"
        SELECT 
            favorite_id,
            file_hash,
            datetime(created_at, 'localtime') as created_at
        FROM Favorites
        ORDER BY created_at DESC
        "#
	)
	.fetch_all(pool.inner())
	.await?;

	let favorites = rows
		.into_iter()
		.map(|row| Favorite {
			favorite_id: row.favorite_id,
			file_hash: row.file_hash,
			created_at: row.created_at.unwrap_or_default(),
		})
		.collect();

	Ok(favorites)
}

/// Add multiple files to favorites
#[tauri::command]
pub async fn add_favorites(
	pool: tauri::State<'_, SqlitePool>,
	file_hashes: Vec<String>,
) -> Result<usize, AppError> {
	if file_hashes.is_empty() {
		return Ok(0);
	}

	let mut added_count = 0;

	for file_hash in file_hashes {
		// Check if file exists
		let file = sqlx::query!("SELECT file_hash FROM Files WHERE file_hash = ?", file_hash)
			.fetch_optional(pool.inner())
			.await?;

		if file.is_none() {
			continue; // Skip non-existent files
		}

		// Try to insert (ignore if already exists)
		let result = sqlx::query!(
			"INSERT OR IGNORE INTO Favorites (file_hash) VALUES (?)",
			file_hash
		)
		.execute(pool.inner())
		.await?;

		if result.rows_affected() > 0 {
			added_count += 1;
		}
	}

	Ok(added_count)
}

/// Remove multiple files from favorites
#[tauri::command]
pub async fn remove_favorites(
	pool: tauri::State<'_, SqlitePool>,
	file_hashes: Vec<String>,
) -> Result<usize, AppError> {
	if file_hashes.is_empty() {
		return Ok(0);
	}

	// Build query with placeholders
	let placeholders = file_hashes
		.iter()
		.map(|_| "?")
		.collect::<Vec<_>>()
		.join(",");
	let query = format!("DELETE FROM Favorites WHERE file_hash IN ({placeholders})");

	let mut query_builder = sqlx::query(&query);
	for file_hash in &file_hashes {
		query_builder = query_builder.bind(file_hash);
	}

	let result = query_builder.execute(pool.inner()).await?;

	Ok(result.rows_affected() as usize)
}

/// Get count of favorites
#[tauri::command]
pub async fn get_favorite_count(pool: tauri::State<'_, SqlitePool>) -> Result<i64, AppError> {
	let count: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM Favorites")
		.fetch_one(pool.inner())
		.await?;

	Ok(count)
}
