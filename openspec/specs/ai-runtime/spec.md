# ai-runtime Specification

## Purpose
TBD - created by archiving change init-project-scaffold. Update Purpose after archive.
## Requirements
### Requirement: ONNX Runtime Integration
The system SHALL integrate ONNX Runtime via the `ort` crate for cross-platform AI inference with automatic hardware acceleration.

#### Scenario: ort dependencies are configured
- **WHEN** `src-tauri/Cargo.toml` is configured
- **THEN** `ort` dependency is added with version `2.0+`
- **AND** feature flag `download-binaries` is enabled for prebuilt runtime
- **AND** feature flag `load-dynamic` is enabled to avoid DLL conflicts on Windows
- **AND** all AI-related dependencies compile successfully

#### Scenario: ONNX Runtime initializes
- **WHEN** Tauri application starts
- **THEN** ONNX Runtime downloads appropriate execution provider libraries (if not cached)
- **AND** runtime detects available hardware acceleration
- **AND** runtime selects optimal execution provider in order: CUDA → CoreML → DirectML → CPU
- **AND** initialization completes within 5 seconds on standard hardware

### Requirement: AI Module Structure
The system SHALL organize AI inference code in a dedicated module with clear separation of concerns.

#### Scenario: AI module exists
- **WHEN** `src-tauri/src/ai/mod.rs` is created
- **THEN** module exports public functions for each AI capability:
  - `classify_image()` for tagging (SmilingWolf model)
  - `detect_faces()` for face detection (SCRFD model)
  - `extract_face_embedding()` for face recognition (ArcFace model)
- **AND** module is imported in `main.rs`
- **AND** functions are callable from Tauri commands

#### Scenario: Model loading is optimized
- **WHEN** AI module initializes
- **THEN** ONNX models are loaded once at startup into static or lazy-initialized state
- **AND** subsequent inference calls reuse loaded models
- **AND** model loading failures are caught and logged clearly

### Requirement: Model File Management
The system SHALL provide infrastructure for storing and accessing ONNX model files.

#### Scenario: Models directory exists
- **WHEN** project is initialized
- **THEN** `src-tauri/models/` directory is created
- **AND** directory contains `.gitignore` to exclude large `.onnx` files from version control
- **AND** README.md documents required models and download sources

#### Scenario: Model paths are configurable
- **WHEN** AI functions need to load models
- **THEN** model paths are resolved relative to application directory
- **AND** models can be bundled with release builds (in resources/)
- **AND** models can be loaded from AppDataDir for downloaded models (future)

#### Scenario: Missing models are handled gracefully
- **WHEN** application attempts to load a model
- **AND** model file does not exist at expected path
- **THEN** clear error message is returned to caller
- **AND** error includes expected path and instructions for obtaining model
- **AND** application does not crash or panic

### Requirement: Hardware Acceleration Selection
The system SHALL automatically select the optimal execution provider without user configuration.

#### Scenario: CUDA is used when available
- **WHEN** system has NVIDIA GPU with CUDA support
- **THEN** ONNX Runtime uses `CUDAExecutionProvider`
- **AND** GPU memory is allocated for model inference
- **AND** inference runs faster than CPU baseline

#### Scenario: CoreML is used on Apple Silicon
- **WHEN** system is macOS with Apple Silicon (M1/M2/M3)
- **THEN** ONNX Runtime uses `CoreMLExecutionProvider`
- **AND** Neural Engine or GPU is utilized
- **AND** inference runs faster than CPU baseline

#### Scenario: DirectML is used on Windows
- **WHEN** system is Windows with compatible GPU (Intel/AMD/NVIDIA)
- **THEN** ONNX Runtime uses `DirectMLExecutionProvider`
- **AND** GPU acceleration is utilized via DirectX 12
- **AND** inference runs faster than CPU baseline

#### Scenario: CPU fallback is reliable
- **WHEN** no hardware acceleration is available
- **OR** hardware acceleration initialization fails
- **THEN** ONNX Runtime uses `CPUExecutionProvider`
- **AND** inference completes successfully albeit slower
- **AND** no errors are thrown

### Requirement: Async Inference Execution
The system SHALL execute AI inference in background tasks to avoid blocking the Tauri main thread.

#### Scenario: Inference runs in tokio task
- **WHEN** Tauri command triggers AI inference
- **THEN** inference is spawned via `tokio::task::spawn_blocking()`
- **AND** main thread remains responsive during inference
- **AND** UI can update progress indicators while inference runs
- **AND** inference result is returned to caller asynchronously

#### Scenario: Multiple inferences can run concurrently
- **WHEN** multiple files require AI processing
- **THEN** multiple inference tasks can run in parallel (limited by thread pool)
- **AND** tasks do not deadlock or block each other
- **AND** system memory usage remains within reasonable bounds (< 4GB)

### Requirement: Model Preprocessing Pipeline
The system SHALL implement standard preprocessing for image input to ONNX models.

#### Scenario: Image is loaded and preprocessed
- **WHEN** AI function receives image path
- **THEN** image is loaded using `image` crate
- **AND** image is resized to model's expected input dimensions
- **AND** pixel values are normalized to expected range (typically 0.0-1.0 or -1.0 to 1.0)
- **AND** color channels are reordered if necessary (RGB vs BGR)
- **AND** data is converted to appropriate tensor format

#### Scenario: Preprocessing errors are handled
- **WHEN** image file is corrupted or unreadable
- **THEN** preprocessing function returns error
- **AND** error message identifies which preprocessing step failed
- **AND** calling code can handle error gracefully

### Requirement: Documentation and Examples
The system SHALL provide clear documentation for AI model setup and usage.

#### Scenario: Model download instructions exist
- **WHEN** developer reads `src-tauri/models/README.md`
- **THEN** document lists all required models with exact versions:
  - SmilingWolf/swin-v2-tagger-v3.onnx
  - SCRFD_10G_KPS.onnx
  - iresnet100.onnx (ArcFace)
- **AND** document provides download links (Hugging Face, GitHub releases)
- **AND** document explains file placement in models/ directory

#### Scenario: AI module has code examples
- **WHEN** developer reads AI module code
- **THEN** each public function has doc comment with usage example
- **AND** examples show error handling patterns
- **AND** examples demonstrate async usage with tokio

### Requirement: Performance Baselines
The system SHALL document expected inference performance characteristics for monitoring.

#### Scenario: Performance metrics are documented
- **WHEN** developer reads AI module documentation
- **THEN** document includes approximate inference times for reference hardware:
  - Tagging (SmilingWolf): ~100-200ms per image on GPU, ~500ms-1s on CPU
  - Face detection (SCRFD): ~50-100ms per image on GPU, ~300-500ms on CPU
  - Face embedding (ArcFace): ~20-50ms per face on GPU, ~100-200ms on CPU
- **AND** document notes these are approximate and vary by hardware

#### Scenario: Slow inference is detectable
- **WHEN** AI inference takes longer than expected
- **THEN** warning is logged with actual duration
- **AND** log indicates which execution provider was used
- **AND** developers can investigate performance issues

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

#### Scenario: Batch AI tagging is monitored
- **WHEN** multiple files are being tagged concurrently
- **THEN** concurrent task count is logged (e.g., "AI tagging: 3 concurrent tasks")
- **AND** queue depth is logged if tasks are waiting
- **AND** average inference time per file is calculated and logged after batch completes

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

