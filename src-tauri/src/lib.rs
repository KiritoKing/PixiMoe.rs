// Module declarations
pub mod ai;
pub mod commands;
pub mod db;
pub mod error;
pub mod protocols;

use tauri::Manager;

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
		.plugin(tauri_plugin_dialog::init())
		.register_asynchronous_uri_scheme_protocol("app-asset", |app, request, responder| {
			eprintln!("🔔 app-asset protocol handler triggered");
			let app_handle = app.app_handle().clone();
			let request = request.clone();
			tauri::async_runtime::spawn(async move {
				match protocols::handle_asset_protocol(&app_handle, &request).await {
					Ok(response) => {
						eprintln!("✅ Sending response with status: {:?}", response.status());
						responder.respond(response)
					}
					Err(e) => {
						eprintln!("❌ Protocol error: {}", e);
						responder.respond(
							tauri::http::Response::builder()
								.status(500)
								.body(b"Internal server error".to_vec())
								.unwrap(),
						)
					}
				}
			});
		})
		.setup(|app| {
			// Register protocol handlers first
			protocols::register_protocols(app)?;

			// Get app data directory
			let app_data_dir = app
				.path()
				.app_data_dir()
				.expect("Failed to get app data directory");

			// Initialize database connection pool
			let app_handle = app.app_handle().clone();
			let app_handle_for_thumbnails = app.app_handle().clone();
			tauri::async_runtime::block_on(async move {
				let pool = db::init_pool(app_data_dir)
					.await
					.expect("Failed to initialize database pool");

				// Run migrations
				db::run_migrations(&pool)
					.await
					.expect("Failed to run database migrations");

				// Regenerate missing thumbnails in background
				let pool_clone = pool.clone();
				tokio::spawn(async move {
					if let Err(e) = commands::files::regenerate_missing_thumbnails(
						&app_handle_for_thumbnails,
						&pool_clone,
					)
					.await
					{
						eprintln!("Failed to regenerate missing thumbnails: {}", e);
					}
				});

				// Store pool in app state
				app_handle.manage(pool);
			});

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			// File commands
			commands::files::import_file,
			commands::files::get_all_files,
			commands::files::get_file_by_hash,
			commands::files::search_files_by_tags,
			commands::files::get_thumbnail_url,
			commands::files::tag_file_with_ai,
			commands::files::tag_files_batch,
			commands::files::test_ai_model,
			commands::files::delete_file,
			commands::files::delete_files_batch,
			// Tag commands
			commands::tags::get_all_tags,
			commands::tags::get_file_tags,
			commands::tags::add_tag_to_file,
			commands::tags::add_tags_to_files,
			commands::tags::remove_tag_from_file,
			commands::tags::remove_tag_from_files,
			commands::tags::create_tag,
			commands::tags::search_tags,
			// Admin commands
			commands::admin::clear_database,
			commands::admin::get_database_stats,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
