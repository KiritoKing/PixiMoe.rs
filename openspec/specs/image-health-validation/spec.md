# image-health-validation Specification

## Purpose
TBD - created by archiving change validate-image-health. Update Purpose after archive.
## Requirements
### Requirement: Original File Health Check
The system SHALL validate original file existence and integrity during startup thumbnail regeneration.

#### Scenario: Original file validation during thumbnail regeneration
- **WHEN** `regenerate_missing_thumbnails()` processes each file during startup
- **THEN** original file existence is verified using `std::path::Path::exists()`
- **AND** file corruption is detected by attempting to read image headers with `image` crate
- **AND** missing/corrupted files update existing `is_missing` field with enhanced status
- **AND** corrupted thumbnails are regenerated following existing thumbnail patterns

#### Scenario: Enhanced progress reporting for health checks
- **WHEN** health check processes files alongside thumbnail regeneration
- **THEN** existing `thumbnail_progress` events include original file health status
- **AND** `thumbnails_regenerated` event includes health check completion summary
- **AND** logging reports both thumbnail and original file health results

### Requirement: Error Status UI Indicators
The system SHALL display visual indicators for missing or corrupted original files while maintaining existing UI patterns.

#### Scenario: Missing original files show error icons on thumbnails
- **WHEN** original file is missing but thumbnail exists in ImageGrid
- **THEN** error icon (AlertCircle) appears in top-right corner of thumbnail
- **AND** tooltip shows "Original image is missing" on hover
- **AND** icon uses semantic destructive colors from existing theme
- **AND** existing ImageCard hover and selection functionality is preserved

#### Scenario: Completely missing files show error placeholders
- **WHEN** both original and thumbnail files are missing
- **THEN** error placeholder displays "Image Not Available" with broken image icon
- **AND** placeholder maintains same aspect ratio as regular thumbnails
- **AND** virtual scrolling performance is maintained with error placeholders

#### Scenario: Corrupted files show corruption indicators
- **WHEN** files exist but are corrupted (invalid headers, unreadable)
- **THEN** corruption indicator uses existing warning icon patterns
- **AND** tooltip explains corruption type when detectable
- **AND** users can attempt recovery through existing context menu

### Requirement: Missing Image Filter
The system SHALL provide filtering capability for files with missing original files using existing filter infrastructure.

#### Scenario: Missing image filter appears when needed
- **WHEN** library contains files with missing originals
- **THEN** "Missing Originals" filter button appears in existing filter bar
- **AND** button follows existing FilterButton component styling and patterns
- **AND** count badge displays number of missing original files
- **WHEN** no missing originals exist
- **THEN** filter button is hidden to maintain clean UI

#### Scenario: Filter integrates with existing search system
- **WHEN** missing image filter is activated
- **THEN** image grid shows only files with `is_missing = 1`
- **AND** filter works with existing tag filters and favorites filter
- **AND** URL state management follows existing filter patterns
- **AND** query performance remains under 100ms for 10,000 files

#### Scenario: Filter provides keyboard and accessibility support
- **WHEN** user navigates with keyboard
- **THEN** missing image filter follows existing keyboard navigation patterns
- **AND** Ctrl+Shift+M shortcut toggles filter using existing shortcut system
- **AND** screen reader announcements follow existing accessibility patterns

### Requirement: Startup Health Check Integration
The system SHALL perform health checks during application startup as part of the background task.

#### Scenario: Health check integration with startup
- **WHEN** application starts and background tasks run
- **THEN** original file health check is performed asynchronously
- **AND** existing thread pool and concurrency controls are reused
- **AND** UI responsiveness is maintained following existing startup patterns

### Requirement: Enhanced File Query Operations
The system SHALL support enhanced health status information in file queries.

#### Scenario: Enhanced missing status in file queries
- **WHEN** `get_all_files()` command is called
- **THEN** response includes `is_missing` and `thumbnail_health` fields
- **AND** existing pagination and ordering are maintained
- **AND** query performance remains under 100ms for 10,000 files

#### Scenario: Health status filtering command
- **WHEN** frontend needs to filter by original file health
- **THEN** `get_files_by_health_status()` command provides filtering capability
- **AND** command follows existing parameter conventions and error handling
- **AND** response format matches existing file record structure

