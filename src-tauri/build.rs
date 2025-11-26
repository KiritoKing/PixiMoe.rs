fn main() {
    // Enable sqlx offline mode to use pre-generated query metadata
    // This allows compilation without a database connection
    std::env::set_var("SQLX_OFFLINE", "true");
    
    tauri_build::build()
}
