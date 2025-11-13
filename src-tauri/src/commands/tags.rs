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
pub async fn get_all_tags(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Tag>, AppError> {
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
) -> Result<(), AppError> {
    // Get or create tag
    let tag = sqlx::query!(
        r#"
        INSERT INTO Tags (name, type)
        VALUES (?, 'general')
        ON CONFLICT(name) DO UPDATE SET name=name
        RETURNING tag_id
        "#,
        tag_name
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

    Ok(())
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
