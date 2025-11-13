// Module declarations
pub mod db;
pub mod error;
pub mod commands;
pub mod ai;
pub mod protocols;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file in development mode
    #[cfg(debug_assertions)]
    {
        if let Err(e) = dotenvy::dotenv() {
            eprintln!("Warning: Could not load .env file: {}", e);
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            
            // Initialize database connection pool
            tauri::async_runtime::block_on(async move {
                let pool = db::init_pool(app_data_dir).await
                    .expect("Failed to initialize database pool");
                
                // Run migrations
                db::run_migrations(&pool).await
                    .expect("Failed to run database migrations");
                
                // Store pool in app state
                app.manage(pool);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
