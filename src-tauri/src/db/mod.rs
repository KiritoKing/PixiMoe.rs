use sqlx::{
	sqlite::{SqliteConnectOptions, SqlitePoolOptions},
	SqlitePool,
};
use std::env;
use std::path::{Path, PathBuf};
use std::str::FromStr;

/// Initialize SQLite connection pool
/// Automatically creates database if it doesn't exist or is corrupted
pub async fn init_pool(app_data_dir: PathBuf) -> Result<SqlitePool, sqlx::Error> {
	// Determine database path
	let db_path = if let Ok(url) = env::var("DATABASE_URL") {
		// Parse DATABASE_URL
		if url.starts_with("sqlite:") {
			let path_str = url.trim_start_matches("sqlite:");
			let path = Path::new(path_str);

			if path.is_absolute() {
				path.to_path_buf()
			} else {
				// Relative path: resolve against src-tauri directory (where .env is)
				if let Ok(manifest_dir) = env::var("CARGO_MANIFEST_DIR") {
					// In dev mode, resolve relative to CARGO_MANIFEST_DIR (src-tauri)
					PathBuf::from(manifest_dir).join(path)
				} else {
					// Fallback to current dir
					env::current_dir()
						.map(|cwd| cwd.join(path))
						.unwrap_or_else(|_| path.to_path_buf())
				}
			}
		} else {
			// Invalid format, use default
			app_data_dir.join("album.db")
		}
	} else {
		// No DATABASE_URL: use app data directory
		app_data_dir.join("album.db")
	};

	// Normalize the path (resolve .. and . components)
	let db_path = db_path.canonicalize().unwrap_or_else(|_| {
		// If canonicalize fails (e.g., path doesn't exist yet),
		// resolve manually by joining and normalizing
		let mut normalized = PathBuf::new();
		for component in db_path.components() {
			match component {
				std::path::Component::ParentDir => {
					normalized.pop();
				}
				std::path::Component::CurDir => {
					// Skip current directory
				}
				_ => {
					normalized.push(component);
				}
			}
		}
		normalized
	});

	// Ensure parent directory exists
	if let Some(parent) = db_path.parent() {
		std::fs::create_dir_all(parent).map_err(|e| {
			eprintln!("Failed to create directory {:?}: {}", parent, e);
			sqlx::Error::Io(e)
		})?;
	}

	eprintln!("Database path: {:?}", db_path);

	// Use SqliteConnectOptions to explicitly enable create mode
	let connect_options =
		SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.display()))
			.map_err(|e| {
				eprintln!("Failed to parse database URL: {}", e);
				sqlx::Error::Configuration(e.into())
			})?
			.create_if_missing(true);

	let database_url = format!("sqlite://{}", db_path.display());
	eprintln!("Connecting to database: {}", database_url);

	// Try to connect to database
	let pool_result = SqlitePoolOptions::new()
		.max_connections(5)
		.connect_with(connect_options.clone())
		.await;

	// If connection failed and database file exists, it might be corrupted
	// Try to verify and recreate if necessary
	let pool = match pool_result {
		Ok(pool) => {
			// Connection successful, verify database is valid by running a simple query
			match sqlx::query("SELECT 1").execute(&pool).await {
				Ok(_) => {
					eprintln!("Database connection verified successfully");
					pool
				}
				Err(e) => {
					eprintln!(
						"Database connection exists but query failed (possibly corrupted): {}",
						e
					);
					// Close the pool before deleting the file
					pool.close().await;

					// Delete corrupted database file
					if db_path.exists() {
						eprintln!("Removing corrupted database file: {:?}", db_path);
						if let Err(rm_err) = std::fs::remove_file(&db_path) {
							eprintln!(
								"Warning: Failed to remove corrupted database file: {}",
								rm_err
							);
						}
					}

					// Retry connection (will create new database)
					eprintln!("Creating new database...");
					let retry_options =
						SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.display()))
							.map_err(|e| sqlx::Error::Configuration(e.into()))?
							.create_if_missing(true);
					SqlitePoolOptions::new()
						.max_connections(5)
						.connect_with(retry_options)
						.await
						.map_err(|e| {
							eprintln!("Failed to create new database: {}", e);
							e
						})?
				}
			}
		}
		Err(e) => {
			// Connection failed - check if file exists and might be corrupted
			if db_path.exists() {
				eprintln!(
					"Database file exists but connection failed (possibly corrupted): {}",
					e
				);
				eprintln!("Removing corrupted database file: {:?}", db_path);
				if let Err(rm_err) = std::fs::remove_file(&db_path) {
					eprintln!(
						"Warning: Failed to remove corrupted database file: {}",
						rm_err
					);
				}
			} else {
				eprintln!("Database file does not exist, will be created automatically");
			}

			// Retry connection (will create new database if file doesn't exist)
			eprintln!("Connecting to database (will create if needed)...");
			let retry_options =
				SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.display()))
					.map_err(|e| sqlx::Error::Configuration(e.into()))?
					.create_if_missing(true);
			SqlitePoolOptions::new()
				.max_connections(5)
				.connect_with(retry_options)
				.await
				.map_err(|e| {
					eprintln!("Failed to connect to database: {}", e);
					e
				})?
		}
	};

	Ok(pool)
}

/// Run pending database migrations
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
	sqlx::migrate!("../migrations").run(pool).await?;

	Ok(())
}
