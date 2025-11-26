## MODIFIED Requirements

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

