# ui-components Specification

## Purpose
提供具体的UI组件实现，包括图片网格、标签面板、导入对话框、图片查看器、标签管理UI、通知系统等用户交互组件。

## Requirements
### Requirement: Image Grid Display Component
The system SHALL provide a responsive grid component for displaying image thumbnails with selection support and virtual scrolling for performance optimization.

#### Scenario: Image grid renders all files with virtual scrolling
- **WHEN** `ImageGrid` component mounts
- **THEN** `useFiles()` hook fetches all file records from backend (no pagination limit)
- **AND** loading skeleton placeholders are displayed during fetch
- **AND** TanStack Virtual's `useVirtualizer` is configured for virtual scrolling
- **AND** only visible image cards are rendered to DOM (typically < 50 items)
- **AND** virtual scroll container uses absolute positioning for grid layout
- **AND** responsive columns (2-6 columns) are maintained through calculated row/column positions
- **AND** each visible image displays thumbnail via `<img src="app-asset://thumbnails/{hash}.webp">`
- **AND** thumbnails load instantly from WebView cache (after first load)
- **AND** scrolling is smooth (60fps) even with 1000+ images

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

#### Scenario: Images can be clicked to open lightbox
- **WHEN** user clicks image thumbnail
- **THEN** lightbox viewer opens showing full-resolution image
- **AND** lightbox displays metadata and tags
- **AND** user can navigate to adjacent images without closing lightbox

#### Scenario: Images can be selected for batch operations
- **WHEN** user Ctrl+Click (Cmd+Click on Mac) on image card
- **THEN** image is marked as selected with visual indicator (blue border, checkmark overlay)
- **AND** image is added to selection state array
- **WHEN** user Shift+Click on image
- **THEN** all images between last selected and clicked image are selected
- **AND** batch tag editor toolbar appears when 2+ images selected
- **WHEN** user clicks selected image again
- **THEN** image is deselected and removed from selection array

#### Scenario: Virtual scrolling handles dynamic item sizes
- **WHEN** image cards have different aspect ratios or sizes
- **THEN** `useVirtualizer` uses `measureElement` to dynamically measure actual card heights
- **AND** virtual scroll container adjusts total height based on measured sizes
- **AND** scrolling remains smooth without visual jumps
- **AND** `estimateSize` provides reasonable initial estimate (e.g., 200px for square cards)

#### Scenario: Virtual scrolling works with tag filtering
- **WHEN** user selects tags to filter images
- **THEN** `useSearchFiles` returns filtered file list
- **AND** virtual scroll container updates to show only filtered images
- **AND** virtual scrolling continues to work correctly with filtered results
- **AND** scroll position is maintained or reset appropriately

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
The system SHALL provide a modal dialog for importing files with progress feedback and tagging options.

#### Scenario: File picker dialog opens
- **WHEN** user clicks "Import Files" button in toolbar
- **THEN** shadcn/ui Dialog component opens
- **AND** Tauri file picker API is invoked with filters: ["*.jpg", "*.png", "*.webp"]
- **AND** multi-select is enabled (user can select multiple files)
- **WHEN** user cancels file picker
- **THEN** dialog closes without action

#### Scenario: Tag input is available before import
- **WHEN** files are selected for import
- **THEN** tag input field is displayed in dialog
- **AND** autocomplete suggests existing tags
- **AND** user can add multiple tags as chips
- **AND** tags will be applied to all imported files

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

#### Scenario: Import completion is shown via toast
- **WHEN** all files finish importing
- **THEN** success toast notification is displayed: "Imported X files"
- **AND** if tags were specified: "Applied Y tags to X files"
- **AND** `files` and `tags` queries are invalidated via TanStack Query
- **AND** ImageGrid automatically refetches and shows new images
- **AND** dialog closes automatically

#### Scenario: Duplicate files are reported
- **WHEN** imported file has `is_duplicate: true` in response
- **THEN** info toast is shown: "Y duplicates skipped"
- **AND** file counter does not increment for duplicates
- **AND** import continues with next file

#### Scenario: Import errors are handled
- **WHEN** import command returns error (e.g., unsupported format)
- **THEN** error toast notification is displayed with file name and reason
- **AND** import continues with next file (no abort)
- **AND** successfully imported files remain in database (no rollback)

### Requirement: Image Lightbox Viewer
The system SHALL provide a modal viewer for displaying full-resolution images with navigation.

#### Scenario: Lightbox opens on image click
- **WHEN** user clicks image thumbnail in ImageGrid
- **THEN** lightbox modal opens in fullscreen overlay
- **AND** original image loads at full resolution from `original_path`
- **AND** image is centered and scaled to fit viewport
- **AND** black semi-transparent backdrop dims background content
- **AND** close button (X) is visible in top-right corner

#### Scenario: Image metadata is displayed
- **WHEN** lightbox is open
- **THEN** sidebar or overlay shows:
  - File name
  - Dimensions (width × height)
  - File size
  - Date imported
  - List of associated tags (clickable)
- **AND** metadata is scrollable if list is long

#### Scenario: Navigation between images
- **WHEN** lightbox is open
- **THEN** left/right arrow buttons are visible
- **AND** clicking right arrow loads next image in current grid order
- **AND** clicking left arrow loads previous image
- **AND** keyboard arrows (←/→) work for navigation
- **AND** first/last image disables appropriate arrow
- **WHEN** user presses Escape key
- **THEN** lightbox closes and returns to grid view

#### Scenario: Loading states are handled
- **WHEN** full-resolution image is loading
- **THEN** thumbnail is shown as placeholder
- **AND** loading spinner is displayed over placeholder
- **AND** image fades in smoothly when loaded
- **WHEN** image fails to load (missing file)
- **THEN** error message is shown: "File not found"
- **AND** user can navigate to next/previous image

### Requirement: Manual Tag Management UI
The system SHALL provide interface for users to add, remove, and batch-apply tags to images.

#### Scenario: Tag input is available in lightbox
- **WHEN** lightbox viewer is open
- **THEN** tag input field is displayed in metadata sidebar
- **AND** autocomplete dropdown suggests existing tags as user types
- **AND** pressing Enter or clicking suggestion adds tag to file
- **AND** new tag names can be created on-the-fly
- **AND** added tags appear immediately in tag list

#### Scenario: Tags can be removed
- **WHEN** user clicks X button next to tag in lightbox
- **THEN** tag is removed from file-tag association
- **AND** tag remains in Tags table (not deleted)
- **AND** tag list updates immediately
- **AND** mutation is sent to backend via `remove_tag_from_file()` command

#### Scenario: Tag type is selectable
- **WHEN** user creates new tag
- **THEN** dropdown allows selection of type: General, Character, Artist, Series
- **AND** type defaults to "General" if not specified
- **AND** type is stored in Tags table on creation

#### Scenario: Batch tag editing is available
- **WHEN** user selects multiple images in grid (Ctrl/Cmd+Click or Shift+Click)
- **THEN** batch tag editor toolbar appears at top
- **AND** tag input field allows adding tags to all selected images
- **AND** common tags across selection are displayed
- **AND** "Add Tags" button applies input tags to all selected files
- **WHEN** user clicks "Clear Selection"
- **THEN** selection is reset and toolbar disappears

#### Scenario: Batch tag removal is supported
- **WHEN** multiple images are selected
- **AND** batch editor shows list of common tags
- **THEN** user can click X to remove tag from all selected files
- **AND** confirmation prompt asks: "Remove tag from X files?"
- **AND** bulk removal is executed as single transaction

#### Scenario: Batch AI tagging is available
- **WHEN** user selects multiple images in grid
- **THEN** batch editor toolbar shows "Run AI Tagging" button
- **WHEN** user clicks "Run AI Tagging" button
- **THEN** confirmation dialog shows: "Run AI tagging on X selected files?"
- **AND** dialog warns: "This will add AI-generated tags (existing tags will be kept)"
- **WHEN** user confirms
- **THEN** AI tagging task is triggered for each selected file via `tag_files_batch()` command
- **AND** progress notification appears showing "AI tagging X files..."
- **AND** per-file progress is tracked and displayed in notification center
- **AND** success toast shows: "AI tagging complete: X files tagged"

#### Scenario: Single file AI tagging is available
- **WHEN** lightbox viewer is open
- **THEN** "Run AI Tagging" button is visible in metadata sidebar
- **WHEN** user clicks button
- **THEN** button shows loading state
- **AND** AI tagging runs for current file
- **AND** new tags appear in tag list once complete
- **AND** button becomes disabled with text "Already Tagged" if AI tags exist

### Requirement: Import-Time Tag Application
The system SHALL allow users to apply tags during the import workflow.

#### Scenario: Tag input in import dialog
- **WHEN** import dialog is open and files are selected
- **THEN** tag input field is displayed above file list
- **AND** autocomplete suggests existing tags
- **AND** user can add multiple tags before starting import
- **AND** tags are displayed as chips/badges below input

#### Scenario: Tags are applied during import
- **WHEN** user clicks "Start Import" with tags specified
- **THEN** each imported file is automatically tagged with specified tags
- **AND** tags are inserted into database after file record creation
- **AND** AI-generated tags are added separately (not replaced)
- **AND** import success toast shows: "Imported X files with Y tags"

#### Scenario: Tags can be edited before import
- **WHEN** tags are added to import dialog
- **THEN** user can remove tags by clicking X on chip
- **AND** user can add more tags before starting import
- **AND** tag list is cleared after import completes

### Requirement: Toast Notification System
The system SHALL provide a non-blocking toast notification system for immediate feedback on user actions.

#### Scenario: Toast notifications are displayed
- **WHEN** a background operation completes (import, AI tagging, etc.)
- **THEN** a toast notification appears at bottom-right corner
- **AND** notification shows icon (success/error/info), title, and brief message
- **AND** notification auto-dismisses after 3-5 seconds
- **AND** multiple notifications stack vertically without overlapping
- **AND** user can manually dismiss notification by clicking close button

#### Scenario: Toast shows brief summaries
- **WHEN** import completes successfully
- **THEN** success toast displays: "Imported X files" instead of `alert()`
- **WHEN** import encounters duplicate files
- **THEN** info toast displays: "Y duplicates skipped"
- **WHEN** import fails with error
- **THEN** error toast displays brief error message
- **AND** user can continue working without dismissing modal

#### Scenario: Toast links to notification center
- **WHEN** toast notification is shown
- **THEN** notification is also saved to persistent notification center
- **AND** toast shows "View Details" link that opens notification center
- **AND** user can click to see full message details
- **AND** toast position does not obscure main content area

### Requirement: Persistent Notification Center
The system SHALL provide a notification center to store and display all system notifications with full details.

#### Scenario: Notification center is accessible
- **WHEN** user clicks bell icon in top toolbar
- **THEN** notification center panel opens as right sidebar or dropdown
- **AND** panel displays all notifications in reverse chronological order (newest first)
- **AND** panel shows unread count badge on bell icon
- **AND** panel is scrollable to view history

#### Scenario: Notifications are categorized by type
- **WHEN** notification center is open
- **THEN** notifications are grouped by type (Success, Error, Info, Warning)
- **AND** each notification shows icon, timestamp, title, and full message
- **AND** user can filter by type (All, Errors, Success, etc.)
- **AND** each notification shows detailed information (file names, error stack traces, etc.)

#### Scenario: Notifications persist across sessions
- **WHEN** application closes and reopens
- **THEN** notification history is preserved (last 100 notifications)
- **AND** unread count is restored from Tauri Store
- **AND** old notifications (>7 days) are automatically cleaned up

#### Scenario: Notifications can be marked as read
- **WHEN** user opens notification center
- **THEN** all visible notifications are automatically marked as read
- **AND** unread badge count decreases to 0
- **WHEN** user clicks specific notification
- **THEN** notification expands to show full details
- **AND** notification is marked as read

#### Scenario: Notifications can be cleared
- **WHEN** user clicks "Clear All" button in notification center
- **THEN** confirmation dialog asks: "Clear all notifications?"
- **AND** upon confirmation, all notifications are deleted from storage
- **AND** notification center shows empty state: "No notifications"
- **WHEN** user clicks individual notification's delete button
- **THEN** specific notification is removed from list

#### Scenario: Critical errors are persistent
- **WHEN** import fails with critical error (e.g., database corruption)
- **THEN** error notification is marked as "pinned"
- **AND** pinned notifications remain at top of list
- **AND** pinned notifications are not auto-cleared
- **AND** user must manually dismiss pinned notifications

#### Scenario: Notification details are comprehensive
- **WHEN** batch import completes
- **THEN** notification includes:
  - Total files selected
  - Successfully imported count
  - Duplicate count
  - Failed count (with list of failed file names)
  - Tags applied (if any)
- **WHEN** user clicks notification
- **THEN** expandable section shows detailed breakdown
- **AND** failed files show individual error messages

### Requirement: Component Migration to shadcn/ui
The system SHALL replace all custom UI components with shadcn/ui equivalents for consistency and accessibility.

#### Scenario: ImportButton uses shadcn components
- **WHEN** ImportButton component is refactored
- **THEN** native button is replaced with shadcn Button component
- **AND** progress stats popover uses shadcn Popover component
- **AND** progress bars use shadcn Progress component
- **AND** all dark: Tailwind classes are removed (rely on CSS variables)

#### Scenario: ImageCard uses shadcn Card
- **WHEN** ImageCard component is refactored
- **THEN** container div is replaced with shadcn Card component
- **AND** loading state uses shadcn Skeleton component
- **AND** error state displays within CardContent
- **AND** all inline background/border styles use theme CSS variables

#### Scenario: ImageGrid uses shadcn Skeleton
- **WHEN** ImageGrid component is refactored
- **THEN** loading placeholder divs are replaced with shadcn Skeleton components
- **AND** empty state uses proper typography with muted-foreground color
- **AND** grid container uses responsive CSS Grid without hard-coded dark: classes

#### Scenario: TagInput uses shadcn components
- **WHEN** TagInput component is refactored
- **THEN** native input is replaced with shadcn Input component
- **AND** tag badges use shadcn Badge component with variants
- **AND** autocomplete dropdown uses shadcn Popover or Combobox

#### Scenario: TagFilterPanel uses shadcn components
- **WHEN** TagFilterPanel component is refactored
- **THEN** sidebar container uses shadcn ScrollArea for overflow handling
- **AND** tag badges use shadcn Badge with secondary variant
- **AND** section headers use proper typography components
- **AND** checkboxes use shadcn Checkbox (if needed) or native with proper styling

#### Scenario: ImageViewer uses shadcn Dialog
- **WHEN** ImageViewer component is refactored
- **THEN** modal overlay is replaced with shadcn Dialog component
- **AND** close button uses shadcn Button with ghost variant
- **AND** dialog content follows shadcn DialogContent patterns
- **AND** dialog respects theme without custom dark mode classes

