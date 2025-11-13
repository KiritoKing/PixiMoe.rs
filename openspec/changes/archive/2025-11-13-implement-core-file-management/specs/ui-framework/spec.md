## ADDED Requirements

### Requirement: Image Grid Display Component
The system SHALL provide a responsive grid component for displaying image thumbnails.

#### Scenario: Image grid renders all files
- **WHEN** `ImageGrid` component mounts
- **THEN** `useFiles()` hook fetches all file records from backend
- **AND** loading skeleton placeholders are displayed during fetch
- **AND** CSS Grid layout renders images in responsive columns (auto-fill, min 200px)
- **AND** each image displays thumbnail via `<img src="app-asset://thumbnails/{hash}.webp">`
- **AND** thumbnails load instantly from WebView cache (after first load)

#### Scenario: Image cards show metadata on hover
- **WHEN** user hovers over image card
- **THEN** overlay appears with semi-transparent background
- **AND** file name is displayed (extracted from original_path)
- **AND** tag count is displayed (e.g., "12 tags")
- **AND** hover effect is smooth with CSS transition

#### Scenario: Empty state is handled
- **WHEN** no files exist in database
- **THEN** grid displays centered empty state message: "No images yet"
- **AND** "Import Files" call-to-action button is displayed
- **AND** clicking button opens ImportDialog

### Requirement: Tag Filter Panel Component
The system SHALL provide a sidebar component for filtering files by tags.

#### Scenario: Tag list is displayed with counts
- **WHEN** `TagFilterPanel` component mounts
- **THEN** `useTags()` hook fetches all tags from backend
- **AND** tags are grouped by type (General, Character, Artist, Series)
- **AND** each tag displays name and file count badge
- **AND** tags within each group are sorted alphabetically

#### Scenario: Tags can be selected for filtering
- **WHEN** user clicks tag checkbox
- **THEN** tag ID is added to Zustand store's `selectedTags` array
- **AND** `useSearchFiles(selectedTags)` hook triggers automatically
- **AND** ImageGrid re-renders with filtered results
- **AND** multiple tags can be selected (AND logic)
- **AND** checkbox state persists across re-renders

#### Scenario: Filters can be cleared
- **WHEN** user clicks "Clear Filters" button
- **THEN** all selected tags are removed from Zustand store
- **AND** ImageGrid displays all files again
- **AND** all checkboxes are unchecked visually

### Requirement: File Import Dialog Component
The system SHALL provide a modal dialog for importing files with progress feedback.

#### Scenario: File picker dialog opens
- **WHEN** user clicks "Import Files" button in toolbar
- **THEN** shadcn/ui Dialog component opens
- **AND** Tauri file picker API is invoked with filters: ["*.jpg", "*.png", "*.webp"]
- **AND** multi-select is enabled (user can select multiple files)
- **WHEN** user cancels file picker
- **THEN** dialog closes without action

#### Scenario: Import progress is displayed
- **WHEN** user selects files and confirms
- **THEN** `useImportFiles()` mutation is called for each file sequentially
- **AND** progress bar shows current stage (hashing → thumbnail → AI → saving)
- **AND** current file number and total count are displayed (e.g., "2 / 5")
- **AND** percentage progress is calculated and displayed
- **AND** UI remains responsive during import

#### Scenario: Import events update progress
- **WHEN** backend emits `import_progress` event
- **THEN** frontend event listener receives event with { file_hash, stage }
- **AND** progress bar updates to show current stage name
- **AND** stage indicator animates to next step
- **AND** Zustand store tracks progress state

#### Scenario: Import completion is shown
- **WHEN** all files finish importing
- **THEN** success message is displayed: "Imported X files"
- **AND** `files` and `tags` queries are invalidated via TanStack Query
- **AND** ImageGrid automatically refetches and shows new images
- **AND** dialog shows "Close" button to dismiss

#### Scenario: Duplicate files are reported
- **WHEN** imported file has `is_duplicate: true` in response
- **THEN** info message is shown: "File already exists (skipped)"
- **AND** file counter does not increment for duplicates
- **AND** import continues with next file

#### Scenario: Import errors are handled
- **WHEN** import command returns error (e.g., unsupported format)
- **THEN** error message is displayed with file name and reason
- **AND** user can choose to continue or abort batch import
- **AND** successfully imported files remain in database (no rollback)

### Requirement: Main Application Layout
The system SHALL organize UI components in a cohesive application layout.

#### Scenario: Layout structure is implemented
- **WHEN** application loads
- **THEN** main container uses flexbox layout
- **AND** TagFilterPanel is positioned on left (250px width, collapsible)
- **AND** ImageGrid occupies remaining right space (flex-grow: 1)
- **AND** top toolbar spans full width with import button and view controls
- **AND** layout is responsive (sidebar collapses to bottom sheet on mobile)

#### Scenario: Demo code is removed
- **WHEN** `src/App.tsx` is refactored
- **THEN** `greet` command invocation is deleted
- **AND** demo input fields and button are removed
- **AND** only production UI components remain (grid, filter, import)

### Requirement: Type-Safe Frontend-Backend Integration
The system SHALL ensure all Tauri invocations are fully type-safe.

#### Scenario: TypeScript types match Rust structs
- **WHEN** `src/types/index.ts` is defined
- **THEN** `FileRecord` interface matches Rust `Files` table structure
- **AND** `Tag` interface matches Rust `Tags` table structure
- **AND** `ImportResult` interface matches Rust command response
- **AND** all field names and types are identical (snake_case preserved)

#### Scenario: Custom hooks wrap invoke calls
- **WHEN** `useFiles()` hook is implemented
- **THEN** `invoke<FileRecord[]>('get_all_files')` has explicit return type
- **AND** TypeScript compiler validates return type matches expected interface
- **AND** IntelliSense provides autocomplete for fields (file_hash, original_path, etc.)
- **WHEN** type mismatch occurs
- **THEN** compilation fails with clear error message

### Requirement: Query State Persistence
The system SHALL persist query cache across application restarts for instant loading.

#### Scenario: Files query is persisted
- **WHEN** user views image grid and closes application
- **THEN** `files` query cache is saved to Tauri Store via custom Persister
- **WHEN** user reopens application
- **THEN** persisted cache is loaded immediately
- **AND** ImageGrid displays thumbnails instantly without backend call
- **AND** background refetch occurs according to `staleTime` (5 minutes)

#### Scenario: Tags query is persisted
- **WHEN** tags are fetched and cached
- **AND** application restarts
- **THEN** TagFilterPanel displays tag list instantly from persisted cache
- **AND** file counts may be stale initially (acceptable UX trade-off)
- **AND** background refetch updates counts within seconds

### Requirement: Responsive Design
The system SHALL adapt UI layout to different screen sizes.

#### Scenario: Desktop layout is optimized
- **WHEN** viewport width is ≥ 1024px
- **THEN** TagFilterPanel is visible as permanent sidebar
- **AND** ImageGrid uses 4-6 columns depending on container width
- **AND** hover effects work with mouse interaction

#### Scenario: Mobile layout is optimized
- **WHEN** viewport width is < 768px
- **THEN** TagFilterPanel collapses to bottom sheet (opened via button)
- **AND** ImageGrid uses 2-3 columns for smaller screens
- **AND** touch gestures work for scrolling and selecting
- **AND** import button is prominent in bottom navigation bar
