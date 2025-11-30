use crate::error::AppError;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagCategory {
	pub category_id: i64,
	pub name: String,
	pub color_code: String,
	pub is_builtin: bool,
	pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
	pub name: String,
	pub color_code: Option<String>,
	pub sort_order: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCategoryRequest {
	pub name: Option<String>,
	pub color_code: Option<String>,
	pub sort_order: Option<i64>,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all tag categories
#[tauri::command]
pub async fn get_all_categories(
	pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<TagCategory>, AppError> {
	let categories = sqlx::query_as!(
		TagCategory,
		r#"
        SELECT 
            category_id,
            name,
            color_code,
            is_builtin as "is_builtin: bool",
            sort_order
        FROM TagCategories
        ORDER BY sort_order ASC, name ASC
        "#
	)
	.fetch_all(pool.inner())
	.await?;

	Ok(categories)
}

/// Get a single category by ID
#[tauri::command]
pub async fn get_category(
	pool: tauri::State<'_, SqlitePool>,
	category_id: i64,
) -> Result<Option<TagCategory>, AppError> {
	let category = sqlx::query_as!(
		TagCategory,
		r#"
        SELECT 
            category_id,
            name,
            color_code,
            is_builtin as "is_builtin: bool",
            sort_order
        FROM TagCategories
        WHERE category_id = ?
        "#,
		category_id
	)
	.fetch_optional(pool.inner())
	.await?;

	Ok(category)
}

/// Create a new custom category
#[tauri::command]
pub async fn create_category(
	pool: tauri::State<'_, SqlitePool>,
	request: CreateCategoryRequest,
) -> Result<i64, AppError> {
	// Validate name is not empty
	if request.name.trim().is_empty() {
		return Err(AppError::Custom(
			"Category name cannot be empty".to_string(),
		));
	}

	// Validate color code format (basic hex color validation)
	let color_code = request.color_code.unwrap_or_else(|| "#6B7280".to_string());
	if !color_code.starts_with('#') || color_code.len() != 7 {
		return Err(AppError::Custom(
			"Color code must be a valid hex color (e.g., #6B7280)".to_string(),
		));
	}

	// Get max sort_order to append new category at the end
	let max_sort_order: Option<i64> =
		sqlx::query_scalar!("SELECT MAX(sort_order) FROM TagCategories")
			.fetch_optional(pool.inner())
			.await?
			.flatten();

	let sort_order = request.sort_order.unwrap_or_else(|| {
		max_sort_order.map(|max| max + 1).unwrap_or(100) // Start custom categories at 100
	});

	// Insert new category
	let category_name = request.name.trim().to_string();
	let category = sqlx::query!(
		r#"
        INSERT INTO TagCategories (name, color_code, is_builtin, sort_order)
        VALUES (?, ?, FALSE, ?)
        RETURNING category_id
        "#,
		category_name,
		color_code,
		sort_order
	)
	.fetch_one(pool.inner())
	.await?;

	Ok(category.category_id)
}

/// Update an existing category
#[tauri::command]
pub async fn update_category(
	pool: tauri::State<'_, SqlitePool>,
	category_id: i64,
	request: UpdateCategoryRequest,
) -> Result<(), AppError> {
	// Check if category exists and is not builtin
	let category = sqlx::query!(
		"SELECT is_builtin FROM TagCategories WHERE category_id = ?",
		category_id
	)
	.fetch_optional(pool.inner())
	.await?;

	let category = category
		.ok_or_else(|| AppError::Custom(format!("Category with id {category_id} not found")))?;

	if category.is_builtin {
		return Err(AppError::Custom(
			"Cannot modify built-in categories".to_string(),
		));
	}

	// Build update query dynamically based on provided fields
	let mut updates = Vec::new();
	let mut params: Vec<String> = Vec::new();

	if let Some(name) = &request.name {
		if name.trim().is_empty() {
			return Err(AppError::Custom(
				"Category name cannot be empty".to_string(),
			));
		}
		updates.push("name = ?");
		params.push(name.trim().to_string());
	}

	if let Some(color_code) = &request.color_code {
		if !color_code.starts_with('#') || color_code.len() != 7 {
			return Err(AppError::Custom(
				"Color code must be a valid hex color (e.g., #6B7280)".to_string(),
			));
		}
		updates.push("color_code = ?");
		params.push(color_code.clone());
	}

	if let Some(sort_order) = request.sort_order {
		updates.push("sort_order = ?");
		params.push(sort_order.to_string());
	}

	if updates.is_empty() {
		return Ok(()); // No updates to perform
	}

	// Add category_id to params
	params.push(category_id.to_string());

	// Build and execute query
	let query = format!(
		"UPDATE TagCategories SET {} WHERE category_id = ?",
		updates.join(", ")
	);

	let mut query_builder = sqlx::query(&query);
	for param in &params[..params.len() - 1] {
		if param.parse::<i64>().is_ok() {
			query_builder = query_builder.bind(param.parse::<i64>().unwrap());
		} else {
			query_builder = query_builder.bind(param);
		}
	}
	query_builder = query_builder.bind(category_id);

	query_builder.execute(pool.inner()).await?;

	Ok(())
}

/// Delete a category (only custom categories can be deleted)
#[tauri::command]
pub async fn delete_category(
	pool: tauri::State<'_, SqlitePool>,
	category_id: i64,
) -> Result<(), AppError> {
	// Check if category exists and is not builtin
	let category = sqlx::query!(
		"SELECT is_builtin FROM TagCategories WHERE category_id = ?",
		category_id
	)
	.fetch_optional(pool.inner())
	.await?;

	let category = category
		.ok_or_else(|| AppError::Custom(format!("Category with id {category_id} not found")))?;

	if category.is_builtin {
		return Err(AppError::Custom(
			"Cannot delete built-in categories".to_string(),
		));
	}

	// Check if any tags are using this category
	let tag_count: i64 = sqlx::query_scalar!(
		"SELECT COUNT(*) FROM Tags WHERE category_id = ?",
		category_id
	)
	.fetch_one(pool.inner())
	.await?;

	if tag_count > 0 {
		return Err(AppError::Custom(format!(
			"Cannot delete category: {tag_count} tags are using it. Please reassign tags first."
		)));
	}

	// Delete the category
	sqlx::query!(
		"DELETE FROM TagCategories WHERE category_id = ?",
		category_id
	)
	.execute(pool.inner())
	.await?;

	Ok(())
}

/// Reorder categories by updating sort_order
#[tauri::command]
pub async fn reorder_categories(
	pool: tauri::State<'_, SqlitePool>,
	category_ids: Vec<i64>,
) -> Result<(), AppError> {
	// Update sort_order for each category based on its position in the array
	for (index, category_id) in category_ids.iter().enumerate() {
		let sort_order = index as i64;
		sqlx::query!(
			"UPDATE TagCategories SET sort_order = ? WHERE category_id = ?",
			sort_order,
			category_id
		)
		.execute(pool.inner())
		.await?;
	}

	Ok(())
}

/// Assign a tag to a category
#[tauri::command]
pub async fn assign_tag_to_category(
	pool: tauri::State<'_, SqlitePool>,
	tag_id: i64,
	category_id: i64,
) -> Result<(), AppError> {
	// Verify category exists
	let category = sqlx::query!(
		"SELECT category_id FROM TagCategories WHERE category_id = ?",
		category_id
	)
	.fetch_optional(pool.inner())
	.await?;

	if category.is_none() {
		return Err(AppError::Custom(format!(
			"Category with id {category_id} not found"
		)));
	}

	// Update tag's category
	sqlx::query!(
		"UPDATE Tags SET category_id = ? WHERE tag_id = ?",
		category_id,
		tag_id
	)
	.execute(pool.inner())
	.await?;

	Ok(())
}

/// Bulk assign tags to a category
#[tauri::command]
pub async fn bulk_assign_tags_to_category(
	pool: tauri::State<'_, SqlitePool>,
	tag_ids: Vec<i64>,
	category_id: i64,
) -> Result<usize, AppError> {
	// Verify category exists
	let category = sqlx::query!(
		"SELECT category_id FROM TagCategories WHERE category_id = ?",
		category_id
	)
	.fetch_optional(pool.inner())
	.await?;

	if category.is_none() {
		return Err(AppError::Custom(format!(
			"Category with id {category_id} not found"
		)));
	}

	// Update all tags in a single query
	let placeholders = tag_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
	let query = format!("UPDATE Tags SET category_id = ? WHERE tag_id IN ({placeholders})");

	let mut query_builder = sqlx::query(&query);
	query_builder = query_builder.bind(category_id);
	for tag_id in &tag_ids {
		query_builder = query_builder.bind(tag_id);
	}

	let result = query_builder.execute(pool.inner()).await?;

	Ok(result.rows_affected() as usize)
}
