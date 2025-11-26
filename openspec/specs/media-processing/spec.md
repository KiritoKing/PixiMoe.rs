# media-processing Specification

## Purpose
TBD - created by archiving change improve-import-ux-and-tagging. Update Purpose after archive.
## Requirements
### Requirement: Multi-threaded Thumbnail Generation
The system SHALL generate thumbnails in parallel using a thread pool to avoid blocking import pipeline.

#### Scenario: Thumbnail generation uses thread pool
- **WHEN** `generate_thumbnail()` is called during import
- **THEN** thumbnail generation is spawned in Tokio blocking thread pool via `tokio::task::spawn_blocking`
- **AND** main import flow continues without waiting for thumbnail completion
- **AND** thumbnail path is returned asynchronously
- **AND** multiple thumbnails can be generated concurrently (limited by CPU cores)

#### Scenario: Thumbnail generation does not block file insert
- **WHEN** file import pipeline executes
- **THEN** file hash calculation completes first
- **AND** database insert happens immediately after hash
- **AND** thumbnail generation starts in background after insert
- **AND** `import_file()` command returns before thumbnail completes
- **AND** UI can display file record while thumbnail is still generating

#### Scenario: Thumbnail progress is tracked separately
- **WHEN** thumbnail generation starts
- **THEN** `thumbnail_progress` event is emitted with { file_hash, stage: "generating" }
- **WHEN** thumbnail generation completes
- **THEN** `thumbnail_progress` event is emitted with { file_hash, stage: "complete" }
- **WHEN** thumbnail generation fails
- **THEN** `thumbnail_progress` event is emitted with { file_hash, stage: "error", message }
- **AND** error is logged but does not fail import

### Requirement: Startup Thumbnail Regeneration
The system SHALL automatically regenerate missing thumbnails on application startup without blocking UI.

#### Scenario: Missing thumbnails are detected at startup
- **WHEN** application starts and database connection is established
- **THEN** `regenerate_missing_thumbnails()` is called in background task
- **AND** function queries all files from database
- **AND** function checks if thumbnail file exists in AppDataDir/thumbnails/
- **AND** missing thumbnails are identified and queued for regeneration

#### Scenario: Thumbnails are regenerated in background
- **WHEN** missing thumbnails are found
- **THEN** each missing thumbnail is regenerated via `generate_thumbnail()` in thread pool
- **AND** regeneration uses original file path from database
- **AND** regeneration happens asynchronously without blocking startup
- **AND** errors are logged if original file is missing or corrupted

#### Scenario: Missing files are marked in database
- **WHEN** original file no longer exists at stored path
- **THEN** database record is updated with `is_missing = 1`
- **AND** file is excluded from future thumbnail regeneration attempts
- **AND** file appears in UI with "missing file" indicator

#### Scenario: Regeneration completion is reported
- **WHEN** all missing thumbnails are regenerated
- **THEN** `thumbnails_regenerated` event is emitted with count
- **AND** frontend invalidates file queries to refresh grid
- **AND** newly regenerated thumbnails appear in UI
- **AND** log message reports: "Regenerated X thumbnails"

### Requirement: Thumbnail Generation Performance Monitoring
The system SHALL log thumbnail generation performance for debugging and optimization.

#### Scenario: Thumbnail generation duration is logged
- **WHEN** thumbnail generation completes
- **THEN** generation time is measured and logged
- **AND** log includes file_hash and output path
- **AND** log level is DEBUG (not visible in production by default)
- **WHEN** thumbnail generation exceeds 200ms
- **THEN** WARNING is logged indicating slow image processing
- **AND** warning includes image dimensions and file size for diagnosis

#### Scenario: Batch thumbnail regeneration is monitored
- **WHEN** startup thumbnail regeneration runs
- **THEN** total count of missing thumbnails is logged at start
- **AND** progress is logged every 10 thumbnails (e.g., "Regenerated 10/50")
- **AND** total time and average time per thumbnail are logged at completion
- **WHEN** batch regeneration takes longer than 30 seconds
- **THEN** INFO log suggests user may want to optimize storage or reduce resolution

