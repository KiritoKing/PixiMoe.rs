# ai-runtime Specification

## Purpose
提供通用的AI模块结构和异步执行基础设施。这是AI功能的组织层，具体的AI任务实现（如图像分类、人脸检测）在各自的spec中定义（ai-tagging等）。

## Requirements
### Requirement: AI Module Structure
The system SHALL organize AI inference code in a dedicated module with clear separation of concerns.

#### Scenario: AI module exists
- **WHEN** `src-tauri/src/ai/mod.rs` is created
- **THEN** module exports public functions for each AI capability:
  - `classify_image()` for tagging (SmilingWolf model) - see ai-tagging spec
  - `detect_faces()` for face detection (SCRFD model) - future feature
  - `extract_face_embedding()` for face recognition (ArcFace model) - future feature
- **AND** module is imported in `main.rs`
- **AND** functions are callable from Tauri commands

#### Scenario: Model loading is optimized
- **WHEN** AI module initializes
- **THEN** ONNX models are loaded once at startup into static or lazy-initialized state
- **AND** subsequent inference calls reuse loaded models
- **AND** model loading failures are caught and logged clearly
