# Implementation Tasks

## 1. Backend: Multi-threaded Thumbnail Generation
- [x] 1.1 Refactor `generate_thumbnail()` to return `Result<PathBuf, AppError>` instead of `Result<(), AppError>`
- [x] 1.2 Wrap `generate_thumbnail()` call in `tokio::task::spawn_blocking` within `import_file()`
- [x] 1.3 Move thumbnail generation after database insert (currently before)
- [x] 1.4 Add `thumbnail_progress` event emissions (generating, complete, error)
- [x] 1.5 Update `regenerate_missing_thumbnails()` to use thread pool for parallel generation
- [ ] 1.6 Test concurrent thumbnail generation with batch import (10+ files)

## 2. Backend: Complete AI Tagger Implementation
- [x] 2.1 Implement CSV label map loading from `models/selected_tags.csv`
- [x] 2.2 Parse CSV with columns: tag_id, name, category, post_count
- [x] 2.3 Cache label map in static `Lazy<HashMap<usize, String>>`
- [x] 2.4 Implement image preprocessing: resize to 448x448, normalize to [0.0, 1.0], RGB format
- [x] 2.5 Implement ONNX model loading from `models/swin-v2-tagger-v3.onnx` with lazy initialization
- [x] 2.6 Implement inference execution using loaded model session
- [x] 2.7 Implement postprocessing: filter by threshold (0.35), exclude 'meta' tags, top 50 tags
- [x] 2.8 Replace stub `classify_image()` with full implementation returning real predictions
- [x] 2.9 Implement `is_model_available()` to check if model and CSV files exist
- [x] 2.10 Add error handling for missing model files with clear instructions
- [ ] 2.11 Test tagger with sample images and verify tag quality
- [ ] 2.12 Test performance: measure inference time on CPU and GPU

## 2.5. Backend: Separate AI Tagging Progress
- [x] 2.5.1 Create new event type `ai_tagging_progress` distinct from `import_progress`
- [x] 2.5.2 Remove AI tagging stage from `import_progress` events
- [x] 2.5.3 Update `tag_file_automatically()` to emit `ai_tagging_progress` events:
  - Stage: "classifying" (before inference)
  - Stage: "saving_tags" (before database insert)
  - Stage: "complete" (with tag_count)
  - Stage: "error" (with message)
- [x] 2.5.4 Ensure `import_file()` returns immediately after file insert (before AI completes)
- [ ] 2.5.5 Test progress events with slow CPU inference (~1s per file)

## 2.6. Backend: Manual AI Tagging Commands
- [x] 2.6.1 Implement `tag_file_with_ai(file_hash)` Tauri command
- [x] 2.6.2 Implement `tag_files_batch(file_hashes[])` Tauri command for batch AI tagging
- [x] 2.6.3 Ensure commands emit `ai_tagging_progress` events with file_hash
- [x] 2.6.4 Handle missing files gracefully (emit "skipped" event, continue with others)
- [x] 2.6.5 Implement duplicate tag detection (INSERT OR IGNORE for existing tags)
- [x] 2.6.6 Return tag count showing only newly added tags (not duplicates)
- [ ] 2.6.7 Test batch AI tagging with 20+ files including some with existing tags

## 3. Backend: User Tag Management Commands
- [x] 3.1 Implement `add_tag_to_file(file_hash, tag_name, tag_type?)` Tauri command
- [x] 3.2 Implement `remove_tag_from_file(file_hash, tag_id)` Tauri command
- [x] 3.3 Implement `add_tags_to_files(file_hashes[], tag_names[], tag_type?)` batch command
- [x] 3.4 Implement `remove_tag_from_files(file_hashes[], tag_id)` batch command
- [x] 3.5 Implement `create_tag(name, type)` command with validation
- [x] 3.6 Implement `search_tags(prefix, limit?)` command with LIKE query and file counts
- [ ] 3.7 Add unit tests for tag management commands (edge cases: duplicates, missing files)

## 4. Backend: Import-Time Tag Association
- [x] 4.1 Add optional `tag_names` parameter to `import_file()` command signature
- [x] 4.2 Implement tag lookup/creation and association logic after file insert
- [ ] 4.3 Return applied tag_ids in ImportResult struct
- [x] 4.4 Update AI tagging to not conflict with user-applied tags (additive)
- [ ] 4.5 Test import with tags on duplicate files (should skip but not error)

## 5. Frontend: Toast Notification System
- [x] 5.1 Install/create Toast component (using react-hot-toast)
- [x] 5.2 Create `useToast()` hook for programmatic toast invocation (using react-hot-toast API)
- [x] 5.3 Add ToastProvider to App.tsx root
- [x] 5.4 Replace all `alert()` calls in ImportButton.tsx with toast notifications
- [ ] 5.5 Add "View Details" link in toasts that opens notification center
- [x] 5.6 Style toasts to match application theme (dark mode support)
- [ ] 5.7 Test toast stacking with multiple simultaneous notifications

## 5.5. Frontend: Persistent Notification Center
- [ ] 5.5.1 Create `NotificationCenter.tsx` component with right sidebar/dropdown UI
- [ ] 5.5.2 Create notification data model (id, type, title, message, details, timestamp, read, pinned)
- [ ] 5.5.3 Implement `useNotifications()` hook to manage notification state with Zustand
- [ ] 5.5.4 Persist notifications to Tauri Store (last 100, auto-cleanup >7 days)
- [ ] 5.5.5 Add bell icon to top toolbar with unread count badge
- [ ] 5.5.6 Implement type filtering (All, Errors, Success, Info, Warning)
- [ ] 5.5.7 Add "Mark as Read" functionality (auto-mark on open, manual mark per item)
- [ ] 5.5.8 Add "Clear All" with confirmation dialog
- [ ] 5.5.9 Add expandable details section for each notification
- [ ] 5.5.10 Add pinned notification support for critical errors
- [ ] 5.5.11 Style notification center to match application theme
- [ ] 5.5.12 Test notification persistence across app restarts

## 6. Frontend: Image Lightbox Viewer
- [ ] 6.1 Create `ImageViewer.tsx` component with Dialog/Modal from shadcn/ui
- [ ] 6.2 Add click handler to ImageCard in ImageGrid.tsx to open lightbox
- [ ] 6.3 Implement full-resolution image loading from `original_path`
- [ ] 6.4 Add metadata sidebar showing file details and tags
- [ ] 6.5 Implement left/right navigation with arrow buttons and keyboard shortcuts
- [ ] 6.6 Add close functionality (X button, Escape key, backdrop click)
- [ ] 6.7 Add loading/error states for missing or corrupted files
- [ ] 6.8 Test keyboard navigation and accessibility (focus trap, ARIA labels)

## 7. Frontend: Manual Tag Management UI
- [ ] 7.1 Create `TagInput.tsx` component with autocomplete dropdown
- [ ] 7.2 Implement `useAddTag()` and `useRemoveTag()` mutation hooks
- [ ] 7.3 Implement `useSearchTags(prefix)` query hook for autocomplete
- [ ] 7.4 Add tag input to ImageViewer metadata sidebar
- [ ] 7.5 Add tag removal (X button) functionality in tag list
- [ ] 7.6 Implement tag type selection dropdown for new tags
- [ ] 7.7 Invalidate tag/file queries after tag mutations
- [ ] 7.8 Test tag input with special characters and long names

## 8. Frontend: Batch Tag Editing
- [ ] 8.1 Add selection state to ImageGrid component (Ctrl/Cmd+Click, Shift+Click)
- [ ] 8.2 Create visual selection indicator (border, checkmark overlay)
- [ ] 8.3 Create `BatchTagEditor.tsx` toolbar component
- [ ] 8.4 Show common tags across selected files
- [ ] 8.5 Implement `useBatchAddTags()` and `useBatchRemoveTags()` mutation hooks
- [ ] 8.6 Add confirmation dialog for batch tag removal
- [ ] 8.7 Implement "Clear Selection" functionality
- [ ] 8.8 Test batch operations with large selections (100+ files)

## 8.5. Frontend: Manual AI Tagging UI
- [ ] 8.5.1 Add "Run AI Tagging" button to BatchTagEditor toolbar
- [ ] 8.5.2 Implement `useRunAITagging(file_hash)` and `useBatchAITagging(file_hashes[])` mutation hooks
- [ ] 8.5.3 Add confirmation dialog for batch AI tagging with warning about keeping existing tags
- [ ] 8.5.4 Add "Run AI Tagging" button to ImageViewer sidebar
- [ ] 8.5.5 Implement loading state for AI tagging button in lightbox
- [ ] 8.5.6 Disable "Run AI Tagging" button if file already has AI-generated tags (check tag source)
- [ ] 8.5.7 Listen for `ai_tagging_progress` events and update UI progress indicators
- [ ] 8.5.8 Show per-file AI tagging progress in notification center for batch operations
- [ ] 8.5.9 Test manual AI tagging on single file and batch selections (10+ files)

## 9. Frontend: Import-Time Tagging
- [ ] 9.1 Add tag input field to ImportButton dialog
- [ ] 9.2 Display selected tags as removable chips/badges
- [ ] 9.3 Update `useImportFiles()` hook to accept `tagNames` parameter
- [ ] 9.4 Pass tag names to backend `import_file()` command
- [ ] 9.5 Show applied tags in success toast notification
- [ ] 9.6 Clear tag input after import completes
- [ ] 9.7 Test import with tags on batch imports (20+ files)

## 10. Frontend: Progress Tracking Improvements
- [x] 10.1 Update progress state to track `import_progress`, `thumbnail_progress`, and `ai_tagging_progress` separately
- [x] 10.2 Create separate progress indicators for each stage in ImportButton
- [ ] 10.3 Add per-file progress tracking for batch imports (show list of files with individual statuses)
- [x] 10.4 Listen for `thumbnail_progress` and `ai_tagging_progress` events
- [x] 10.5 Update progress display to show "Import complete, AI tagging in progress..." after import returns
- [ ] 10.6 Test progress display with slow network/CPU conditions

## 11. Testing and Validation
- [ ] 11.1 Validate all scenarios in spec deltas manually
- [ ] 11.2 Test AI tagger with various image types (anime, cosplay, photos)
- [ ] 11.3 Verify AI tag quality and threshold (adjust 0.35 if needed)
- [ ] 11.4 Test on macOS, Windows, and Linux (if possible)
- [ ] 11.5 Test with large batches (100+ files) to verify performance
- [ ] 11.6 Test error cases: missing files, corrupted images, invalid tags, missing model files
- [ ] 11.7 Verify dark mode styling for all new components
- [ ] 11.8 Test keyboard navigation and accessibility for lightbox and tag input
- [ ] 11.9 Run `openspec validate improve-import-ux-and-tagging --strict`

## 12. Documentation and Cleanup
- [ ] 12.1 Update README.md with new features (if applicable)
- [ ] 12.2 Add JSDoc comments to new hooks and components
- [ ] 12.3 Add Rust doc comments to new Tauri commands
- [ ] 12.4 Remove debug logging (eprintln!) from production code paths
- [ ] 12.5 Update TODO.md to clear completed Round1 items

## Dependencies and Parallelization Notes
- **Task 2 (AI Tagger) is CRITICAL**: Must be completed first as it's currently a stub. All AI-related features depend on this.
- Tasks 1, 3-4 (other backend) can be developed in parallel with Task 2
- Task 2.5 (AI progress events) depends on Task 2 (tagger implementation) being complete
- Task 2.6 (manual AI tagging commands) depends on Tasks 2 and 2.5 being complete
- Tasks 5-10 (frontend) can start in parallel with backend, but AI-related UI (Task 8.5) requires Task 2.6
- Task 5 (toast system) and 5.5 (notification center) are foundational and should be completed early
- Task 5.5 (notification center) can be developed in parallel with task 5 (toast), but toasts should link to center
- Task 6 (lightbox) is independent and can be done in parallel with tasks 7-9
- Task 7 (manual tagging) depends on task 3 (backend commands) being complete
- Tasks 8-9 depend on task 7 (manual tagging) being functional
- Task 8.5 (manual AI tagging UI) depends on task 2.6 (backend AI commands) being complete
- Task 10 depends on tasks 1, 2.5 (backend progress events) being complete
- Task 11 should be done after all implementation tasks are complete
