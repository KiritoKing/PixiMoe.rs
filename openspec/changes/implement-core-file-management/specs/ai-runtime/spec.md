## ADDED Requirements

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
- **AND** image is resized to 224x224 pixels (model's expected input size)
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
- **AND** tags are filtered by confidence threshold of 0.35
- **AND** tags with type 'meta' are excluded (not useful for search)
- **AND** only top 50 tags are retained (sorted by confidence descending)
- **AND** result is returned as `Vec<(String, f32)>` (tag name, confidence)

### Requirement: Async AI Integration
The system SHALL integrate AI tagging into file import pipeline without blocking.

#### Scenario: AI tagging runs asynchronously after file insert
- **WHEN** new file is imported via `import_file()` command
- **THEN** file record is inserted into database first
- **AND** AI tagging is spawned in background via `tokio::spawn`
- **AND** command returns immediately with file_hash (does not wait for AI)
- **AND** frontend can display file before tags are ready
- **AND** tags appear in UI once AI tagging completes (via query refetch)

#### Scenario: Progress events are emitted during import
- **WHEN** AI tagging pipeline executes
- **THEN** `import_progress` event is emitted with stage: "hashing"
- **AND** event is emitted with stage: "thumbnail"
- **AND** event is emitted with stage: "ai_tagging"
- **AND** event is emitted with stage: "saving"
- **AND** each event includes file_hash and stage name
- **AND** frontend can display real-time progress indicator

#### Scenario: AI tagging failures are handled gracefully
- **WHEN** AI inference fails due to model error or unsupported image
- **THEN** error is logged with file_hash and error message
- **AND** file record remains in database without tags
- **AND** import is not rolled back
- **AND** user can manually add tags later
- **AND** command does not return error to frontend

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

### Requirement: Label Map Management
The system SHALL provide infrastructure for mapping model output indices to tag names.

#### Scenario: Label file is loaded at startup
- **WHEN** AI module initializes
- **THEN** label map file (CSV or JSON) is loaded from `models/` directory
- **AND** file contains mapping of index → tag name
- **AND** file is loaded once and cached in static storage
- **AND** missing label file causes clear error with instructions

#### Scenario: Label lookup is efficient
- **WHEN** inference returns output tensor with 10,000+ confidence scores
- **THEN** label lookup uses pre-loaded hashmap or array for O(1) access
- **AND** lookups complete in microseconds (negligible overhead)
- **AND** invalid indices are handled gracefully (return None or skip)

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
