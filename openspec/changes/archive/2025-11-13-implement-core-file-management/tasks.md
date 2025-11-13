## 1. Add Dependencies
- [x] 1.1 Add `blake3` crate to `src-tauri/Cargo.toml`
- [x] 1.2 Add `webp` crate to `src-tauri/Cargo.toml` for thumbnail encoding
- [x] 1.3 Add `once_cell` crate for lazy static model initialization
- [x] 1.4 Verify all dependencies compile: `cargo check`

## 2. Implement File Hashing
- [x] 2.1 Create `src-tauri/src/commands/files.rs::calculate_blake3_hash()` function
- [x] 2.2 Implement buffered file reading (8KB chunks) for memory efficiency
- [x] 2.3 Add unit test for hash calculation with known test file
- [x] 2.4 Handle file I/O errors gracefully with `AppError` mapping

## 3. Implement Thumbnail Generation
- [x] 3.1 Create `src-tauri/src/commands/files.rs::generate_thumbnail()` function
- [x] 3.2 Load image using `image` crate with format auto-detection
- [x] 3.3 Implement smart cropping: resize to 400x400px maintaining aspect ratio, center crop
- [x] 3.4 Encode as WebP with quality=85
- [x] 3.5 Save to `{AppDataDir}/thumbnails/{file_hash}.webp`
- [x] 3.6 Create thumbnails directory if not exists
- [x] 3.7 Add error handling for unsupported image formats

## 4. Implement File Import Command
- [x] 4.1 Create `#[tauri::command] import_file()` in `src-tauri/src/commands/files.rs`
- [x] 4.2 Extract image dimensions using `image::image_dimensions()`
- [x] 4.3 Calculate BLAKE3 hash of file content
- [x] 4.4 Query database to check if hash already exists (deduplication)
- [x] 4.5 If duplicate, return early with `{ is_duplicate: true }`
- [x] 4.6 If new, generate thumbnail in background task
- [x] 4.7 Emit progress events: `import_progress` with stages (hashing, thumbnail, ai, saving)
- [x] 4.8 Insert file record into `Files` table with metadata
- [x] 4.9 Trigger AI tagging pipeline (async, don't block return)
- [x] 4.10 Return `ImportResult { file_hash, is_duplicate: false }`

## 5. Complete Thumbnail Protocol Handler
- [x] 5.1 Implement `app-asset://` custom protocol in `src-tauri/src/protocols/mod.rs`
- [x] 5.2 Parse URL format: `app-asset://thumbnails/{hash}.webp`
- [x] 5.3 Validate hash format (64 hex characters) to prevent directory traversal
- [x] 5.4 Read file from `{AppDataDir}/thumbnails/{hash}.webp`
- [x] 5.5 Return 404 response if file not found
- [x] 5.6 Set response headers: `Cache-Control: public, max-age=31536000, immutable`
- [x] 5.7 Set `Content-Type: image/webp`
- [x] 5.8 Register protocol handler in `main.rs` setup hook
- [x] 5.9 Configure Tauri CSP to allow `app-asset://` protocol

## 6. Implement AI Tagging Module
- [x] 6.1 Create `src-tauri/src/ai/tagger.rs::load_model()` with lazy initialization
- [x] 6.2 Load ONNX model from `models/swin-v2-tagger-v3.onnx` or bundled resources
- [x] 6.3 Implement `preprocess_image()`: resize to 224x224, normalize to [0, 1], convert to RGB
- [x] 6.4 Implement `classify_image()` function with `tokio::task::spawn_blocking`
- [x] 6.5 Run ONNX inference and extract output tensor
- [x] 6.6 Load label map (tag names) from accompanying JSON/CSV file
- [x] 6.7 Filter predictions by confidence threshold (0.35)
- [x] 6.8 Exclude tags with type 'meta'
- [x] 6.9 Limit to top 50 tags per image
- [x] 6.10 Return `Vec<(String, f32)>` (tag name, confidence)
- [x] 6.11 Handle missing model file gracefully with clear error message

## 7. Integrate AI Tagging into Import Pipeline
- [x] 7.1 Create `tag_file_automatically()` helper function
- [x] 7.2 Call `classify_image()` after thumbnail generation
- [x] 7.3 For each tag returned by AI:
  - Query `Tags` table for existing tag by name
  - If not exists, insert new tag with type inferred from name prefix
  - Insert into `FileTags` junction table (file_hash, tag_id)
- [x] 7.4 Wrap AI operations in `tokio::spawn` to avoid blocking command response
- [x] 7.5 Emit progress event when AI tagging completes
- [x] 7.6 Log AI inference duration for performance monitoring

## 8. Implement Tag Query Commands
- [x] 8.1 Create `#[tauri::command] get_all_tags()` in `src-tauri/src/commands/tags.rs`
- [x] 8.2 Query `Tags` table with order by name ASC
- [x] 8.3 Return `Vec<Tag>` with id, name, type, file_count (via JOIN with FileTags)
- [x] 8.4 Create `#[tauri::command] get_file_tags(file_hash: String)`
- [x] 8.5 Query FileTags JOIN Tags WHERE file_hash = ?
- [x] 8.6 Return `Vec<Tag>` for specific file

## 9. Implement Tag Management Commands
- [x] 9.1 Create `#[tauri::command] add_tag_to_file(file_hash: String, tag_name: String)`
- [x] 9.2 Insert or get tag_id from `Tags` table (upsert logic)
- [x] 9.3 Insert into `FileTags` if not exists (ignore duplicate key error)
- [x] 9.4 Create `#[tauri::command] remove_tag_from_file(file_hash: String, tag_id: i32)`
- [x] 9.5 Delete from `FileTags` WHERE file_hash = ? AND tag_id = ?
- [x] 9.6 Return success/error status

## 10. Implement File Query Commands
- [x] 10.1 Create `#[tauri::command] get_all_files()` in `src-tauri/src/commands/files.rs`
- [x] 10.2 Query `Files` table ordered by date_imported DESC
- [x] 10.3 Support pagination: offset and limit parameters
- [x] 10.4 Return `Vec<FileRecord>` with all metadata
- [x] 10.5 Create `#[tauri::command] get_file_by_hash(file_hash: String)`
- [x] 10.6 Query single file with LEFT JOIN to get tags
- [x] 10.7 Return `Option<FileWithTags>`

## 11. Implement Search Command
- [x] 11.1 Create `#[tauri::command] search_files_by_tags(tag_ids: Vec<i32>)`
- [x] 11.2 Build dynamic SQL query with multiple JOINs for AND logic
- [x] 11.3 Query files that have ALL specified tags (intersection)
- [x] 11.4 Order by date_imported DESC
- [x] 11.5 Return `Vec<FileRecord>`
- [x] 11.6 Handle empty tag_ids (return all files)

## 12. Register Commands in main.rs
- [x] 12.1 Remove demo `greet` command from invoke_handler
- [x] 12.2 Add file commands: `import_file`, `get_all_files`, `get_file_by_hash`, `search_files_by_tags`
- [x] 12.3 Add tag commands: `get_all_tags`, `get_file_tags`, `add_tag_to_file`, `remove_tag_from_file`
- [x] 12.4 Verify all commands are registered in `generate_handler![]` macro
- [x] 12.5 Test compilation: `cargo build`

## 13. Frontend Type Definitions
- [x] 13.1 Create `src/types/index.ts` with TypeScript interfaces
- [x] 13.2 Define `FileRecord` interface matching Rust struct
- [x] 13.3 Define `Tag` interface with id, name, type, file_count
- [x] 13.4 Define `ImportResult` and `ProgressEvent` types
- [x] 13.5 Export all types from index

## 14. Frontend Custom Hooks
- [x] 14.1 Create `src/lib/hooks/useFiles.ts` with `useQuery` for get_all_files
- [x] 14.2 Implement staleTime: 5 minutes, cacheTime: 10 minutes
- [x] 14.3 Create `src/lib/hooks/useTags.ts` with `useQuery` for get_all_tags
- [x] 14.4 Create `src/lib/hooks/useImportFiles.ts` with `useMutation`
- [x] 14.5 Implement `onSuccess` to invalidate files and tags queries
- [x] 14.6 Create `src/lib/hooks/useSearchFiles.ts` with dynamic query based on selected tags
- [x] 14.7 Export all hooks from `src/lib/hooks/index.ts`

## 15. Image Grid Component
- [x] 15.1 Create `src/components/ImageGrid.tsx` functional component
- [x] 15.2 Use `useFiles()` hook to fetch file data
- [x] 15.3 Implement responsive CSS Grid layout (auto-fill columns, 200px min width)
- [x] 15.4 Render image cards with thumbnail via `app-asset://thumbnails/{hash}.webp`
- [x] 15.5 Add loading skeleton placeholders during fetch
- [x] 15.6 Handle empty state with "No images yet" message and import CTA
- [x] 15.7 Implement lazy loading with IntersectionObserver (optional for v1.0)
- [x] 15.8 Show file name and tag count on hover overlay

## 16. Tag Filter Panel Component
- [x] 16.1 Create `src/components/TagFilterPanel.tsx` sidebar component
- [x] 16.2 Use `useTags()` hook to fetch all tags
- [x] 16.3 Render tag list with checkboxes for selection
- [x] 16.4 Group tags by type (general, character, artist, series)
- [x] 16.5 Implement multi-select with Zustand store for selected tag IDs
- [x] 16.6 Show file count badge next to each tag
- [x] 16.7 Add "Clear filters" button
- [x] 16.8 Connect filter state to `useSearchFiles()` hook

## 17. Import Dialog Component
- [x] 17.1 Create `src/components/ImportButton.tsx` using shadcn/ui Dialog
- [x] 17.2 Add "Import Files" button in main toolbar
- [x] 17.3 Integrate Tauri `open` dialog API for file picker (multi-select)
- [x] 17.4 Call `useImportFiles()` mutation for each selected file
- [x] 17.5 Display progress bar with stages (hashing, thumbnail, AI tagging)
- [x] 17.6 Listen to `import_progress` events and update UI
- [x] 17.7 Show success message with imported file count
- [x] 17.8 Handle and display errors (duplicate, unsupported format)

## 18. Main App Layout
- [x] 18.1 Modify `src/App.tsx` to remove greet demo code
- [x] 18.2 Implement main layout: TagFilterPanel (left) + ImageGrid (right)
- [x] 18.3 Add top toolbar with ImportDialog trigger and view controls
- [x] 18.4 Add dark/light theme toggle (using existing theme state)
- [x] 18.5 Ensure responsive layout with mobile considerations
- [x] 18.6 Test full import-to-display workflow in dev mode

## 19. Model Setup Documentation
- [x] 19.1 Update `src-tauri/models/README.md` with download instructions
- [x] 19.2 Document model source: Hugging Face (SmilingWolf/wd-swinv2-tagger-v3)
- [x] 19.3 Provide direct download link or HuggingFace CLI command
- [x] 19.4 Document expected file size (~100MB) and format (.onnx)
- [x] 19.5 Add accompanying label file (tags.csv) download instructions
- [x] 19.6 Document placement: `src-tauri/models/swin-v2-tagger-v3.onnx`

## 20. Bug Fixes and Improvements (Post-Initial Implementation)
- [x] 20.1 Fix database connection path resolution for development mode
- [x] 20.2 Add Tauri dialog plugin permissions to capabilities/default.json
- [x] 20.3 Configure CSP in tauri.conf.json for app-asset:// protocol
- [x] 20.4 Add detailed logging to import_file and generate_thumbnail functions
- [x] 20.5 Fix WebP encoding: convert to RGB8 before encoding to prevent black thumbnails
- [x] 20.6 Enable assetProtocol in tauri.conf.json
- [x] 20.7 Use convertFileSrc() API for proper custom protocol URL handling
- [x] 20.8 Implement regenerate_missing_thumbnails() background task
- [x] 20.9 Add thumbnails_regenerated event emission after regeneration
- [x] 20.10 Frontend: Listen for thumbnails_regenerated event and invalidate queries

## 21. Testing and Validation
- [ ] 21.1 Manual test: Import single JPG image
- [ ] 21.2 Verify file record in database: `sqlite3 album.db "SELECT * FROM Files"`
- [ ] 21.3 Verify thumbnail file exists and displays correctly
- [ ] 21.4 Verify tags created: `sqlite3 album.db "SELECT * FROM Tags"` (when model available)
- [ ] 21.5 Manual test: Import duplicate file → verify "already exists" message
- [ ] 21.6 Manual test: Filter by tag → verify grid updates
- [ ] 21.7 Manual test: Add/remove tag via UI
- [ ] 21.8 Performance test: Import 50 images, measure total time
- [ ] 21.9 Browser DevTools: Verify thumbnails load from cache on subsequent views
- [ ] 21.10 Test thumbnail auto-regeneration on app restart
- [ ] 21.11 Run `openspec validate implement-core-file-management --strict`
