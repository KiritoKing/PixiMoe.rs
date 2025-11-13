# build-system Specification

## Purpose
TBD - created by archiving change init-project-scaffold. Update Purpose after archive.
## Requirements
### Requirement: Tauri Application Initialization
The system SHALL initialize a Tauri v2 application with React + TypeScript frontend using the official `create-tauri-app` CLI tool.

#### Scenario: Successful project creation
- **WHEN** developer runs `pnpm create tauri-app@latest`
- **AND** selects TypeScript as language
- **AND** selects pnpm as package manager
- **AND** selects React as UI template
- **AND** selects TypeScript as flavor
- **THEN** project structure is created with `src/` (React) and `src-tauri/` (Rust) directories
- **AND** all necessary configuration files are generated (`tauri.conf.json`, `Cargo.toml`, `package.json`, `vite.config.ts`, `tsconfig.json`)

#### Scenario: Application can start in development mode
- **WHEN** developer runs `pnpm install` to install dependencies
- **AND** runs `pnpm tauri dev`
- **THEN** Vite development server starts on localhost
- **AND** Tauri window opens displaying the React application
- **AND** hot module replacement (HMR) is functional for frontend changes

### Requirement: Vite Build Configuration
The system SHALL configure Vite as the build tool with proper settings for Tauri integration.

#### Scenario: Vite serves assets correctly
- **WHEN** application runs in development mode
- **THEN** Vite resolves all module imports correctly
- **AND** Tailwind CSS styles are processed and applied
- **AND** TypeScript files are transpiled without errors
- **AND** Source maps are generated for debugging

#### Scenario: Production build succeeds
- **WHEN** developer runs `pnpm tauri build --debug`
- **THEN** Vite bundles frontend assets with optimizations
- **AND** Rust backend compiles successfully
- **AND** Executable is generated in `src-tauri/target/debug/` directory
- **AND** Application launches without errors

### Requirement: Package Manager Configuration
The system SHALL use pnpm as the primary package manager with proper workspace and caching configuration.

#### Scenario: Dependencies install efficiently
- **WHEN** developer runs `pnpm install` in fresh clone
- **THEN** pnpm uses content-addressable storage for deduplication
- **AND** all dependencies are installed within 60 seconds on standard hardware
- **AND** `node_modules/` directory is created with hard links

#### Scenario: Dependency resolution is strict
- **WHEN** a module imports a package not listed in `package.json`
- **THEN** pnpm raises an error about undeclared dependency
- **AND** build fails until dependency is properly declared

### Requirement: TypeScript Configuration
The system SHALL enforce strict TypeScript type checking across the entire frontend codebase.

#### Scenario: Strict mode catches common errors
- **WHEN** developer writes TypeScript code
- **THEN** compiler enforces strict null checks
- **AND** implicit `any` types are disallowed
- **AND** unused variables and parameters trigger errors
- **AND** all Tauri invoke calls have proper type annotations

#### Scenario: IDE provides accurate type hints
- **WHEN** developer uses VS Code or compatible IDE
- **THEN** IntelliSense provides autocompletion for all imports
- **AND** type errors are highlighted in real-time
- **AND** refactoring tools work correctly with type information

### Requirement: Development Tooling
The system SHALL provide automated code quality tools (ESLint, Prettier) integrated into the development workflow.

#### Scenario: Code formatting is consistent
- **WHEN** developer runs `pnpm format`
- **THEN** Prettier formats all `.ts`, `.tsx`, `.css`, and `.json` files
- **AND** formatting matches project style guide
- **AND** Git hooks (optional) can auto-format on commit

#### Scenario: Linting catches code quality issues
- **WHEN** developer runs `pnpm lint`
- **THEN** ESLint analyzes all TypeScript files
- **AND** React-specific rules (hooks, JSX) are enforced
- **AND** Tauri-specific patterns are validated
- **AND** Errors block CI/CD pipeline

### Requirement: Build Scripts
The system SHALL provide npm scripts for common development tasks in `package.json`.

#### Scenario: Development workflow scripts exist
- **WHEN** developer inspects `package.json`
- **THEN** the following scripts are defined:
  - `dev`: Starts Tauri dev server with HMR
  - `build`: Creates production build
  - `lint`: Runs ESLint checks
  - `format`: Runs Prettier formatting
  - `check`: Runs TypeScript compiler in no-emit mode
- **AND** all scripts execute without configuration errors

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

