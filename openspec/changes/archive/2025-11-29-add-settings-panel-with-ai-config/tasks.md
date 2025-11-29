# Implementation Tasks

## 1. Backend: Model Upload and SHA256 Verification
- [ ] 1.1 Create `src-tauri/src/commands/settings.rs` module
- [ ] 1.2 Implement `upload_tag_model_file(file_path)` Tauri command
- [ ] 1.3 Calculate SHA256 hash for uploaded file using `sha2` crate
- [ ] 1.4 Compare hash with expected value from built-in configuration (if configured)
- [ ] 1.5 If hash doesn't match and expected value is configured, reject upload with error
- [ ] 1.6 If hash matches or no expected value is configured, copy file to `{app_data_dir}/models/swin-v2-tagger-v3.onnx`
- [ ] 1.7 Return success/error status to frontend
- [ ] 1.8 Implement `upload_label_map_file(file_path)` command
- [ ] 1.9 Calculate SHA256 hash for CSV file
- [ ] 1.10 Compare hash with expected value from built-in configuration (if configured)
- [ ] 1.11 Copy label map file to `{app_data_dir}/models/selected_tags.csv` after verification (or if no expected hash)
- [ ] 1.12 Add `sha2` dependency to `Cargo.toml`
- [ ] 1.13 Add built-in configuration structure for SHA256 hash values (can be empty initially)

## 2. Backend: Model Loading from App Data Directory
- [ ] 2.1 Modify `get_models_dir()` in `src-tauri/src/ai/tagger.rs` to use app_data_dir
- [ ] 2.2 Get app_data_dir from Tauri app handle (pass via function parameter or static)
- [ ] 2.3 Update model path resolution to `{app_data_dir}/models/swin-v2-tagger-v3.onnx`
- [ ] 2.4 Update label map path resolution to `{app_data_dir}/models/selected_tags.csv`
- [ ] 2.5 Ensure directory is created automatically if it doesn't exist
- [ ] 2.6 Test model loading in both development and production environments

## 2.5. Backend: Fix Image Preprocessing to Match Official Implementation
- [ ] 2.5.1 Update `preprocess_image()` to convert image to RGBA if needed
- [ ] 2.5.2 Composite image onto white background (255, 255, 255)
- [ ] 2.5.3 Convert to RGB format
- [ ] 2.5.4 Pad image to square shape (centered on white background)
- [ ] 2.5.5 Resize padded image to 448x448 using BICUBIC interpolation (instead of Lanczos3)
- [ ] 2.5.6 Convert RGB channels to BGR format (reverse channel order: `[:, :, ::-1]`)
- [ ] 2.5.7 Normalize pixel values to [0.0, 1.0] range
- [ ] 2.5.8 Test preprocessing with various image aspect ratios

## 3. Backend: Model State Management
- [ ] 3.1 Implement `get_model_status()` Tauri command in `commands/settings.rs`
- [ ] 3.2 Return model status object: `{ is_loaded, model_file_exists, label_map_exists, model_path, label_map_path, error }`
- [ ] 3.3 Update `is_model_available()` to check app_data_dir instead of source directory
- [ ] 3.4 Ensure model state is updated when model is uploaded/removed
- [ ] 3.5 Add model reload functionality after upload (drop old session, reload)

## 3.5. Backend: Fix Postprocessing to Match Official Implementation
- [ ] 3.5.1 Update label map loading to track category indexes (rating=9, general=0, character=4)
- [ ] 3.5.2 Separate predictions by category (rating, general, character)
- [ ] 3.5.3 Implement rating selection using argmax (highest confidence)
- [ ] 3.5.4 Implement separate threshold filtering for general tags (category 0)
- [ ] 3.5.5 Implement separate threshold filtering for character tags (category 4)
- [ ] 3.5.6 Implement MCut threshold algorithm function
- [ ] 3.5.7 Add MCut support for general tags (optional, configurable)
- [ ] 3.5.8 Add MCut support for character tags (optional, configurable, min 0.15)
- [ ] 3.5.9 Update `classify_image()` to accept inference configuration parameters
- [ ] 3.5.10 Test postprocessing with various threshold combinations

## 4. Backend: Inference Configuration Management
- [ ] 4.1 Create `InferenceConfig` struct with fields: `general_threshold`, `character_threshold`, `general_mcut_enabled`, `character_mcut_enabled`, `max_tags`
- [ ] 4.2 Implement `get_inference_config()` Tauri command to load config from storage
- [ ] 4.3 Implement `set_inference_config(config)` Tauri command to save config to storage
- [ ] 4.4 Use Tauri Store plugin to persist configuration
- [ ] 4.5 Load default configuration on first run (0.35, 0.85, false, false, 50)
- [ ] 4.6 Update `classify_image()` to load and use inference configuration
- [ ] 4.7 Test configuration persistence across application restarts

## 5. Backend: Model Debugging Commands
- [ ] 5.1 Implement `debug_model_preprocess(image_path)` command
- [ ] 5.2 Return preprocessed image data and parameters
- [ ] 5.3 Implement `debug_model_inference(image_path, config?)` command
- [ ] 5.4 Return inference results, timing, execution provider info
- [ ] 5.5 Implement `debug_model_postprocess(probabilities, config)` command
- [ ] 5.6 Return separated predictions by category (rating, general, character)
- [ ] 5.7 Return filtered predictions and final tag list
- [ ] 5.8 Ensure all debug commands are dry-run (no database writes)

## 6. Frontend: Settings Panel UI Structure
- [ ] 5.1 Create `src/components/settings/` directory
- [ ] 5.2 Create `SettingsPanel.tsx` component with Sheet/Dialog from shadcn/ui
- [ ] 5.3 Implement left sidebar navigation (Account, AI Settings, Notifications, Connections, Offline)
- [ ] 5.4 Implement right content area with dynamic component rendering
- [ ] 5.5 Add settings icon/button to top toolbar in `App.tsx`
- [ ] 5.6 Implement navigation state management (useState or URL params)
- [ ] 5.7 Style settings panel to match Notion-style layout

## 6. Frontend: AI Settings Page
- [ ] 6.1 Create `AISettingsPage.tsx` component
- [ ] 6.2 Implement "ONNX AI Features" section (left side)
- [ ] 6.3 Add "Tag" sub-section (标签模型)
- [ ] 6.4 Create upload area for .onnx model file (dashed border, upload icon)
- [ ] 6.5 Create upload area for .csv label map file (dashed border, upload icon)
- [ ] 6.6 Add "识别" (Recognition) button (placeholder for future functionality)
- [ ] 6.7 Add information note about SHA256 verification (hash values are built into application, can be left empty)
- [ ] 6.8 Implement "LLM Interface By Network API" section (right side, placeholder for now)
- [ ] 6.9 Style page to match example image layout

## 7. Frontend: Model Upload UI
- [ ] 7.1 Create `ModelUploadArea.tsx` component for ONNX model file
- [ ] 7.2 Create `LabelMapUploadArea.tsx` component for CSV file
- [ ] 7.3 Implement file picker integration (use Tauri dialog API)
- [ ] 7.4 Show upload progress indicator
- [ ] 7.5 Display upload success/error messages
- [ ] 7.6 Display SHA256 verification status (if hash is configured in application)
- [ ] 7.7 Create `useUploadTagModel()` hook using TanStack Query mutation
- [ ] 7.8 Create `useUploadLabelMap()` hook
- [ ] 7.9 Update model status after successful upload

## 9. Frontend: Model Status Display
- [ ] 8.1 Create `ModelStatusDisplay.tsx` component
- [ ] 8.2 Display current model status (loaded/not loaded)
- [ ] 8.3 Show model file path and label map path
- [ ] 8.4 Display error messages if model loading failed
- [ ] 8.5 Add "Remove Model" button to delete model files
- [ ] 8.6 Create `useModelStatus()` hook to query model status
- [ ] 8.7 Auto-refresh status when model is uploaded/removed

## 10. Frontend: Inference Configuration UI
- [ ] 10.1 Create `InferenceConfigPanel.tsx` component
- [ ] 10.2 Add "Inference Configuration" section to AI Settings page
- [ ] 10.3 Implement general threshold slider (0.0 - 1.0, step 0.05, default 0.35)
- [ ] 10.4 Implement character threshold slider (0.0 - 1.0, step 0.05, default 0.85)
- [ ] 10.5 Add "Use MCut for General Tags" checkbox
- [ ] 10.6 Add "Use MCut for Character Tags" checkbox
- [ ] 10.7 Add max tags input (1 - 100, default 50)
- [ ] 10.8 Create `useInferenceConfig()` hook to load/save configuration
- [ ] 10.9 Add "Save Configuration" button with enabled/disabled state
- [ ] 10.10 Show success message after saving configuration
- [ ] 10.11 Display current configuration values on load

## 11. Frontend: AI Feature Disabling
- [ ] 9.1 Create `useModelAvailability()` hook
- [ ] 9.2 Update `ImportButton.tsx` to disable AI tagging when model unavailable
- [ ] 9.3 Update "Run AI Tagging" buttons to be disabled when model unavailable
- [ ] 9.4 Add tooltips explaining why features are disabled
- [ ] 9.5 Show notification/message when user tries to use disabled AI features

## 12. Frontend: Model Debugging UI
- [ ] 10.1 Create `ModelDebugPanel.tsx` component
- [ ] 10.2 Add "Upload Test Image" button and file picker
- [ ] 10.3 Display uploaded test image in "Input" section
- [ ] 10.4 Implement step-by-step mode toggle
- [ ] 10.5 Add "Preprocess" button and display preprocessed image
- [ ] 10.6 Add "Run Inference" button and display inference results
- [ ] 10.7 Add "Postprocess" button and display final tag predictions
- [ ] 10.8 Add parameter adjustment controls (threshold slider, max tags input)
- [ ] 10.9 Add "Re-run Inference" button for parameter changes
- [ ] 10.10 Create `useDebugModel()` hooks for each debug step
- [ ] 10.11 Ensure debug results are not saved to database

## 13. Integration and Testing
- [ ] 11.1 Test model upload with valid SHA256 hash
- [ ] 11.2 Test model upload with invalid SHA256 hash (should reject)
- [ ] 11.3 Test model upload without SHA256 hash (should accept)
- [ ] 11.4 Test model loading from app_data_dir in development mode
- [ ] 11.5 Test model loading from app_data_dir in production mode
- [ ] 11.6 Test AI features are disabled when model not loaded
- [ ] 11.7 Test model debugging with various images
- [ ] 11.8 Test parameter adjustment in debug mode
- [ ] 11.9 Verify debug mode doesn't write to database
- [ ] 11.10 Test settings panel navigation and responsiveness

## 14. Documentation and Cleanup
- [ ] 12.1 Add Rust doc comments to new Tauri commands
- [ ] 12.2 Add JSDoc comments to new React components and hooks
- [ ] 12.3 Update README.md with model upload instructions
- [ ] 12.4 Remove debug logging (eprintln!) from production code paths
- [ ] 12.5 Run `openspec validate add-settings-panel-with-ai-config --strict`

## Dependencies and Parallelization Notes
- **Task 1 (Model Upload) is CRITICAL**: Must be completed first as it's the foundation
- **Task 2.5 (Fix Preprocessing) is CRITICAL**: Must be done before Task 3.5 to ensure correct preprocessing
- **Task 3.5 (Fix Postprocessing) is CRITICAL**: Must be done before Task 4 to ensure correct postprocessing
- Tasks 2-3 (Model Loading and State) depend on Task 1
- Task 2.5 (Fix Preprocessing) can be done in parallel with Task 2
- Task 3.5 (Fix Postprocessing) depends on Task 2.5
- Task 4 (Inference Configuration) depends on Task 3.5
- Tasks 6-7 (Settings UI) can be developed in parallel with backend tasks
- Task 8 (Model Upload UI) depends on Task 1 (backend commands)
- Task 9 (Model Status) depends on Task 3 (backend status command)
- Task 10 (Inference Configuration UI) depends on Task 4 (backend config commands)
- Task 11 (AI Feature Disabling) depends on Task 3
- Task 12 (Model Debugging) depends on Task 5 (backend debug commands)
- Tasks 13-14 should be done after all implementation tasks are complete

