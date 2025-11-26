# ai-runtime Specification Deltas

## ADDED Requirements

### Requirement: Model Testing Command
The system SHALL provide a Tauri command to test AI model loading and inference independently.

#### Scenario: Test command loads model successfully
- **WHEN** `test_ai_model(image_path)` command is invoked with valid image path
- **THEN** command attempts to load ONNX model from `models/swin-v2-tagger-v3.onnx`
- **AND** command attempts to load label map from `models/selected_tags.csv`
- **AND** if model files are missing, clear error message is returned with expected paths
- **AND** if model loads successfully, command returns success status with model info

#### Scenario: Test command runs inference
- **WHEN** model is loaded successfully
- **THEN** image is preprocessed and fed to model
- **AND** inference is executed with selected execution provider
- **AND** command returns list of predicted tags with confidence scores
- **AND** inference time is measured and included in response
- **AND** execution provider used (CUDA/CoreML/DirectML/CPU) is included in response

#### Scenario: Test command handles errors gracefully
- **WHEN** image file is invalid or missing
- **THEN** command returns clear error message
- **WHEN** model inference fails
- **THEN** command returns error with details about failure
- **AND** error messages are logged for debugging

### Requirement: Reliable Model Path Resolution
The system SHALL reliably locate model files in both development and production environments.

#### Scenario: Development environment path resolution
- **WHEN** application runs in development mode (`cargo tauri dev`)
- **THEN** `get_models_dir()` uses `CARGO_MANIFEST_DIR` environment variable to locate `src-tauri/models/`
- **AND** path resolution does not rely on multiple `parent()` calls
- **AND** if `CARGO_MANIFEST_DIR` is not available, falls back to executable directory resolution

#### Scenario: Production environment path resolution
- **WHEN** application runs in production mode (built binary)
- **THEN** `get_models_dir()` locates models relative to executable directory
- **AND** models are expected in `{exe_dir}/models/` directory
- **AND** path resolution handles both bundled and external model files

#### Scenario: Path resolution errors are clear
- **WHEN** model directory cannot be located
- **THEN** error message includes:
  - Expected model directory path
  - Actual paths checked
  - Instructions for placing model files
- **AND** error is logged with full path resolution details

### Requirement: Enhanced Error Logging for AI Operations
The system SHALL provide detailed error logging for AI model operations to facilitate debugging.

#### Scenario: Model loading errors are logged
- **WHEN** model file cannot be loaded
- **THEN** error log includes:
  - Attempted file path
  - File existence check result
  - ONNX Runtime error details (if any)
  - Execution provider initialization status
- **AND** log level is ERROR for critical failures, WARN for recoverable issues

#### Scenario: Inference errors are logged
- **WHEN** model inference fails
- **THEN** error log includes:
  - Input image path
  - Preprocessing step that failed (if any)
  - ONNX Runtime error details
  - Execution provider used
- **AND** error is logged before returning to caller

#### Scenario: Path resolution is logged
- **WHEN** `get_models_dir()` is called
- **THEN** DEBUG log includes:
  - Environment variables checked (`CARGO_MANIFEST_DIR`, etc.)
  - Paths attempted
  - Final resolved path
- **AND** log helps diagnose path resolution issues

## MODIFIED Requirements

### Requirement: Complete AI Tagger Implementation
The system SHALL implement full ONNX inference pipeline for image classification using SmilingWolf/swin-v2-tagger-v3 model.

#### Scenario: Tagger module replaces stub implementation
- **WHEN** `classify_image()` is called
- **THEN** function loads ONNX model from `models/swin-v2-tagger-v3.onnx` using reliable path resolution
- **AND** function loads label map from `models/selected_tags.csv` using reliable path resolution
- **AND** image is preprocessed to 448x448 RGB format with normalization (corrected from 224x224)
- **AND** ONNX inference runs with selected execution provider
- **AND** output tensor is postprocessed to filter predictions
- **AND** function returns `Vec<TagPrediction>` instead of empty array
- **AND** all errors are logged with sufficient detail for debugging

#### Scenario: Model availability can be checked
- **WHEN** `is_model_available()` is called
- **THEN** function checks if `models/swin-v2-tagger-v3.onnx` exists using reliable path resolution
- **AND** function checks if `models/selected_tags.csv` exists using reliable path resolution
- **AND** function returns true only if both files exist
- **AND** function is used to disable AI features in UI if model unavailable
- **AND** path resolution failures are logged but do not crash the check

#### Scenario: Preprocessing follows model requirements
- **WHEN** image is preprocessed for inference
- **THEN** image is resized to 448x448 pixels (model input size, corrected from 224x224)
- **AND** pixel values are normalized to range [0.0, 1.0]
- **AND** color channels are in RGB order (not BGR)
- **AND** data is converted to NHWC tensor format (batch, height, width, channels) - model expects this format
- **AND** batch dimension is 1

### Requirement: Async AI Integration
The system SHALL integrate AI tagging into file import pipeline without blocking, with separate progress tracking.

#### Scenario: AI tagging runs asynchronously after file insert
- **WHEN** new file is imported via `import_file()` command
- **AND** `enable_ai_tagging` option is true (default)
- **THEN** file record is inserted into database first
- **AND** AI tagging is spawned in background via `tokio::spawn`
- **AND** command returns immediately with file_hash (does not wait for AI)
- **AND** frontend can display file before tags are ready
- **AND** tags appear in UI once AI tagging completes (via query refetch)
- **WHEN** model is not available
- **THEN** AI tagging is skipped gracefully without error
- **AND** import continues successfully

#### Scenario: AI tagging failures are handled gracefully
- **WHEN** AI inference fails due to model error or unsupported image
- **THEN** error is logged with file_hash, error message, and stack trace (if available)
- **AND** `ai_tagging_progress` event is emitted with stage: "error" and detailed message
- **AND** file record remains in database without tags
- **AND** import is not rolled back
- **AND** user can manually add tags later
- **AND** command does not return error to frontend (import succeeded)

