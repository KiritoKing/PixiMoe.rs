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
/// URL format:
/// - app-asset://localhost/thumbnails/{hash}.webp
/// - app-asset://localhost/originals/{hash}
pub async fn handle_asset_protocol(
	app: &AppHandle,
	request: &Request<Vec<u8>>,
) -> Result<Response<Vec<u8>>, Box<dyn std::error::Error>> {
	let uri = request.uri();
	eprintln!("📥 Protocol request URI: {uri}");

	let path = uri.path();
	eprintln!("📂 Parsed path: '{path}'");

	// Handle thumbnails
	if path.starts_with("/thumbnails/") {
		return handle_thumbnail_request(app, path);
	}

	// Handle original images
	if path.starts_with("/originals/") {
		return handle_original_request(app, path).await;
	}

	eprintln!("❌ Path doesn't match any known pattern");
	Ok(Response::builder()
		.status(StatusCode::NOT_FOUND)
		.body(b"Not found".to_vec())?)
}

/// Handle thumbnail requests
fn handle_thumbnail_request(
	app: &AppHandle,
	path: &str,
) -> Result<Response<Vec<u8>>, Box<dyn std::error::Error>> {
	let file_name = path.trim_start_matches("/thumbnails/");
	eprintln!("📄 Extracted filename: '{file_name}'");

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
	eprintln!("📍 Looking for file at: {thumbnail_path:?}");

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

/// Handle original image requests
async fn handle_original_request(
	app: &AppHandle,
	path: &str,
) -> Result<Response<Vec<u8>>, Box<dyn std::error::Error>> {
	let file_hash = path.trim_start_matches("/originals/");
	eprintln!("📄 Requesting original image with hash: '{file_hash}'");

	// Validate hash format (should be 64 hex characters)
	if file_hash.len() != 64 || !file_hash.chars().all(|c| c.is_ascii_hexdigit()) {
		eprintln!("❌ Invalid hash format");
		return Ok(Response::builder()
			.status(StatusCode::BAD_REQUEST)
			.body(b"Invalid hash format".to_vec())?);
	}

	// Get pool from app state
	let pool = app.state::<sqlx::SqlitePool>();

	let file_record: Option<(String,)> =
		sqlx::query_as("SELECT original_path FROM Files WHERE file_hash = ?")
			.bind(file_hash)
			.fetch_optional(pool.inner())
			.await?;

	let Some((original_path,)) = file_record else {
		eprintln!("❌ File not found in database");
		return Ok(Response::builder()
			.status(StatusCode::NOT_FOUND)
			.body(b"File not found".to_vec())?);
	};

	eprintln!("📍 Original file path: {original_path:?}");

	// Check if file exists
	let original_path = std::path::Path::new(&original_path);
	if !original_path.exists() {
		eprintln!("❌ Original file not found on disk");
		return Ok(Response::builder()
			.status(StatusCode::NOT_FOUND)
			.body(b"Original file not found".to_vec())?);
	}

	// Read file
	let file_content = std::fs::read(original_path)?;
	eprintln!(
		"✅ Successfully read original file, size: {} bytes",
		file_content.len()
	);

	// Determine MIME type from file extension
	let mime_type = match original_path.extension().and_then(|s| s.to_str()) {
		Some("jpg") | Some("jpeg") => "image/jpeg",
		Some("png") => "image/png",
		Some("gif") => "image/gif",
		Some("webp") => "image/webp",
		Some("bmp") => "image/bmp",
		_ => "application/octet-stream",
	};

	// Return response with cache headers
	Ok(Response::builder()
		.status(StatusCode::OK)
		.header(CONTENT_TYPE, mime_type)
		.header(CACHE_CONTROL, "public, max-age=3600")
		.body(file_content)?)
}
