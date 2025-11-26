# ai-runtime Specification Deltas

## ADDED Requirements

### Requirement: Complete AI Tagger Implementation
The system SHALL implement full ONNX inference pipeline for image classification using SmilingWolf/swin-v2-tagger-v3 model.

#### Scenario: Tagger module replaces stub implementation
- **WHEN** `classify_image()` is called
- **THEN** function loads ONNX model from `models/swin-v2-tagger-v3.onnx`
- **AND** function loads label map from `models/selected_tags.csv`
- **AND** image is preprocessed to 224x224 RGB format with normalization
- **AND** ONNX inference runs with selected execution provider
- **AND** output tensor is postprocessed to filter predictions
- **AND** function returns `Vec<TagPrediction>` instead of empty array

#### Scenario: Label map is loaded from CSV
- **WHEN** tagger module initializes
- **THEN** `selected_tags.csv` is parsed with columns: tag_id, name, category, post_count
- **AND** label map is cached in static `Lazy<HashMap<usize, String>>`
- **AND** tag names are used to map model output indices to readable names
- **WHEN** CSV file is missing
- **THEN** clear error is returned: "selected_tags.csv not found in models/"

#### Scenario: Predictions are filtered by threshold
- **WHEN** model inference returns confidence scores
- **THEN** tags with confidence < 0.35 are discarded
- **AND** tags with type 'meta' are excluded (not useful for search)
- **AND** only top 50 tags are retained (sorted by confidence descending)
- **AND** each prediction includes name and confidence score

#### Scenario: Model availability can be checked
- **WHEN** `is_model_available()` is called
- **THEN** function checks if `models/swin-v2-tagger-v3.onnx` exists
- **AND** function checks if `models/selected_tags.csv` exists
- **AND** function returns true only if both files exist
- **AND** function is used to disable AI features in UI if model unavailable

#### Scenario: Preprocessing follows model requirements
- **WHEN** image is preprocessed for inference
- **THEN** image is resized to 224x224 pixels (model input size)
- **AND** pixel values are normalized to range [0.0, 1.0]
- **AND** color channels are in RGB order (not BGR)
- **AND** data is converted to NCHW tensor format (batch, channels, height, width)
- **AND** batch dimension is 1

### Requirement: Separate AI Tagging Progress Events
The system SHALL emit distinct progress events for AI tagging separate from import pipeline.

#### Scenario: AI tagging emits dedicated events
- **WHEN** AI tagging starts for imported file
- **THEN** `ai_tagging_progress` event is emitted with { file_hash, stage: "classifying" }
- **WHEN** model inference completes
- **THEN** `ai_tagging_progress` event is emitted with { file_hash, stage: "saving_tags" }
- **WHEN** tags are inserted into database
- **THEN** `ai_tagging_progress` event is emitted with { file_hash, stage: "complete", tag_count }
- **WHEN** AI tagging fails
- **THEN** `ai_tagging_progress` event is emitted with { file_hash, stage: "error", message }

#### Scenario: AI tagging progress is independent from import
- **WHEN** import completes and returns to frontend
- **THEN** AI tagging continues in background
- **AND** `import_progress` events stop after file insert
- **AND** `ai_tagging_progress` events continue separately
- **AND** frontend can display import success while showing "AI tagging in progress..."
- **AND** tag list updates when AI tagging completes

#### Scenario: Multiple AI tagging tasks run concurrently
- **WHEN** multiple files are imported in batch
- **THEN** each file spawns separate AI tagging task via `tokio::spawn`
- **AND** tasks run concurrently (limited by inference session locks)
- **AND** frontend receives `ai_tagging_progress` events for each file independently
- **AND** frontend can show per-file AI status (queued, processing, complete)

### Requirement: Manual AI Tagging for Existing Files
The system SHALL provide Tauri command to run AI tagging on already-imported files.

#### Scenario: Single file AI tagging command exists
- **WHEN** `tag_file_with_ai(file_hash)` command is invoked
- **THEN** file record is retrieved from database by hash
- **AND** AI tagging pipeline runs using `original_path` from record
- **AND** `ai_tagging_progress` events are emitted (classifying, saving_tags, complete/error)
- **AND** new tags are added to FileTags table (existing tags are preserved)
- **AND** command returns tag count and success status

#### Scenario: Batch AI tagging command exists
- **WHEN** `tag_files_batch(file_hashes[])` command is invoked
- **THEN** each file is tagged via `tokio::spawn` (concurrent execution)
- **AND** `ai_tagging_progress` events are emitted for each file with file_hash
- **AND** command returns immediately after spawning all tasks
- **AND** final summary event is emitted when all tasks complete

#### Scenario: AI tagging skips missing files
- **WHEN** file record has `is_missing = 1`
- **THEN** AI tagging is skipped for that file
- **AND** `ai_tagging_progress` event is emitted with stage: "skipped", message: "File missing"
- **AND** batch operation continues with remaining files

#### Scenario: Duplicate tags are handled
- **WHEN** AI tagging generates tag that already exists on file
- **THEN** duplicate tag is not inserted (INSERT OR IGNORE)
- **AND** existing tag association is preserved
- **AND** tag count in result only includes newly added tags

## MODIFIED Requirements

### Requirement: Async AI Integration
The system SHALL integrate AI tagging into file import pipeline without blocking, with separate progress tracking.

#### Scenario: AI tagging runs asynchronously after file insert
- **WHEN** new file is imported via `import_file()` command
- **THEN** file record is inserted into database first
- **AND** AI tagging is spawned in background via `tokio::spawn`
- **AND** command returns immediately with file_hash (does not wait for AI)
- **AND** frontend can display file before tags are ready
- **AND** tags appear in UI once AI tagging completes (via query refetch)

#### Scenario: AI tagging progress events are emitted
- **WHEN** AI tagging pipeline executes
- **THEN** `ai_tagging_progress` event is emitted with stage: "classifying"
- **AND** event is emitted with stage: "saving_tags"
- **AND** event is emitted with stage: "complete" with tag count
- **AND** each event includes file_hash and stage name
- **AND** frontend can display AI tagging progress indicator separate from import

#### Scenario: Import progress events are emitted
- **WHEN** file import pipeline executes
- **THEN** `import_progress` event is emitted with stage: "hashing"
- **AND** event is emitted with stage: "saving" (after database insert)
- **AND** event is emitted with stage: "complete"
- **AND** events do NOT include thumbnail or AI stages (those are separate)

#### Scenario: AI tagging failures are handled gracefully
- **WHEN** AI inference fails due to model error or unsupported image
- **THEN** error is logged with file_hash and error message
- **AND** `ai_tagging_progress` event is emitted with stage: "error"
- **AND** file record remains in database without tags
- **AND** import is not rolled back
- **AND** user can manually add tags later
- **AND** command does not return error to frontend

### Requirement: Performance Monitoring
The system SHALL log AI inference performance for debugging and optimization.

#### Scenario: Inference duration is logged
- **WHEN** AI tagging completes for a file
- **THEN** total inference time is measured (preprocessing + inference + postprocessing)
- **AND** duration is logged with file_hash and execution provider used
- **AND** log level is DEBUG (not visible in production by default)
- **WHEN** inference time exceeds 2 seconds
- **THEN** WARNING is logged indicating potential performance issue

#### Scenario: Hardware acceleration is verified
- **WHEN** application starts and loads model
- **THEN** selected execution provider is logged (CUDA/CoreML/DirectML/CPU)
- **AND** if CPU is selected, INFO log recommends installing GPU drivers
- **AND** if GPU is detected but not used, WARNING is logged with troubleshooting info

#### Scenario: Batch AI tagging is monitored
- **WHEN** multiple files are being tagged concurrently
- **THEN** concurrent task count is logged (e.g., "AI tagging: 3 concurrent tasks")
- **AND** queue depth is logged if tasks are waiting
- **AND** average inference time per file is calculated and logged after batch completes
