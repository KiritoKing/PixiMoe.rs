use tauri::{
    http::{header::*, Request, Response, StatusCode},
    AppHandle, Manager,
};

/// Register the app-asset:// protocol for serving thumbnails
pub fn register_protocols(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Allow the thumbnails directory to be accessed
    let app_data_dir = app.path().app_data_dir()?;
    let thumbnail_dir = app_data_dir.join("thumbnails");

    // Create thumbnails directory if it doesn't exist
    std::fs::create_dir_all(&thumbnail_dir)?;

    Ok(())
}

/// Handle app-asset:// protocol requests
/// URL format: app-asset://localhost/thumbnails/{hash}.webp
pub fn handle_asset_protocol(
    app: &AppHandle,
    request: &Request<Vec<u8>>,
) -> Result<Response<Vec<u8>>, Box<dyn std::error::Error>> {
    let uri = request.uri();
    eprintln!("📥 Protocol request URI: {}", uri);

    let path = uri.path();
    eprintln!("📂 Parsed path: '{}'", path);

    // Parse URL: expected format is /thumbnails/{hash}.webp
    if !path.starts_with("/thumbnails/") {
        eprintln!("❌ Path doesn't start with /thumbnails/");
        return Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(b"Not found".to_vec())?);
    }

    let file_name = path.trim_start_matches("/thumbnails/");
    eprintln!("📄 Extracted filename: '{}'", file_name);

    // Validate hash format (should be 64 hex characters + .webp)
    if !file_name.ends_with(".webp") {
        eprintln!("❌ File doesn't end with .webp");
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(b"Invalid file format".to_vec())?);
    }

    let hash_part = file_name.trim_end_matches(".webp");
    eprintln!("🔑 Hash part: '{}' (len: {})", hash_part, hash_part.len());

    if hash_part.len() != 64 || !hash_part.chars().all(|c| c.is_ascii_hexdigit()) {
        eprintln!("❌ Invalid hash format");
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(b"Invalid hash format".to_vec())?);
    }

    // Get thumbnail path
    let app_data_dir = app.path().app_data_dir()?;
    let thumbnail_path = app_data_dir.join("thumbnails").join(file_name);
    eprintln!("📍 Looking for file at: {:?}", thumbnail_path);

    // Check if file exists
    if !thumbnail_path.exists() {
        eprintln!("❌ File not found on disk");
        return Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(b"Thumbnail not found".to_vec())?);
    }

    // Read file
    let file_content = std::fs::read(&thumbnail_path)?;
    eprintln!(
        "✅ Successfully read file, size: {} bytes",
        file_content.len()
    );

    // Return response with permanent cache headers
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "image/webp")
        .header(CACHE_CONTROL, "public, max-age=31536000, immutable")
        .body(file_content)?)
}
