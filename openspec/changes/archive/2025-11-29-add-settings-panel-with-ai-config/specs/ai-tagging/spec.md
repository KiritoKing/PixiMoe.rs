# ai-tagging Specification Deltas

## MODIFIED Requirements

### Requirement: Image Classification Pipeline
The system SHALL implement automatic image tagging using user-uploaded ONNX model with availability checks and configurable inference parameters.

#### Scenario: Model availability is checked before classification
- **WHEN** `classify_image(path)` is called
- **THEN** function first checks if model is available via `is_model_available()`
- **WHEN** model is not available
- **THEN** function returns error: "AI model not loaded. Please upload model in Settings."
- **AND** error is propagated to caller
- **AND** no inference is attempted

#### Scenario: Model is loaded from app data directory
- **WHEN** application initializes AI module
- **AND** model file exists in `{app_data_dir}/models/swin-v2-tagger-v3.onnx`
- **THEN** ONNX model is loaded from app data directory using lazy initialization
- **AND** model session is stored in static `Lazy<Arc<Mutex<Session>>>` for thread-safe access
- **AND** initialization happens on first use (not blocking startup)
- **AND** subsequent calls reuse loaded model without reloading
- **WHEN** model file is missing from app data directory
- **THEN** model session initialization fails
- **AND** `is_model_available()` returns false
- **AND** file import continues without AI tagging (graceful degradation)

#### Scenario: Label map is loaded from app data directory
- **WHEN** AI module initializes
- **AND** label map file exists in `{app_data_dir}/models/selected_tags.csv`
- **THEN** label map is loaded from app data directory
- **AND** label map is cached in static `Lazy<HashMap<usize, (String, u32)>>`
- **AND** label map includes category information (0=general, 4=character, 9=rating)
- **WHEN** label map file is missing from app data directory
- **THEN** label map initialization fails
- **AND** `is_model_available()` returns false
- **AND** clear error message indicates missing label map file

#### Scenario: Image preprocessing follows official implementation
- **WHEN** image is preprocessed for model input
- **THEN** image is converted to RGBA format if needed
- **AND** image is composited onto white background (255, 255, 255)
- **AND** image is converted to RGB format
- **AND** image is padded to square shape (centered on white background)
- **AND** padded image is resized to model input size (448x448) using BICUBIC interpolation
- **AND** pixel values are normalized to range [0.0, 1.0]
- **AND** color channels are converted from RGB to BGR format (channel order reversed)
- **AND** data is converted to NHWC tensor format (batch, height, width, channels)
- **AND** preprocessing completes in under 50ms

#### Scenario: Postprocessing distinguishes tag categories
- **WHEN** model inference returns confidence scores
- **THEN** tags are separated by category:
  - Rating tags (category 9): selected using argmax (highest confidence)
  - General tags (category 0): filtered by general threshold (default 0.35)
  - Character tags (category 4): filtered by character threshold (default 0.85)
- **AND** each category uses its own threshold from inference configuration
- **AND** MCut threshold algorithm can be applied per category if enabled
- **AND** final results include all three categories
- **AND** results are sorted by confidence descending
- **AND** only top N tags are retained (default 50, configurable)

#### Scenario: MCut threshold algorithm is supported
- **WHEN** MCut threshold is enabled for a category (general or character)
- **THEN** MCut algorithm is applied to that category's predictions
- **AND** algorithm finds maximum difference between sorted probabilities
- **AND** threshold is set to midpoint between adjacent probabilities with max difference
- **AND** for character tags, MCut threshold is clamped to minimum 0.15
- **AND** predictions below MCut threshold are filtered out
- **WHEN** MCut threshold is disabled
- **THEN** fixed threshold from configuration is used instead

### Requirement: Inference Configuration Management
The system SHALL provide configurable inference parameters that can be adjusted in settings panel and persisted across sessions.

#### Scenario: Inference configuration is stored
- **WHEN** user adjusts inference parameters in settings panel
- **THEN** configuration is saved to persistent storage (Tauri Store or similar)
- **AND** configuration includes:
  - `general_threshold: f32` (default 0.35)
  - `character_threshold: f32` (default 0.85)
  - `general_mcut_enabled: bool` (default false)
  - `character_mcut_enabled: bool` (default false)
  - `max_tags: usize` (default 50)
- **AND** configuration persists across application restarts
- **AND** configuration is loaded on application startup

#### Scenario: Inference configuration is applied to classification
- **WHEN** `classify_image(path)` is called
- **THEN** function loads current inference configuration from storage
- **AND** configuration parameters are used for postprocessing:
  - General tags use `general_threshold` (or MCut if enabled)
  - Character tags use `character_threshold` (or MCut if enabled)
  - Results are limited to `max_tags` count
- **AND** configuration can be overridden per-call for debugging

#### Scenario: Inference configuration UI is accessible
- **WHEN** user navigates to AI Settings page
- **THEN** "Inference Configuration" section is visible
- **AND** section contains controls for:
  - General tags threshold slider (0.0 - 1.0, step 0.05, default 0.35)
  - Character tags threshold slider (0.0 - 1.0, step 0.05, default 0.85)
  - "Use MCut for General Tags" checkbox (default unchecked)
  - "Use MCut for Character Tags" checkbox (default unchecked)
  - Max tags input (1 - 100, default 50)
- **WHEN** user changes any parameter
- **THEN** "Save Configuration" button becomes enabled
- **WHEN** user clicks "Save Configuration"
- **THEN** configuration is saved to persistent storage
- **AND** success message is displayed
- **AND** new configuration applies to all subsequent AI tagging operations

### Requirement: AI Feature Availability State
The system SHALL disable AI features when model is not loaded, both in frontend and backend.

#### Scenario: Frontend disables AI features when model unavailable
- **WHEN** frontend queries model availability status
- **AND** model is not loaded
- **THEN** all AI-related UI elements are disabled (grayed out)
- **AND** "Run AI Tagging" buttons are disabled
- **AND** import dialog shows message: "AI tagging unavailable - upload model in Settings"
- **AND** tooltips explain why features are disabled

#### Scenario: Backend returns error when model unavailable
- **WHEN** Tauri command for AI tagging is invoked
- **AND** model is not loaded
- **THEN** command returns error immediately without attempting inference
- **AND** error message is: "AI model not loaded. Please upload model in Settings."
- **AND** error is returned synchronously (no async processing)
- **AND** error is propagated to frontend for user notification

#### Scenario: Model availability status is queryable
- **WHEN** frontend calls `get_model_status()` Tauri command
- **THEN** command returns model status object containing:
  - `is_loaded: bool` - whether model is successfully loaded
  - `model_file_exists: bool` - whether model file exists
  - `label_map_exists: bool` - whether label map file exists
  - `model_path: string` - path to model file
  - `label_map_path: string` - path to label map file
  - `error: string | null` - error message if loading failed
- **AND** status is updated in real-time when model is uploaded/removed

### Requirement: Model Debugging Functionality
The system SHALL provide model debugging interface with step-by-step visualization and parameter adjustment.

#### Scenario: Model debugging is accessible
- **WHEN** user navigates to AI Settings page
- **AND** model is loaded
- **THEN** "Model Debug" section is visible and enabled
- **WHEN** model is not loaded
- **THEN** "Model Debug" section is disabled (grayed out)
- **AND** message indicates model must be uploaded first

#### Scenario: User can upload test image for debugging
- **WHEN** user clicks "Upload Test Image" in Model Debug section
- **THEN** file picker dialog opens
- **AND** user can select image file (jpg, png, webp)
- **AND** selected image is displayed in debug UI
- **AND** image is stored temporarily (not added to database)

#### Scenario: Debug shows preprocessing step
- **WHEN** user clicks "Run Debug" after uploading test image
- **THEN** preprocessing step is executed
- **AND** original image is displayed in "Input" section
- **AND** preprocessed image (448x448, padded, BGR converted) is displayed in "Preprocessed" section
- **AND** preprocessing parameters are shown (padding, resize method, BGR conversion)
- **AND** preprocessing completes in under 50ms

#### Scenario: Debug shows inference step
- **WHEN** preprocessing completes
- **THEN** inference step is executed
- **AND** inference runs with current model parameters
- **AND** inference duration is displayed
- **AND** execution provider (CUDA/CoreML/DirectML/CPU) is displayed
- **AND** inference completes and results are shown

#### Scenario: Debug shows postprocessing step
- **WHEN** inference completes
- **THEN** postprocessing step is executed
- **AND** raw confidence scores are displayed (top 100)
- **AND** separated results by category are displayed (rating, general, character)
- **AND** filtered predictions (after threshold/MCut) are displayed per category
- **AND** final tag predictions are displayed with confidence scores
- **AND** postprocessing parameters are shown (thresholds, MCut settings, max tags)

#### Scenario: User can adjust model parameters in debug
- **WHEN** debug UI is displayed
- **THEN** parameter adjustment controls are visible:
  - General tags threshold slider (0.0 - 1.0, default 0.35)
  - Character tags threshold slider (0.0 - 1.0, default 0.85)
  - General MCut threshold checkbox (default false)
  - Character MCut threshold checkbox (default false)
  - Max tags input (1 - 100, default 50)
  - Execution provider selector (if multiple available)
- **WHEN** user adjusts parameters
- **THEN** "Re-run Inference" button becomes enabled
- **WHEN** user clicks "Re-run Inference"
- **THEN** only inference and postprocessing steps are re-executed (preprocessing is cached)
- **AND** results are updated with new parameters
- **AND** original image and preprocessed image remain unchanged

#### Scenario: Debug results do not affect database
- **WHEN** debug inference completes
- **THEN** results are displayed in UI only
- **AND** no tags are inserted into database
- **AND** no file records are created
- **AND** test image is not imported
- **AND** debug is completely dry-run mode

#### Scenario: Debug supports step-by-step execution
- **WHEN** user clicks "Step-by-Step" mode toggle
- **THEN** debug UI shows individual step buttons:
  - "Preprocess" button
  - "Run Inference" button (disabled until preprocessing completes)
  - "Postprocess" button (disabled until inference completes)
- **WHEN** user clicks "Preprocess"
- **THEN** only preprocessing step executes
- **AND** preprocessed image is displayed
- **AND** "Run Inference" button becomes enabled
- **WHEN** user clicks "Run Inference"
- **THEN** only inference step executes
- **AND** inference results are displayed
- **AND** "Postprocess" button becomes enabled
- **WHEN** user clicks "Postprocess"
- **THEN** only postprocessing step executes
- **AND** final tag predictions are displayed
