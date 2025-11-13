use crate::error::AppError;
use blake3::Hasher;
use image::{DynamicImage, GenericImageView};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::fs::{self, File};
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

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
pub fn generate_thumbnail(
    image_path: &Path,
    output_path: &Path,
    thumbnail_size: u32,
) -> Result<(), AppError> {
    eprintln!("  [Thumbnail] Creating output directory...");
    // Create output directory if it doesn't exist
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }

    eprintln!("  [Thumbnail] Loading image...");
    // Load the image
    let img = image::open(image_path)
        .map_err(|e| AppError::Custom(format!("Failed to load image: {}", e)))?;

    eprintln!("  [Thumbnail] Resizing and cropping...");
    // Smart cropping: maintain aspect ratio and center crop
    let thumb = resize_and_crop(&img, thumbnail_size);

    eprintln!("  [Thumbnail] Converting to RGB8...");
    // Convert to RGB8 for WebP encoding
    let rgb_image = thumb.to_rgb8();

    eprintln!("  [Thumbnail] Encoding as WebP...");
    // Encode as WebP (from_rgb returns Encoder directly, not Result)
    let encoder = webp::Encoder::from_rgb(&rgb_image, rgb_image.width(), rgb_image.height());
    let webp_data = encoder.encode(85.0); // Quality 85

    eprintln!("  [Thumbnail] Writing to file...");
    // Write to file
    fs::write(output_path, &*webp_data)?;

    eprintln!("  [Thumbnail] Complete!");
    Ok(())
}

/// Resize and center crop an image to a square
fn resize_and_crop(img: &DynamicImage, size: u32) -> DynamicImage {
    let (width, height) = img.dimensions();

    // Calculate the scaling factor to fit the image into the square
    let scale = if width < height {
        size as f32 / width as f32
    } else {
        size as f32 / height as f32
    };

    let new_width = (width as f32 * scale) as u32;
    let new_height = (height as f32 * scale) as u32;

    // Resize maintaining aspect ratio
    let resized = img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

    // Center crop to square
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

/// Get the thumbnail directory path
pub fn get_thumbnail_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Custom(format!("Failed to get app data dir: {}", e)))?;
    Ok(app_data_dir.join("thumbnails"))
}

/// Automatically tag a file using AI
async fn tag_file_automatically(
    _app: &AppHandle,
    pool: &SqlitePool,
    file_hash: &str,
    file_path: &Path,
) -> Result<(), AppError> {
    use crate::ai::tagger;

    // Run AI classification
    let predictions = tagger::classify_image(file_path).await?;

    // Insert tags into database
    for prediction in predictions {
        // Insert or get tag
        let tag = sqlx::query!(
            r#"
            INSERT INTO Tags (name, type)
            VALUES (?, 'general')
            ON CONFLICT(name) DO UPDATE SET name=name
            RETURNING tag_id
            "#,
            prediction.name
        )
        .fetch_one(pool)
        .await?;

        // Link to file (ignore if already exists)
        sqlx::query!(
            r#"
            INSERT OR IGNORE INTO FileTags (file_hash, tag_id)
            VALUES (?, ?)
            "#,
            file_hash,
            tag.tag_id
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn import_file(
    app: AppHandle,
    path: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<ImportResult, AppError> {
    eprintln!("=== Starting import for: {} ===", path);
    let file_path = PathBuf::from(&path);

    // Emit progress: hashing
    app.emit(
        "import_progress",
        ProgressEvent {
            stage: "hashing".to_string(),
            message: "Calculating file hash...".to_string(),
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

    // Emit progress: thumbnail
    app.emit(
        "import_progress",
        ProgressEvent {
            stage: "thumbnail".to_string(),
            message: "Generating thumbnail...".to_string(),
        },
    )
    .ok();

    // Get image dimensions
    eprintln!("Getting image dimensions...");
    let (width, height) = image::image_dimensions(&file_path)
        .map_err(|e| AppError::Custom(format!("Failed to get image dimensions: {}", e)))?;
    eprintln!("Dimensions: {}x{}", width, height);

    // Generate thumbnail
    eprintln!("Generating thumbnail...");
    let thumbnail_dir = get_thumbnail_dir(&app)?;
    let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file_hash));
    generate_thumbnail(&file_path, &thumbnail_path, 400)?;
    eprintln!("Thumbnail generated: {:?}", thumbnail_path);

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
        },
    )
    .ok();

    // Insert into database
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

    // Emit progress: AI tagging
    app.emit(
        "import_progress",
        ProgressEvent {
            stage: "ai".to_string(),
            message: "Running AI tagging...".to_string(),
        },
    )
    .ok();

    // Trigger AI tagging in background task
    eprintln!("Starting background AI tagging...");
    let app_handle = app.clone();
    let file_hash_clone = file_hash.clone();
    let file_path_clone = file_path.clone();
    let pool_clone = pool.inner().clone();

    tokio::spawn(async move {
        eprintln!("AI tagging task started for {}", file_hash_clone);
        if let Err(e) =
            tag_file_automatically(&app_handle, &pool_clone, &file_hash_clone, &file_path_clone)
                .await
        {
            eprintln!("AI tagging failed for {}: {}", file_hash_clone, e);
        } else {
            eprintln!("AI tagging completed for {}", file_hash_clone);
        }
    });

    eprintln!("=== Import complete for: {} ===", file_hash);
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
    let limit = limit.unwrap_or(100);

    let files = sqlx::query_as!(
        FileRecord,
        r#"
        SELECT file_hash, original_path, file_size_bytes, file_last_modified, width, height,
               date_imported, is_missing
        FROM Files
        WHERE is_missing = 0
        ORDER BY date_imported DESC
        LIMIT ? OFFSET ?
        "#,
        limit,
        offset
    )
    .fetch_all(pool.inner())
    .await?;

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

    // Build dynamic query for AND logic (files that have ALL specified tags)
    let tag_count = tag_ids.len() as i64;
    let placeholders = tag_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    let query = format!(
        r#"
        SELECT f.file_hash, f.original_path, f.file_size_bytes, f.file_last_modified,
               f.width, f.height, f.date_imported, f.is_missing
        FROM Files f
        WHERE f.is_missing = 0 AND f.file_hash IN (
            SELECT file_hash
            FROM FileTags
            WHERE tag_id IN ({})
            GROUP BY file_hash
            HAVING COUNT(DISTINCT tag_id) = ?
        )
        ORDER BY f.date_imported DESC
        "#,
        placeholders
    );

    let mut query_builder = sqlx::query(&query);

    // Bind tag IDs
    for tag_id in &tag_ids {
        query_builder = query_builder.bind(tag_id);
    }

    // Bind tag count for HAVING clause
    query_builder = query_builder.bind(tag_count);

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
pub fn get_thumbnail_url(app: AppHandle, file_hash: String) -> Result<String, AppError> {
    let thumbnail_dir = get_thumbnail_dir(&app)?;
    let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file_hash));

    // Convert absolute path to asset URL
    let url = format!("app-asset://localhost/thumbnails/{}.webp", file_hash);

    Ok(url)
}

/// Regenerate missing thumbnails for all files in the database
/// This is called on app startup to ensure all thumbnails exist
pub async fn regenerate_missing_thumbnails(
    app: &AppHandle,
    pool: &SqlitePool,
) -> Result<(), AppError> {
    eprintln!("=== Checking for missing thumbnails ===");

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

    eprintln!("Found {} files in database", files.len());

    let mut missing_count = 0;
    let mut regenerated_count = 0;

    for file in files {
        let thumbnail_path = thumbnail_dir.join(format!("{}.webp", file.file_hash));

        // Check if thumbnail exists
        if !thumbnail_path.exists() {
            missing_count += 1;
            eprintln!(
                "Missing thumbnail for: {} (hash: {})",
                file.original_path, file.file_hash
            );

            // Check if original file still exists
            let original_path = PathBuf::from(&file.original_path);
            if original_path.exists() {
                // Regenerate thumbnail
                eprintln!("  Regenerating thumbnail...");
                match generate_thumbnail(&original_path, &thumbnail_path, 400) {
                    Ok(_) => {
                        eprintln!("  ✓ Thumbnail regenerated successfully");
                        regenerated_count += 1;
                    }
                    Err(e) => {
                        eprintln!("  ✗ Failed to regenerate thumbnail: {}", e);
                    }
                }
            } else {
                eprintln!("  ✗ Original file not found, marking as missing");
                // Mark file as missing in database
                sqlx::query!(
                    "UPDATE Files SET is_missing = 1 WHERE file_hash = ?",
                    file.file_hash
                )
                .execute(pool)
                .await?;
            }
        }
    }

    eprintln!("=== Thumbnail check complete ===");
    eprintln!(
        "Missing: {}, Regenerated: {}",
        missing_count, regenerated_count
    );

    // Emit event to notify frontend if any thumbnails were regenerated
    if regenerated_count > 0 {
        app.emit("thumbnails_regenerated", regenerated_count).ok();
    }

    Ok(())
}
