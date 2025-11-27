use crate::error::AppError;
use blake3::Hasher;
use image::{DynamicImage, GenericImageView};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::fs::{self, File};
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Semaphore;

// Global semaphore to limit concurrent thumbnail generation
// Set to number of CPU cores for optimal performance
static THUMBNAIL_SEMAPHORE: Lazy<Semaphore> = Lazy::new(|| {
    let max_concurrent = std::thread::available_parallelism()
        .map(|n| n.get().min(8)) // Cap at 8 to avoid overwhelming system
        .unwrap_or(4); // Fallback to 4 if unavailable
    Semaphore::new(max_concurrent)
});

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRecord {
    pub file_hash: String,
    pub original_path: String,
    pub file_size_bytes: i64,
    pub file_last_modified: i64,
    pub width: i64,
    pub height: i64,
    pub date_imported: i64,
    pub is_missing: i64,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub file_hash: String,
    pub is_duplicate: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct ProgressEvent {
    pub stage: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current: Option<usize>, // Current progress (n)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<usize>, // Total count (m)
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Calculate BLAKE3 hash of a file using buffered reading
pub fn calculate_blake3_hash(path: &Path) -> Result<String, AppError> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Hasher::new();
    let mut buffer = [0u8; 8192];

    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(hasher.finalize().to_hex().to_string())
}

/// Generate a WebP thumbnail with smart cropping
/// Returns the path to the generated thumbnail
/// Optimizations:
/// - Checks if thumbnail already exists before generating
/// - Skips unnecessary image processing when possible
/// - Uses optimized image operations
pub fn generate_thumbnail(
    image_path: &Path,
    output_path: &Path,
    thumbnail_size: u32,
) -> Result<PathBuf, AppError> {
    // Early return if thumbnail already exists
    if output_path.exists() {
        return Ok(output_path.to_path_buf());
    }

    // Create output directory if it doesn't exist
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Load the image with optimized decoder
    let img = image::open(image_path)
        .map_err(|e| AppError::Custom(format!("Failed to load image: {}", e)))?;

    // Smart cropping: maintain aspect ratio and center crop
    let thumb = resize_and_crop(&img, thumbnail_size);

    // Convert to RGB8 for WebP encoding (only if needed)
    let rgb_image = thumb.to_rgb8();

    // Encode as WebP with optimized quality
    let encoder = webp::Encoder::from_rgb(&rgb_image, rgb_image.width(), rgb_image.height());
    let webp_data = encoder.encode(85.0); // Quality 85

    // Write to file atomically to avoid partial writes
    fs::write(output_path, &*webp_data)?;

    Ok(output_path.to_path_buf())
}

/// Resize and center crop an image to a square
/// Optimizations:
/// - Early return if image is already square and close to target size
/// - Uses faster filter for small downscales
/// - Avoids unnecessary cropping when not needed
fn resize_and_crop(img: &DynamicImage, size: u32) -> DynamicImage {
    let (width, height) = img.dimensions();

    // Early optimization: if image is already square and close to target size, skip processing
    if width == height && (width as i32 - size as i32).abs() < 50 {
        if width == size {
            // Already exact size, just convert format if needed
            return img.to_rgba8().into();
        }
        // Close enough, use faster resize
        return img
            .resize_exact(size, size, image::imageops::FilterType::Triangle)
            .into();
    }

    // Calculate the scaling factor to fit the image into the square
    let scale = if width < height {
        size as f32 / width as f32
    } else {
        size as f32 / height as f32
    };

    let new_width = (width as f32 * scale) as u32;
    let new_height = (height as f32 * scale) as u32;

    // Use faster filter for large downscales, Lanczos3 for small adjustments
    let filter = if scale < 0.5 {
        image::imageops::FilterType::Triangle // Faster for large downscales
    } else {
        image::imageops::FilterType::Lanczos3 // Better quality for small adjustments
    };

    // Resize maintaining aspect ratio
    let resized = img.resize(new_width, new_height, filter);

    // Center crop to square (only if needed)
    if new_width == size && new_height == size {
        // Already square, no crop needed
        resized.to_rgba8().into()
    } else {
        let x_offset = if new_width > size {
            (new_width - size) / 2
        } else {
            0
        };
        let y_offset = if new_height > size {
            (new_height - size) / 2
        } else {
            0
        };

        DynamicImage::ImageRgba8(
            image::imageops::crop_imm(&resized, x_offset, y_offset, size, size).to_image(),
        )
    }
}

/// Get the thumbnail directory path
pub fn get_thumbnail_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Custom(format!("Failed to get app data dir: {}", e)))?;
    Ok(app_data_dir.join("thumbnails"))
}

/// Automatically tag a file using AI
/// Emits ai_tagging_progress events with stages: classifying, saving_tags, complete, error
async fn tag_file_automatically(
    app: &AppHandle,
    pool: &SqlitePool,
    file_hash: &str,
    file_path: &Path,
) -> Result<usize, AppError> {
    use crate::ai::tagger;

    eprintln!(
        "[AI Tagging] Starting AI tagging for file_hash: {}, path: {}",
        file_hash,
        file_path.display()
    );

    // Check if model is available first
    if !tagger::is_model_available() {
        let error_msg =
            "AI model not available. Please check models/README.md for setup instructions.";
        eprintln!("[AI Tagging] ERROR: {}", error_msg);
        return Err(AppError::Custom(error_msg.to_string()));
    }

    // Emit progress: classifying
    app.emit(
        "ai_tagging_progress",
        ProgressEvent {
            stage: "classifying".to_string(),
            message: format!("Running AI inference for {}...", file_hash),
            file_hash: Some(file_hash.to_string()),
            current: None,
            total: None,
        },
    )
    .ok();

    // Run AI classification
    let predictions = match tagger::classify_image(file_path).await {
        Ok(preds) => {
            eprintln!(
                "[AI Tagging] Inference completed for {}: {} predictions",
                file_hash,
                preds.len()
            );
            preds
        }
        Err(e) => {
            let error_msg = format!("AI inference failed for {}: {}", file_hash, e);
            eprintln!("[AI Tagging] ERROR: {}", error_msg);
            return Err(e);
        }
    };
    let tag_count = predictions.len();

    // Emit progress: saving tags
    app.emit(
        "ai_tagging_progress",
        ProgressEvent {
            stage: "saving_tags".to_string(),
            message: format!("Saving {} tags for {}...", tag_count, file_hash),
            file_hash: Some(file_hash.to_string()),
            current: None,
            total: None,
        },
    )
    .ok();

    // Insert tags into database
    let mut added_count = 0;
    for prediction in predictions {
        // Insert or get tag
        let tag = match sqlx::query!(
            r#"
            INSERT INTO Tags (name, type)
            VALUES (?, 'general')
            ON CONFLICT(name) DO UPDATE SET name=name
            RETURNING tag_id
            "#,
            prediction.name
        )
        .fetch_one(pool)
        .await
        {
            Ok(t) => t,
            Err(e) => {
                eprintln!(
                    "[AI Tagging] ERROR: Failed to insert tag '{}' for {}: {}",
                    prediction.name, file_hash, e
                );
                continue; // Skip this tag but continue with others
            }
        };

        // Link to file (count only new associations)
        let result = match sqlx::query!(
            r#"
            INSERT OR IGNORE INTO FileTags (file_hash, tag_id)
            VALUES (?, ?)
            "#,
            file_hash,
            tag.tag_id
        )
        .execute(pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!(
                    "[AI Tagging] ERROR: Failed to link tag '{}' to file {}: {}",
                    prediction.name, file_hash, e
                );
                continue; // Skip this tag but continue with others
            }
        };

        if result.rows_affected() > 0 {
            added_count += 1;
        }
    }

    eprintln!(
        "[AI Tagging] Completed for {}: {} tags added",
        file_hash, added_count
    );
    Ok(added_count)
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn import_file(
    app: AppHandle,
    path: String,
    pool: tauri::State<'_, SqlitePool>,
    tag_names: Option<Vec<String>>,
    enable_ai_tagging: Option<bool>,
) -> Result<ImportResult, AppError> {
    eprintln!("=== Starting import for: {} ===", path);
    let file_path = PathBuf::from(&path);

    // Emit progress: hashing
    app.emit(
        "import_progress",
        ProgressEvent {
            stage: "hashing".to_string(),
            message: "Calculating file hash...".to_string(),
            file_hash: None,
            current: None,
            total: None,
        },
    )
    .ok();

    eprintln!("Getting file metadata...");
    // Get file metadata
    let metadata = fs::metadata(&file_path)?;
    let file_size_bytes = metadata.len() as i64;
    eprintln!("File size: {} bytes", file_size_bytes);

    // Calculate hash
    eprintln!("Calculating BLAKE3 hash...");
    let file_hash = calculate_blake3_hash(&file_path)?;
    eprintln!("Hash calculated: {}", file_hash);

    // Check for duplicates
    eprintln!("Checking for duplicates...");
    let existing = sqlx::query!("SELECT file_hash FROM Files WHERE file_hash = ?", file_hash)
        .fetch_optional(pool.inner())
        .await?;

    if existing.is_some() {
        eprintln!("Duplicate found, skipping import");
        return Ok(ImportResult {
            file_hash,
            is_duplicate: true,
        });
    }

    // Get image dimensions
    eprintln!("Getting image dimensions...");
    let (width, height) = image::image_dimensions(&file_path)
        .map_err(|e| AppError::Custom(format!("Failed to get image dimensions: {}", e)))?;
    eprintln!("Dimensions: {}x{}", width, height);

    // Get file modified time (Unix timestamp)
    let file_last_modified = metadata
        .modified()?
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| AppError::Custom(format!("Invalid file time: {}", e)))?
        .as_secs() as i64;

    // Get current time for date_imported (Unix timestamp)
    let date_imported = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| AppError::Custom(format!("Invalid system time: {}", e)))?
        .as_secs() as i64;

    // Emit progress: saving
    app.emit(
        "import_progress",
        ProgressEvent {
            stage: "saving".to_string(),
            message: "Saving to database...".to_string(),
            file_hash: None,
            current: None,
            total: None,
        },
    )
    .ok();

    // Insert into database BEFORE thumbnail generation
    eprintln!("Inserting into database...");
    sqlx::query!(
        r#"
        INSERT INTO Files (file_hash, original_path, file_size_bytes, file_last_modified, width, height, date_imported, is_missing)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        "#,
        file_hash,
        path,
        file_size_bytes,
        file_last_modified,
        width,
        height,
        date_imported
    )
    .execute(pool.inner())
    .await?;
    eprintln!("Database insert complete");

    // Apply tags if provided during import
    if let Some(tags) = tag_names {
        eprintln!("Applying {} tags during import...", tags.len());
        for tag_name in tags {
            // Create or get tag
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

            // Associate tag with file
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
        }
        eprintln!("Tags applied during import");
    }

    // Generate thumbnail in background thread after DB insert
    let app_thumbnail = app.clone();
    let file_path_thumbnail = file_path.clone();
    let file_hash_thumbnail = file_hash.clone();
    let thumbnail_dir = get_thumbnail_dir(&app)?;

    tokio::spawn(async move {
        // Acquire semaphore permit to limit concurrent thumbnail generation
        let _permit = THUMBNAIL_SEMAPHORE.acquire().await;

        // Check if thumbnail already exists before generating
        let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file_hash_thumbnail));
        if thumbnail_path.exists() {
            // Thumbnail already exists, emit complete event
            app_thumbnail
                .emit(
                    "thumbnail_progress",
                    ProgressEvent {
                        stage: "complete".to_string(),
                        message: format!("Thumbnail already exists for {}", file_hash_thumbnail),
                        file_hash: Some(file_hash_thumbnail.clone()),
                        current: None,
                        total: None,
                    },
                )
                .ok();
            return;
        }

        // Emit progress: thumbnail generating
        app_thumbnail
            .emit(
                "thumbnail_progress",
                ProgressEvent {
                    stage: "generating".to_string(),
                    message: format!("Generating thumbnail for {}...", file_hash_thumbnail),
                    file_hash: Some(file_hash_thumbnail.clone()),
                    current: None,
                    total: None,
                },
            )
            .ok();

        let file_path_for_blocking = file_path_thumbnail.clone();
        let thumbnail_path_for_blocking = thumbnail_path.clone();
        let result = tokio::task::spawn_blocking(move || {
            generate_thumbnail(&file_path_for_blocking, &thumbnail_path_for_blocking, 400)
        })
        .await;

        match result {
            Ok(Ok(_path)) => {
                app_thumbnail
                    .emit(
                        "thumbnail_progress",
                        ProgressEvent {
                            stage: "complete".to_string(),
                            message: format!("Thumbnail complete for {}", file_hash_thumbnail),
                            file_hash: Some(file_hash_thumbnail.clone()),
                            current: None,
                            total: None,
                        },
                    )
                    .ok();
            }
            Ok(Err(e)) => {
                app_thumbnail
                    .emit(
                        "thumbnail_progress",
                        ProgressEvent {
                            stage: "error".to_string(),
                            file_hash: Some(file_hash_thumbnail.clone()),
                            message: format!("Thumbnail failed for {}: {}", file_hash_thumbnail, e),
                            current: None,
                            total: None,
                        },
                    )
                    .ok();
            }
            Err(e) => {
                app_thumbnail
                    .emit(
                        "thumbnail_progress",
                        ProgressEvent {
                            stage: "error".to_string(),
                            file_hash: Some(file_hash_thumbnail.clone()),
                            message: format!(
                                "Thumbnail task failed for {}: {}",
                                file_hash_thumbnail, e
                            ),
                            current: None,
                            total: None,
                        },
                    )
                    .ok();
            }
        }
        // Permit is automatically released when dropped
    });

    // Check if AI tagging should be enabled (but don't start it yet - wait for all imports to complete)
    // Log the received value for debugging
    eprintln!(
        "[Import] AI tagging option received: {:?}",
        enable_ai_tagging
    );
    // Only enable if explicitly set to true
    // If None (not provided), default to false to respect explicit user choice
    // If Some(false), explicitly disabled
    // If Some(true), explicitly enabled
    let should_tag = match enable_ai_tagging {
        Some(true) => true,
        Some(false) => false,
        None => false, // Default to false when not provided (user should explicitly enable)
    };
    eprintln!(
        "[Import] AI tagging will be {} for {} (will start after all imports complete)",
        if should_tag { "enabled" } else { "disabled" },
        file_hash
    );
    // Note: AI tagging is now started after all files are imported, not immediately
    // This prevents AI tagging from starting before import is complete

    // Import is complete - return immediately without waiting for AI tagging
    eprintln!(
        "=== Import complete for: {} (AI tagging in progress) ===",
        file_hash
    );
    Ok(ImportResult {
        file_hash,
        is_duplicate: false,
    })
}

#[tauri::command]
pub async fn get_all_files(
    pool: tauri::State<'_, SqlitePool>,
    offset: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<FileRecord>, AppError> {
    let offset = offset.unwrap_or(0);

    // If limit is None or 0, return all files (no limit)
    let files = if let Some(limit_val) = limit {
        if limit_val > 0 {
            sqlx::query_as!(
                FileRecord,
                r#"
                SELECT file_hash, original_path, file_size_bytes, file_last_modified, width, height,
                       date_imported, is_missing
                FROM Files
                WHERE is_missing = 0
                ORDER BY date_imported DESC
                LIMIT ? OFFSET ?
                "#,
                limit_val,
                offset
            )
            .fetch_all(pool.inner())
            .await?
        } else {
            // limit is 0 or negative, return all files
            // SQLite requires LIMIT with OFFSET, so use a very large LIMIT
            sqlx::query_as!(
                FileRecord,
                r#"
                SELECT file_hash, original_path, file_size_bytes, file_last_modified, width, height,
                       date_imported, is_missing
                FROM Files
                WHERE is_missing = 0
                ORDER BY date_imported DESC
                LIMIT -1 OFFSET ?
                "#,
                offset
            )
            .fetch_all(pool.inner())
            .await?
        }
    } else {
        // limit is None, return all files
        // SQLite requires LIMIT with OFFSET, so use a very large LIMIT
        sqlx::query_as!(
            FileRecord,
            r#"
            SELECT file_hash, original_path, file_size_bytes, file_last_modified, width, height,
                   date_imported, is_missing
            FROM Files
            WHERE is_missing = 0
            ORDER BY date_imported DESC
            LIMIT -1 OFFSET ?
            "#,
            offset
        )
        .fetch_all(pool.inner())
        .await?
    };

    Ok(files)
}

#[tauri::command]
pub async fn get_file_by_hash(
    pool: tauri::State<'_, SqlitePool>,
    file_hash: String,
) -> Result<Option<FileRecord>, AppError> {
    let file = sqlx::query_as!(
        FileRecord,
        r#"
        SELECT file_hash, original_path, file_size_bytes, file_last_modified, width, height,
               date_imported, is_missing
        FROM Files
        WHERE file_hash = ?
        "#,
        file_hash
    )
    .fetch_optional(pool.inner())
    .await?;

    Ok(file)
}

#[tauri::command]
pub async fn search_files_by_tags(
    pool: tauri::State<'_, SqlitePool>,
    tag_ids: Vec<i32>,
) -> Result<Vec<FileRecord>, AppError> {
    // If no tags specified, return all files
    if tag_ids.is_empty() {
        return get_all_files(pool, None, None).await;
    }

    // Build dynamic query for OR logic (files that have ANY of the specified tags)
    let placeholders = tag_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    let query = format!(
        r#"
        SELECT DISTINCT f.file_hash, f.original_path, f.file_size_bytes, f.file_last_modified,
               f.width, f.height, f.date_imported, f.is_missing
        FROM Files f
        INNER JOIN FileTags ft ON f.file_hash = ft.file_hash
        WHERE f.is_missing = 0 AND ft.tag_id IN ({})
        ORDER BY f.date_imported DESC
        "#,
        placeholders
    );

    let mut query_builder = sqlx::query(&query);

    // Bind tag IDs
    for tag_id in &tag_ids {
        query_builder = query_builder.bind(tag_id);
    }

    let rows = query_builder.fetch_all(pool.inner()).await?;

    // Manually map rows to FileRecord
    let files = rows
        .into_iter()
        .map(|row| FileRecord {
            file_hash: row.get("file_hash"),
            original_path: row.get("original_path"),
            file_size_bytes: row.get("file_size_bytes"),
            file_last_modified: row.get("file_last_modified"),
            width: row.get("width"),
            height: row.get("height"),
            date_imported: row.get("date_imported"),
            is_missing: row.get("is_missing"),
        })
        .collect();

    Ok(files)
}

/// Get the thumbnail URL for a given file hash
#[tauri::command]
pub fn get_thumbnail_url(_app: AppHandle, file_hash: String) -> Result<String, AppError> {
    // Convert to asset URL (thumbnail directory is handled by the asset protocol)
    let url = format!("app-asset://localhost/thumbnails/{}.webp", file_hash);

    Ok(url)
}

/// Regenerate missing thumbnails for all files in the database
/// This is called on app startup to ensure all thumbnails exist
/// Uses semaphore to limit concurrent thumbnail generation
pub async fn regenerate_missing_thumbnails(
    app: &AppHandle,
    pool: &SqlitePool,
) -> Result<(), AppError> {
    let thumbnail_dir = get_thumbnail_dir(app)?;

    // Get all files from database
    let files = sqlx::query_as!(
        FileRecord,
        r#"
        SELECT file_hash, original_path, file_size_bytes, file_last_modified, width, height,
               date_imported, is_missing
        FROM Files
        WHERE is_missing = 0
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut regenerated_count = 0;
    let mut tasks = Vec::new();

    for file in files {
        let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file.file_hash));

        // Check if thumbnail exists (early skip)
        if thumbnail_path.exists() {
            continue;
        }

        // Check if original file still exists
        let original_path = PathBuf::from(&file.original_path);
        if !original_path.exists() {
            // Mark file as missing in database
            sqlx::query!(
                "UPDATE Files SET is_missing = 1 WHERE file_hash = ?",
                file.file_hash
            )
            .execute(pool)
            .await?;
            continue;
        }

        // Spawn thumbnail generation task with semaphore control
        let file_hash_clone = file.file_hash.clone();
        let original_path_clone = original_path.clone();
        let thumbnail_path_clone = thumbnail_path.clone();

        let task = tokio::spawn(async move {
            // Acquire semaphore permit
            let _permit = THUMBNAIL_SEMAPHORE.acquire().await;

            // Double-check thumbnail doesn't exist (race condition protection)
            if thumbnail_path_clone.exists() {
                return Ok(());
            }

            // Generate thumbnail in blocking thread
            tokio::task::spawn_blocking(move || {
                generate_thumbnail(&original_path_clone, &thumbnail_path_clone, 400)
            })
            .await
            .map_err(|e| AppError::Custom(format!("Task join error: {}", e)))?
            .map(|_| ())
        });

        tasks.push((task, file_hash_clone));
    }

    // Wait for all thumbnail generation tasks to complete
    for (task, file_hash) in tasks {
        match task.await {
            Ok(Ok(_)) => {
                regenerated_count += 1;
            }
            Ok(Err(e)) => {
                eprintln!("Thumbnail generation failed for {}: {}", file_hash, e);
            }
            Err(e) => {
                eprintln!("Thumbnail task panicked for {}: {}", file_hash, e);
            }
        }
    }

    // Emit event to notify frontend if any thumbnails were regenerated
    if regenerated_count > 0 {
        app.emit("thumbnails_regenerated", regenerated_count).ok();
    }

    Ok(())
}

/// Manually run AI tagging on a single file
#[tauri::command]
pub async fn tag_file_with_ai(
    app: AppHandle,
    pool: tauri::State<'_, SqlitePool>,
    file_hash: String,
) -> Result<usize, AppError> {
    // Get file info from database
    let file = sqlx::query_as!(
        FileRecord,
        "SELECT * FROM Files WHERE file_hash = ?",
        file_hash
    )
    .fetch_optional(pool.inner())
    .await?
    .ok_or_else(|| AppError::Custom(format!("File not found: {}", file_hash)))?;

    let file_path = PathBuf::from(&file.original_path);
    if !file_path.exists() {
        return Err(AppError::Custom(format!(
            "Original file not found: {}",
            file.original_path
        )));
    }

    // Run AI tagging
    let tag_count = tag_file_automatically(&app, pool.inner(), &file_hash, &file_path).await?;

    // Emit complete event
    app.emit(
        "ai_tagging_progress",
        ProgressEvent {
            stage: "complete".to_string(),
            message: format!(
                "AI tagging complete for {}: {} tags added",
                file_hash, tag_count
            ),
            file_hash: None,
            current: None,
            total: None,
        },
    )
    .ok();

    Ok(tag_count)
}

/// Manually run AI tagging on multiple files in batch
#[tauri::command]
pub async fn tag_files_batch(
    app: AppHandle,
    pool: tauri::State<'_, SqlitePool>,
    file_hashes: Vec<String>,
) -> Result<usize, AppError> {
    let mut total_tags = 0;
    let mut processed = 0;
    let total = file_hashes.len();

    for file_hash in file_hashes {
        // Get file info from database
        let file_result = sqlx::query_as!(
            FileRecord,
            "SELECT * FROM Files WHERE file_hash = ?",
            file_hash
        )
        .fetch_optional(pool.inner())
        .await?;

        if let Some(file) = file_result {
            let file_path = PathBuf::from(&file.original_path);
            if file_path.exists() {
                // Run AI tagging
                match tag_file_automatically(&app, pool.inner(), &file_hash, &file_path).await {
                    Ok(tag_count) => {
                        total_tags += tag_count;
                        processed += 1;

                        // Emit progress for this file
                        app.emit(
                            "ai_tagging_progress",
                            ProgressEvent {
                                stage: "complete".to_string(),
                                message: format!(
                                    "AI tagging complete for {} ({}/{}): {} tags added",
                                    file_hash, processed, total, tag_count
                                ),
                                file_hash: None,
                                current: Some(processed),
                                total: Some(total),
                            },
                        )
                        .ok();
                    }
                    Err(e) => {
                        eprintln!("AI tagging failed for {}: {}", file_hash, e);
                        // Emit error but continue with other files
                        app.emit(
                            "ai_tagging_progress",
                            ProgressEvent {
                                stage: "error".to_string(),
                                message: format!("AI tagging error for {}: {}", file_hash, e),
                                file_hash: None,
                                current: Some(processed),
                                total: Some(total),
                            },
                        )
                        .ok();
                    }
                }
            } else {
                // Emit skipped event
                app.emit(
                    "ai_tagging_progress",
                    ProgressEvent {
                        stage: "skipped".to_string(),
                        message: format!("Skipped {}: original file not found", file_hash),
                        file_hash: None,
                        current: Some(processed),
                        total: Some(total),
                    },
                )
                .ok();
            }
        } else {
            // Emit skipped event
            app.emit(
                "ai_tagging_progress",
                ProgressEvent {
                    stage: "skipped".to_string(),
                    message: format!("Skipped {}: not found in database", file_hash),
                    file_hash: None,
                    current: Some(processed),
                    total: Some(total),
                },
            )
            .ok();
        }
    }

    // Emit final complete event
    app.emit(
        "ai_tagging_progress",
        ProgressEvent {
            stage: "batch_complete".to_string(),
            message: format!(
                "Batch AI tagging complete: {} files processed, {} total tags added",
                processed, total_tags
            ),
            file_hash: None,
            current: Some(processed),
            total: Some(total),
        },
    )
    .ok();

    Ok(total_tags)
}

/// Test AI model loading and inference
/// Returns model status, inference results, timing, and execution provider info
#[tauri::command]
pub async fn test_ai_model(image_path: String) -> Result<TestModelResult, AppError> {
    use crate::ai::tagger;
    use std::time::Instant;

    let start_time = Instant::now();

    // Get model status
    let model_status = tagger::get_model_status()?;
    let model_check_time = start_time.elapsed();

    // Check if model is available
    if !tagger::is_model_available() {
        let label_map_loaded = model_status.label_map_loaded;
        let model_session_loaded = model_status.model_session_loaded;
        return Ok(TestModelResult {
            success: false,
            model_status,
            model_check_time_ms: model_check_time.as_millis() as u64,
            inference_time_ms: 0,
            execution_provider: "N/A".to_string(),
            predictions: Vec::new(),
            error: Some(format!(
                "Model not available. Label map loaded: {}, Model session loaded: {}",
                label_map_loaded, model_session_loaded
            )),
        });
    }

    // Check if image file exists
    let image_path_buf = PathBuf::from(&image_path);
    if !image_path_buf.exists() {
        return Ok(TestModelResult {
            success: false,
            model_status,
            model_check_time_ms: model_check_time.as_millis() as u64,
            inference_time_ms: 0,
            execution_provider: "N/A".to_string(),
            predictions: Vec::new(),
            error: Some(format!("Image file not found: {}", image_path)),
        });
    }

    // Run inference
    let inference_start = Instant::now();
    let predictions = match tagger::classify_image(&image_path_buf).await {
        Ok(preds) => preds,
        Err(e) => {
            return Ok(TestModelResult {
                success: false,
                model_status,
                model_check_time_ms: model_check_time.as_millis() as u64,
                inference_time_ms: inference_start.elapsed().as_millis() as u64,
                execution_provider: "Unknown".to_string(),
                predictions: Vec::new(),
                error: Some(format!("Inference failed: {}", e)),
            });
        }
    };
    let inference_time = inference_start.elapsed();

    // Try to determine execution provider (this is approximate)
    // ONNX Runtime doesn't directly expose this, so we'll use a placeholder
    let execution_provider = if cfg!(target_os = "macos") {
        "CoreML (likely)"
    } else if cfg!(target_os = "windows") {
        "DirectML (likely)"
    } else if cfg!(target_os = "linux") {
        "CUDA (likely)"
    } else {
        "CPU"
    }
    .to_string();

    Ok(TestModelResult {
        success: true,
        model_status,
        model_check_time_ms: model_check_time.as_millis() as u64,
        inference_time_ms: inference_time.as_millis() as u64,
        execution_provider,
        predictions: predictions
            .iter()
            .map(|p| TagPredictionResult {
                name: p.name.clone(),
                confidence: p.confidence,
            })
            .collect(),
        error: None,
    })
}

#[derive(Debug, Serialize)]
pub struct TestModelResult {
    pub success: bool,
    pub model_status: crate::ai::tagger::ModelStatus,
    pub model_check_time_ms: u64,
    pub inference_time_ms: u64,
    pub execution_provider: String,
    pub predictions: Vec<TagPredictionResult>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TagPredictionResult {
    pub name: String,
    pub confidence: f32,
}

/// Delete a single file from the database and optionally the filesystem
/// This will cascade delete all file_tags associations due to foreign key constraints
#[tauri::command]
pub async fn delete_file(
    app: AppHandle,
    pool: tauri::State<'_, SqlitePool>,
    file_hash: String,
    delete_from_disk: bool,
) -> Result<(), AppError> {
    // Get file info before deletion
    let file = sqlx::query_as!(
        FileRecord,
        "SELECT * FROM Files WHERE file_hash = ?",
        file_hash
    )
    .fetch_optional(pool.inner())
    .await?
    .ok_or_else(|| AppError::Custom(format!("File not found: {}", file_hash)))?;

    // Delete from database (this will cascade delete file_tags associations)
    let result = sqlx::query!(
        "DELETE FROM Files WHERE file_hash = ?",
        file_hash
    )
    .execute(pool.inner())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::Custom(format!("Failed to delete file: {}", file_hash)));
    }

    // Delete thumbnail file if it exists
    let thumbnail_dir = get_thumbnail_dir(&app)?;
    let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file_hash));
    if thumbnail_path.exists() {
        fs::remove_file(&thumbnail_path)?;
    }

    // Optionally delete original file from disk
    if delete_from_disk {
        let original_path = PathBuf::from(&file.original_path);
        if original_path.exists() {
            fs::remove_file(&original_path)?;
        }
    }

    Ok(())
}

/// Delete multiple files in batch
/// Returns the number of successfully deleted files
#[tauri::command]
pub async fn delete_files_batch(
    app: AppHandle,
    pool: tauri::State<'_, SqlitePool>,
    file_hashes: Vec<String>,
    delete_from_disk: bool,
) -> Result<usize, AppError> {
    let mut deleted_count = 0;
    let total = file_hashes.len();

    for (index, file_hash) in file_hashes.iter().enumerate() {
        // Get file info before deletion
        let file = sqlx::query_as!(
            FileRecord,
            "SELECT * FROM Files WHERE file_hash = ?",
            file_hash
        )
        .fetch_optional(pool.inner())
        .await?;

        if let Some(file) = file {
            // Delete from database (this will cascade delete file_tags associations)
            let result = sqlx::query!(
                "DELETE FROM Files WHERE file_hash = ?",
                file_hash
            )
            .execute(pool.inner())
            .await?;

            if result.rows_affected() > 0 {
                deleted_count += 1;

                // Delete thumbnail file if it exists
                let thumbnail_dir = get_thumbnail_dir(&app)?;
                let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file_hash));
                if thumbnail_path.exists() {
                    let _ = fs::remove_file(&thumbnail_path); // Ignore thumbnail deletion errors
                }

                // Optionally delete original file from disk
                if delete_from_disk {
                    let original_path = PathBuf::from(&file.original_path);
                    if original_path.exists() {
                        let _ = fs::remove_file(&original_path); // Ignore file deletion errors
                    }
                }
            }

            // Emit progress for batch deletion
            app.emit(
                "delete_progress",
                ProgressEvent {
                    stage: "deleting".to_string(),
                    message: format!("Deleted {} of {} files", index + 1, total),
                    file_hash: Some(file_hash.clone()),
                    current: Some(index + 1),
                    total: Some(total),
                },
            )
            .ok();
        }
    }

    // Emit complete event
    app.emit(
        "delete_progress",
        ProgressEvent {
            stage: "complete".to_string(),
            message: format!("Batch deletion complete: {} files deleted", deleted_count),
            file_hash: None,
            current: Some(deleted_count),
            total: Some(total),
        },
    )
    .ok();

    Ok(deleted_count)
}
