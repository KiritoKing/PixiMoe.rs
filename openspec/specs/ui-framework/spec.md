# ui-framework Specification

## Purpose
TBD - created by archiving change init-project-scaffold. Update Purpose after archive.
## Requirements
### Requirement: shadcn/ui Component Library Setup
The system SHALL integrate shadcn/ui component library with Tailwind CSS for building accessible UI components.

#### Scenario: shadcn/ui initialization succeeds
- **WHEN** developer runs `pnpm dlx shadcn@latest init`
- **AND** selects default TypeScript style
- **AND** confirms Tailwind CSS configuration
- **THEN** `components.json` is created in project root
- **AND** `src/lib/utils.ts` is created with `cn()` utility function
- **AND** Tailwind CSS config is updated with shadcn theme variables
- **AND** `globals.css` contains CSS variable definitions for theme colors

#### Scenario: Components can be added on-demand
- **WHEN** developer runs `pnpm dlx shadcn@latest add button`
- **THEN** `src/components/ui/button.tsx` is created
- **AND** component uses Radix UI primitives internally
- **AND** component imports work without additional configuration
- **AND** component respects dark/light theme variables

#### Scenario: Essential components are available
- **WHEN** project initialization completes
- **THEN** the following components are added:
  - `button`: Primary action component
  - `dialog`: Modal dialog for confirmations
  - `select`: Dropdown selection component
  - `input`: Form input fields
  - `card`: Content container component
- **AND** all components are importable from `@/components/ui/`

### Requirement: Tailwind CSS Configuration
The system SHALL configure Tailwind CSS with proper content paths and theme customization.

#### Scenario: Tailwind processes all source files
- **WHEN** Tailwind CSS is compiled
- **THEN** content paths include `src/**/*.{ts,tsx}` patterns
- **AND** utility classes from components are detected
- **AND** unused classes are purged from production builds
- **AND** final CSS bundle is minimized

#### Scenario: Theme variables are consistent
- **WHEN** application runs in light mode
- **THEN** CSS variables for primary, secondary, accent colors are applied
- **WHEN** application runs in dark mode
- **THEN** dark mode color variants are applied automatically
- **AND** all shadcn/ui components adapt to theme changes

### Requirement: React State Management
The system SHALL implement dual state management with Zustand (UI state) and TanStack Query (server state).

#### Scenario: Zustand manages UI state
- **WHEN** application initializes
- **THEN** Zustand store is created for global UI state
- **AND** store tracks at minimum: `isSidebarOpen`, `currentTheme`, `indexingProgress`
- **AND** components can access and update state via hooks
- **AND** state changes trigger React re-renders

#### Scenario: TanStack Query manages server state
- **WHEN** `src/main.tsx` renders
- **THEN** `QueryClientProvider` wraps the application root
- **AND** QueryClient is configured with appropriate defaults:
  - `staleTime`: 5 minutes
  - `cacheTime`: 10 minutes
  - `refetchOnWindowFocus`: false (desktop app context)
- **AND** custom hooks like `useTags()` can be created to wrap Tauri commands

### Requirement: Query Persistence
The system SHALL persist TanStack Query cache across application restarts using tauri-plugin-store.

#### Scenario: Custom persister is created
- **WHEN** developer implements Persister adapter
- **THEN** adapter implements `persistClient()` to save cache to Tauri Store
- **AND** adapter implements `restoreClient()` to load cache from Tauri Store
- **AND** adapter implements `removeClient()` to clear stored cache
- **AND** adapter serializes/deserializes query cache correctly

#### Scenario: Cache survives application restart
- **WHEN** user fetches data via TanStack Query
- **AND** data is cached in memory
- **AND** application closes normally
- **THEN** query cache is persisted to disk via tauri-plugin-store
- **WHEN** application restarts
- **THEN** persisted cache is loaded automatically
- **AND** UI displays cached data instantly
- **AND** background refetching happens according to `staleTime` configuration

#### Scenario: PersistQueryClientProvider is used
- **WHEN** `src/main.tsx` is implemented
- **THEN** `PersistQueryClientProvider` replaces standard `QueryClientProvider`
- **AND** custom Persister is passed via `persistOptions` prop
- **AND** `buster` string is set to `"v1"` for cache versioning
- **AND** `maxAge` matches TanStack Query's `cacheTime` (10 minutes)

### Requirement: Tauri Store Plugin Integration
The system SHALL install and configure tauri-plugin-store for persistent key-value storage.

#### Scenario: Tauri Store is available in Rust
- **WHEN** `src-tauri/Cargo.toml` is configured
- **THEN** `tauri-plugin-store` dependency is added
- **AND** plugin is registered in `tauri::Builder` in `main.rs`
- **AND** default store file is created in AppDataDir

#### Scenario: Tauri Store is available in TypeScript
- **WHEN** frontend imports `@tauri-apps/plugin-store`
- **THEN** `Store` class is available for use
- **AND** `Store.get()`, `Store.set()`, `Store.save()` methods work correctly
- **AND** store persists data between application restarts

### Requirement: Component Type Safety
The system SHALL ensure all UI components and Tauri invocations are fully type-safe.

#### Scenario: Tauri commands have TypeScript types
- **WHEN** developer creates typed wrapper for Tauri commands in `src/lib/tauri.ts`
- **THEN** all `invoke()` calls have explicit return types
- **AND** TypeScript compiler catches mismatched types
- **AND** IntelliSense provides parameter hints

#### Scenario: Component props are validated
- **WHEN** developer uses shadcn/ui components
- **THEN** TypeScript validates all prop types
- **AND** invalid prop combinations are caught at compile time
- **AND** React DevTools shows correct prop types

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

