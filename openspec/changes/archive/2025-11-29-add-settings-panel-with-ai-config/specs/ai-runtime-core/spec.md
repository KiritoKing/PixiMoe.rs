# ai-runtime-core Specification Deltas

## MODIFIED Requirements

### Requirement: Model File Management
The system SHALL provide infrastructure for storing and accessing ONNX model files with user-uploaded model support and SHA256 verification.

#### Scenario: Models are stored in app data directory
- **WHEN** application needs to access model files
- **THEN** model files are located in `{app_data_dir}/models/` directory
- **AND** app_data_dir is obtained via `app.path().app_data_dir()`
- **AND** directory is created automatically if it doesn't exist
- **AND** in development mode, models directory is separate from source code
- **AND** in production mode, models directory is in user's app data folder

#### Scenario: User uploads tag model file
- **WHEN** user selects .onnx file via settings UI
- **THEN** file is uploaded to temporary location first
- **AND** SHA256 hash is calculated for uploaded file
- **AND** hash is compared against expected SHA256 value from built-in configuration (if configured)
- **WHEN** hash matches expected value (or no expected value is configured in application)
- **THEN** file is copied to `{app_data_dir}/models/` directory
- **AND** file is renamed to standard name (e.g., `swin-v2-tagger-v3.onnx`)
- **AND** model loading is triggered automatically
- **WHEN** hash doesn't match expected value (and expected value is configured)
- **THEN** upload is rejected with error message
- **AND** file is not copied to models directory
- **NOTE**: SHA256 hash values are built into the application configuration. If not configured yet, hash verification is skipped.

#### Scenario: User uploads label map file
- **WHEN** user selects CSV file via settings UI
- **THEN** file is uploaded to temporary location first
- **AND** SHA256 hash is calculated for uploaded file
- **AND** hash is compared against expected SHA256 value from built-in configuration (if configured)
- **WHEN** hash matches expected value (or no expected value is configured in application)
- **THEN** file is copied to `{app_data_dir}/models/` directory
- **AND** file is renamed to standard name (e.g., `selected_tags.csv`)
- **AND** label map is reloaded automatically
- **WHEN** hash doesn't match expected value (and expected value is configured)
- **THEN** upload is rejected with error message
- **AND** file is not copied to models directory
- **NOTE**: SHA256 hash values are built into the application configuration. If not configured yet, hash verification is skipped.

#### Scenario: Model paths are resolved from app data directory
- **WHEN** AI functions need to load models
- **THEN** model paths are resolved as `{app_data_dir}/models/{model_name}.onnx`
- **AND** label map path is resolved as `{app_data_dir}/models/selected_tags.csv`
- **AND** paths work in both development and production environments
- **AND** app_data_dir is obtained from Tauri app handle

#### Scenario: Missing models are handled gracefully
- **WHEN** application attempts to load a model
- **AND** model file does not exist at expected path
- **THEN** clear error message is returned to caller
- **AND** error includes expected path and instructions for uploading model
- **AND** application does not crash or panic
- **AND** AI features are disabled in UI

### Requirement: Model Loading and State Management
The system SHALL load models from user-uploaded files and track model availability state.

#### Scenario: Tag model is loaded after successful upload
- **WHEN** user uploads tag model file (.onnx) and label map file (.csv)
- **AND** SHA256 verification passes (if hash is configured in application)
- **THEN** both files are copied to app data directory
- **AND** model loading is triggered automatically
- **AND** ONNX session is created from uploaded model file
- **AND** label map is loaded from uploaded CSV file
- **AND** model session is stored in static `Lazy<Arc<Mutex<Session>>>` for thread-safe access
- **AND** model availability state is updated to "loaded"
- **AND** frontend is notified of model load success

#### Scenario: Model loading fails gracefully
- **WHEN** uploaded model file is corrupted or incompatible
- **THEN** model loading fails with clear error message
- **AND** error message is displayed to user in settings UI
- **AND** model availability state remains "not loaded"
- **AND** uploaded file is not deleted (user can retry or upload different file)

#### Scenario: Model availability state is tracked
- **WHEN** application checks if model is available
- **THEN** system checks if model file exists in app data directory
- **AND** system checks if label map file exists in app data directory
- **AND** system checks if model session is successfully loaded
- **AND** availability state is cached and updated when model is loaded/unloaded
- **AND** state is accessible via Tauri command for frontend queries

#### Scenario: Model can be unloaded
- **WHEN** user removes model file from settings UI
- **THEN** model file is deleted from app data directory
- **AND** model session is dropped (memory freed)
- **AND** model availability state is updated to "not loaded"
- **AND** frontend is notified of model unload
- **AND** all AI features are disabled

