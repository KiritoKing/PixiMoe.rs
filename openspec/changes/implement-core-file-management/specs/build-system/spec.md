## ADDED Requirements

### Requirement: Content-Addressable Storage Dependencies
The system SHALL include Rust dependencies for file hashing and thumbnail generation.

#### Scenario: BLAKE3 hashing library is available
- **WHEN** `src-tauri/Cargo.toml` is configured
- **THEN** `blake3` crate is added with latest stable version
- **AND** crate provides `Hasher` struct for incremental hashing
- **AND** crate supports fast SIMD implementations for x86_64 and ARM
- **AND** `cargo check` compiles successfully with new dependency

#### Scenario: WebP image encoding library is available
- **WHEN** thumbnail generation is implemented
- **THEN** `webp` crate is added to dependencies
- **OR** `image` crate is configured with `webp` feature enabled
- **AND** WebP encoder supports quality parameter (0-100)
- **AND** encoding produces output compatible with browser WebView

#### Scenario: Lazy static initialization library is available
- **WHEN** AI model needs to be loaded once at startup
- **THEN** `once_cell` crate is added with `sync` feature
- **AND** `Lazy<T>` type is available for deferred initialization
- **AND** initialization is thread-safe via `Mutex` or `RwLock`

### Requirement: Build Configuration for ONNX Models
The system SHALL configure build process to handle large ONNX model files.

#### Scenario: Model files are excluded from version control
- **WHEN** `.gitignore` is configured
- **THEN** `src-tauri/models/*.onnx` pattern is added
- **AND** `.onnx` files are not committed to Git repository
- **AND** large files do not bloat repository size

#### Scenario: Model files are bundled with release builds
- **WHEN** application is built for distribution
- **THEN** ONNX model files are included in application bundle
- **AND** models are accessible via relative path from executable
- **OR** models are downloaded on first run (future enhancement)
- **AND** bundled application size includes ~100MB for models

#### Scenario: Development environment has models
- **WHEN** developer clones repository
- **THEN** `models/README.md` provides clear download instructions
- **AND** models can be manually downloaded from Hugging Face
- **AND** missing models do not block compilation (only runtime warning)

### Requirement: Frontend Build Dependencies
The system SHALL include necessary npm packages for UI implementation.

#### Scenario: Tauri dialog plugin is available
- **WHEN** import dialog needs to open file picker
- **THEN** `@tauri-apps/plugin-dialog` is installed via npm/pnpm
- **AND** `open()` function is importable in TypeScript
- **AND** file picker supports multiple file selection
- **AND** filters restrict to image formats (jpg, png, webp)

#### Scenario: Event listening API is available
- **WHEN** frontend needs to listen to backend events
- **THEN** `@tauri-apps/api/event` provides `listen()` function
- **AND** events are typed correctly in TypeScript
- **AND** event listeners can be unsubscribed via returned function

### Requirement: Development Build Performance
The system SHALL maintain fast development iteration cycles despite new dependencies.

#### Scenario: Cargo build times remain acceptable
- **WHEN** developer runs `cargo check` or `cargo build`
- **THEN** incremental compilation completes in under 10 seconds (after initial build)
- **AND** `blake3` and `webp` crates compile in parallel
- **AND** `ort` crate uses prebuilt binaries (via `download-binaries` feature)
- **AND** ONNX Runtime is not compiled from source (saves ~30 minutes)

#### Scenario: Frontend HMR continues to work
- **WHEN** developer edits React components
- **THEN** Vite hot module replacement updates browser in under 1 second
- **AND** new TypeScript types from `src/types/` are detected immediately
- **AND** TanStack Query devtools remain functional

### Requirement: Cross-Platform Compatibility
The system SHALL ensure dependencies work on all target platforms.

#### Scenario: BLAKE3 works on all platforms
- **WHEN** application is built on Windows, macOS, and Linux
- **THEN** `blake3` crate compiles without errors on all platforms
- **AND** SIMD optimizations are automatically selected for CPU architecture
- **AND** hash outputs are identical across platforms (deterministic)

#### Scenario: WebP encoding works on all platforms
- **WHEN** thumbnails are generated on different OSes
- **THEN** WebP encoder produces valid files on Windows, macOS, Linux
- **AND** WebView on each platform can display WebP thumbnails
- **AND** no platform-specific workarounds are needed

#### Scenario: ONNX Runtime works on all platforms
- **WHEN** `ort` crate is included
- **THEN** prebuilt binaries are available for Windows x64, macOS x64/ARM64, Linux x64
- **AND** appropriate execution providers are available:
  - Windows: CPU, DirectML (GPU)
  - macOS: CPU, CoreML (Apple Silicon GPU/Neural Engine)
  - Linux: CPU, CUDA (NVIDIA GPU)
- **AND** missing execution providers fall back to CPU gracefully
