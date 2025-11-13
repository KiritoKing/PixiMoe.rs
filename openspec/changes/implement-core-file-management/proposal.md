# Change: Implement Core File Management and AI Tagging

## Why
The application currently has only scaffolding infrastructure without any functional capabilities. Users cannot import images, view them, or benefit from AI-powered tagging. This change implements the foundational MVP features required for a working image gallery application:
- File import with content-addressable storage (BLAKE3 hashing)
- Automatic deduplication based on file content
- WebP thumbnail generation for fast UI rendering
- AI-powered automatic tagging using ONNX models
- Basic tag management CRUD operations
- Thumbnail serving infrastructure (completes unfinished protocol handler from init-project-scaffold)

Without these features, the application cannot fulfill its core purpose as an AI-powered image gallery.

## What Changes
### Backend (Rust/Tauri)
- **File Import Pipeline**: Implement `import_file` command with BLAKE3 hashing, image dimension extraction, database insertion, and automatic deduplication detection
- **Thumbnail Generation**: Create WebP thumbnails (400x400px) with content-addressed filenames in AppDataDir
- **Thumbnail Protocol**: Complete unfinished `app-asset://` custom protocol handler with permanent cache headers (from init-project-scaffold task 8.2-8.5)
- **Tag Commands**: Implement `get_all_tags`, `get_file_tags`, `add_tag_to_file`, `remove_tag_from_file`, `search_files_by_tags`
- **File Query Commands**: Implement `get_all_files`, `get_file_by_hash` for browsing
- **AI Tagging**: Integrate SmilingWolf/swin-v2-tagger-v3 ONNX model for automatic image classification
- **AI Pipeline**: Implement async tagging with progress events emitted to frontend
- **Dependencies**: Add `blake3`, `webp` crates to Cargo.toml

### Frontend (React/TypeScript)
- **Image Grid UI**: Create responsive grid component to display thumbnails with lazy loading
- **Tag Filter Panel**: Implement sidebar with tag list and filtering capabilities
- **Import Flow**: Add file picker dialog and import button with progress indicator
- **Custom Hooks**: Create `useFiles()`, `useTags()`, `useImportFiles()` with TanStack Query
- **Type Definitions**: Define TypeScript types for File, Tag, and Tauri command responses
- **State Management**: Track import progress and UI state (selected tags, view mode) in Zustand store

## Impact
- **Affected specs**:
  - `database-infrastructure` - Added file and tag query requirements
  - `ai-runtime` - Added image tagging pipeline requirements  
  - `ui-framework` - Added image browsing and filtering UI requirements
  - `build-system` - Added new Rust dependencies

- **Affected code**:
  - New Rust modules: `src-tauri/src/commands/{files.rs, tags.rs}`, `src-tauri/src/ai/tagger.rs`, `src-tauri/src/protocols/mod.rs`
  - Modified: `src-tauri/src/main.rs` (register commands and protocol)
  - Modified: `src-tauri/Cargo.toml` (add blake3, webp dependencies)
  - New React components: `src/components/ImageGrid.tsx`, `src/components/TagFilterPanel.tsx`, `src/components/ImportDialog.tsx`
  - Modified: `src/App.tsx` (replace greet demo with main UI)
  - New hooks: `src/lib/hooks/{useFiles.ts, useTags.ts, useImportFiles.ts}`
  - New types: `src/types/index.ts`

- **Breaking changes**: None (removes demo `greet` command which is not used in production)

- **Migration path**: N/A (new features only)

## Dependencies
- Requires completed `init-project-scaffold` infrastructure (database, UI framework, state management) ✅
- Requires ONNX model file `models/swin-v2-tagger-v3.onnx` (~100MB) downloaded from Hugging Face (documented in models/README.md)

## Success Criteria
- User can import image files (JPG/PNG/WebP) through UI file picker
- System calculates BLAKE3 hash and stores file metadata in database
- Duplicate files (same hash) are detected and skipped automatically
- Thumbnails are generated as 400x400px WebP files in AppDataDir
- Thumbnails load instantly via `app-asset://` protocol with permanent cache headers
- AI tagging runs automatically after import and tags are stored in database
- User can view all imported images in responsive grid layout
- User can filter images by selecting tags from sidebar
- Tag operations (add/remove) work through UI and update database
- Import progress is displayed in real-time via event streaming
