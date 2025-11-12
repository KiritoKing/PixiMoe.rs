## ADDED Requirements

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
