use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::env;
use std::path::{Path, PathBuf};

/// Initialize SQLite connection pool
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

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| {
                eprintln!("Failed to create directory {:?}: {}", parent, e);
                sqlx::Error::Io(e)
            })?;
    }

    let database_url = format!("sqlite:{}", db_path.display());
    eprintln!("Connecting to database: {}", database_url);

    // Connect to database
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .map_err(|e| {
            eprintln!("Failed to connect to database at '{}': {}", database_url, e);
            e
        })?;

    eprintln!("Successfully connected to database");
    Ok(pool)
}

/// Run pending database migrations
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::migrate!("../migrations")
        .run(pool)
        .await?;

    Ok(())
}
