# ai-tagging Specification

## Purpose
提供基于ONNX模型的自动图像分类和标签生成功能。使用SmilingWolf/swin-v2-tagger-v3模型对图像进行自动标注，支持导入时自动标签、手动触发标签、批量标签等场景。

## Requirements
### Requirement: Image Classification Pipeline
The system SHALL implement automatic image tagging using the SmilingWolf/swin-v2-tagger-v3 ONNX model.

#### Scenario: Model is loaded at application startup
- **WHEN** application initializes AI module
- **THEN** ONNX model is loaded from `models/swin-v2-tagger-v3.onnx` using lazy initialization
- **AND** model session is stored in static `Lazy<Arc<Mutex<Session>>>` for thread-safe access
- **AND** initialization happens on first use (not blocking startup)
- **AND** subsequent calls reuse loaded model without reloading
- **WHEN** model file is missing
- **THEN** clear error message is logged with download instructions
- **AND** file import continues without AI tagging (graceful degradation)

#### Scenario: Image is preprocessed for model input
- **WHEN** `classify_image(path)` is called with image file path
- **THEN** image is loaded using `image` crate
- **AND** image is resized to 448x448 pixels (model's expected input size)
- **AND** pixel values are normalized to range [0.0, 1.0]
- **AND** color channels are converted to RGB format
- **AND** data is converted to ONNX tensor format (NCHW: batch, channels, height, width)
- **AND** preprocessing completes in under 50ms

#### Scenario: Model inference executes successfully
- **WHEN** preprocessed image tensor is ready
- **THEN** inference is executed in `tokio::task::spawn_blocking` to avoid blocking async runtime
- **AND** model session is locked via `Mutex` for thread-safe access
- **AND** inference runs with selected execution provider (CUDA/CoreML/DirectML/CPU)
- **AND** output tensor contains confidence scores for all tags
- **AND** inference completes in ~100-200ms on GPU, ~500-1000ms on CPU

#### Scenario: Model output is postprocessed
- **WHEN** inference returns output tensor
- **THEN** confidence scores are extracted for each tag
- **AND** label map (tag names) is loaded from accompanying CSV/JSON file
- **AND** tags are filtered by confidence threshold of 0.50
- **AND** tags with type 'meta' are excluded (not useful for search)
- **AND** only top 50 tags are retained (sorted by confidence descending)
- **AND** result is returned as `Vec<TagPrediction>` (tag name, confidence)

### Requirement: Complete AI Tagger Implementation
The system SHALL implement full ONNX inference pipeline for image classification using SmilingWolf/swin-v2-tagger-v3 model.

#### Scenario: Tagger module replaces stub implementation
- **WHEN** `classify_image()` is called
- **THEN** function loads ONNX model from `models/swin-v2-tagger-v3.onnx`
- **AND** function loads label map from `models/selected_tags.csv`
- **AND** image is preprocessed to 448x448 RGB format with normalization
- **AND** ONNX inference runs with selected execution provider
- **AND** output tensor is postprocessed to filter predictions
- **AND** function returns `Vec<TagPrediction>` instead of empty array

#### Scenario: Label map is loaded from CSV
- **WHEN** tagger module initializes
- **THEN** `selected_tags.csv` is parsed with columns: tag_id, name, category, post_count
- **AND** label map is cached in static `Lazy<HashMap<usize, (String, u32)>>`
- **AND** tag names are used to map model output indices to readable names
- **WHEN** CSV file is missing
- **THEN** clear error is returned: "selected_tags.csv not found in models/"

#### Scenario: Predictions are filtered by threshold
- **WHEN** model inference returns confidence scores
- **THEN** tags with confidence < 0.50 are discarded
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
- **THEN** image is resized to 448x448 pixels (model input size)
- **AND** pixel values are normalized to range [0.0, 1.0]
- **AND** color channels are in RGB order (not BGR)
- **AND** data is converted to NCHW tensor format (batch, channels, height, width)
- **AND** batch dimension is 1

### Requirement: Label Map Management
The system SHALL provide infrastructure for mapping model output indices to tag names.

#### Scenario: Label file is loaded at startup
- **WHEN** AI module initializes
- **THEN** label map file (CSV) is loaded from `models/` directory
- **AND** file contains mapping of index → tag name
- **AND** file is loaded once and cached in static storage
- **AND** missing label file causes clear error with instructions

#### Scenario: Label lookup is efficient
- **WHEN** inference returns output tensor with 10,000+ confidence scores
- **THEN** label lookup uses pre-loaded hashmap for O(1) access
- **AND** lookups complete in microseconds (negligible overhead)
- **AND** invalid indices are handled gracefully (return None or skip)

### Requirement: Tag Insertion from AI Results
The system SHALL store AI-generated tags in the database following import.

#### Scenario: AI tags are inserted into database
- **WHEN** `classify_image()` returns tag predictions
- **THEN** for each tag in results:
  - Query `Tags` table to check if tag with name exists
  - If not exists, INSERT new tag with inferred type:
    - "character" if name contains underscore and ends with _(cosplay/series)
    - "artist" if name starts with "artist:"
    - "general" otherwise
  - Retrieve tag_id (from INSERT or existing record)
  - INSERT INTO FileTags (file_hash, tag_id) if not exists
- **AND** all tag insertions use transaction for atomicity
- **AND** duplicate key violations are ignored (tag already associated)

#### Scenario: Tag type inference works correctly
- **WHEN** AI returns tag name "1girl"
- **THEN** type is inferred as "general"
- **WHEN** AI returns tag name "hatsune_miku_(cosplay)"
- **THEN** type is inferred as "character"
- **WHEN** AI returns tag name "artist:swd3e2"
- **THEN** type is inferred as "artist"
- **AND** prefix "artist:" is stripped from name before insertion

### Requirement: Async AI Integration
The system SHALL integrate AI tagging into file import pipeline without blocking, with separate progress tracking.

#### Scenario: AI tagging runs asynchronously after file insert
- **WHEN** new file is imported via `import_file()` command
- **THEN** file record is inserted into database first
- **AND** AI tagging is spawned in background via `tokio::spawn`
- **AND** command returns immediately with file_hash (does not wait for AI)
- **AND** frontend can display file before tags are ready
- **AND** tags appear in UI once AI tagging completes (via query refetch)

#### Scenario: AI tagging failures are handled gracefully
- **WHEN** AI inference fails due to model error or unsupported image
- **THEN** error is logged with file_hash and error message
- **AND** `ai_tagging_progress` event is emitted with stage: "error"
- **AND** file record remains in database without tags
- **AND** import is not rolled back
- **AND** user can manually add tags later
- **AND** command does not return error to frontend

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
- **OR** original file no longer exists at stored path
- **THEN** AI tagging is skipped for that file
- **AND** `ai_tagging_progress` event is emitted with stage: "skipped", message: "File missing"
- **AND** batch operation continues with remaining files

#### Scenario: Duplicate tags are handled
- **WHEN** AI tagging generates tag that already exists on file
- **THEN** duplicate tag is not inserted (INSERT OR IGNORE)
- **AND** existing tag association is preserved
- **AND** tag count in result only includes newly added tags

### Requirement: AI Model Testing Command
The system SHALL provide a test command to verify AI model loading and inference functionality.

#### Scenario: Test command exists
- **WHEN** `test_ai_model(image_path)` command is invoked
- **THEN** command checks if model files exist
- **AND** command attempts to load model and label map
- **AND** command runs inference on provided image
- **AND** command returns model status, inference results, timing, and execution provider info
- **AND** command is registered in `src-tauri/src/lib.rs`

