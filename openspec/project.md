```markdown
# Project Context

## Purpose
A local-first, AI-powered desktop image gallery application that provides non-destructive photo management with automatic tagging, face detection/recognition, and intelligent organization. The system uses content-addressable storage (BLAKE3 hashing) to ensure data integrity and enable features like automatic deduplication and robust file tracking even when files are moved or renamed.

## Tech Stack
- **Application Framework**: Tauri v2+ (Rust backend + WebView frontend)
- **Backend Language**: Rust
- **Frontend Framework**: React 18+ with TypeScript
- **Build System**: Vite (with HMR for rapid development)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: SQLite with sqlx (async driver, compile-time SQL checking)
- **AI Runtime**: ONNX Runtime (ort crate) with automatic hardware acceleration
- **State Management**: 
  - Zustand for UI state
  - TanStack Query for server/Tauri state with tauri-plugin-store persistence
- **Image Processing**: image-rs crate for WebP thumbnail generation
- **Hashing**: BLAKE3 for content addressing

## Project Conventions

### Code Style
- **Rust**: Follow Rust 2021 edition conventions, use `rustfmt` for formatting
- **TypeScript**: Strict mode enabled, enforce explicit return types, no implicit `any`
- **Naming**: 
  - Rust: snake_case for functions/variables, PascalCase for types/structs
  - TypeScript: camelCase for functions/variables, PascalCase for components/types
  - Database: snake_case for tables and columns
- **Comments**: Use doc comments (`///` in Rust, JSDoc in TypeScript) for public APIs
- **Error Handling**: Use `Result<T, E>` in Rust, never use `unwrap()` in production code paths

### Architecture Patterns
- **Local-First**: All data (database, thumbnails, AI models) runs locally on user's machine
- **Non-Destructive**: Never modify original files; all metadata stored in SQLite
- **Content-Addressed**: Files identified by BLAKE3 hash for deduplication and tracking
- **Async Everything**: Use tokio for async Rust, avoid blocking main thread
- **Star Schema Database**: Files table as central hub with 6 supporting tables
- **Separation of Concerns**: 
  - Rust: Modular structure (db/, commands/, ai/, protocols/)
  - React: Hooks for logic, components for presentation
- **Protocol-Based Thumbnails**: Use Tauri custom protocol (`app-asset://`) with permanent cache headers

### Testing Strategy
- **Unit Tests**: Test pure functions in isolation (Rust: `#[cfg(test)]`, TypeScript: Vitest)
- **Integration Tests**: Test database queries and Tauri commands with test database
- **E2E Tests**: Manual testing for v1.0 MVP, automated E2E deferred to v1.1+
- **Performance**: Document expected AI inference times as baselines

### Git Workflow
- **Branching**: `main` for production-ready code, feature branches for development
- **Commits**: Conventional commits format (feat:, fix:, docs:, refactor:, etc.)
- **Pull Requests**: Required for all changes, must pass validation before merge
- **OpenSpec**: All significant changes require approved proposal before implementation

## Domain Context

### Core Concepts
- **File Hash**: BLAKE3 hash of file content, serves as immutable identifier
- **Logical Folders**: User-created albums/collections (many-to-many with files)
- **Tags**: AI-generated and user-added labels with types (general, character, artist, series)
- **Persons**: Named individuals identified through face clustering
- **Faces**: Individual face instances with 512-dimensional embeddings
- **Thumbnails**: WebP format (400x400px) cached in AppDataDir with content-addressed filenames

### AI Pipeline
1. **Tagging**: SmilingWolf/swin-v2-tagger-v3 model classifies images
2. **Conditional Face Detection**: Only runs if "cosplay" or "photorealistic" tags detected
3. **Face Detection**: SCRFD_kps detects faces and landmarks
4. **Face Alignment**: Affine transform normalizes faces to 112x112px
5. **Face Embedding**: ArcFace (iresnet100) generates 512d vectors
6. **Face Clustering**: DBSCAN with cosine distance groups similar faces (offline process)

### Performance Expectations
- **Hash Calculation**: Limited by disk I/O (~100-200 MB/s on SSD)
- **Thumbnail Generation**: ~50-100ms per image
- **AI Tagging**: ~100-200ms per image on GPU, ~500ms-1s on CPU
- **Face Detection**: ~50-100ms per image on GPU
- **Face Embedding**: ~20-50ms per face on GPU
- **Target Scale**: Handle 10,000+ images efficiently

## Important Constraints
- **Zero-Config AI**: Users must not need to install Python, CUDA, or configure models
- **Non-Destructive**: Original files must never be modified or deleted by application
- **Privacy-First**: All data processing happens locally, no cloud services
- **Startup Tolerance**: v1.0 MVP accepts brief white screen on startup (CSR with Vite)
- **Memory Budget**: Keep peak usage under 4GB for AI processing
- **Disk Space**: WebView cache for thumbnails may grow unbounded in v1.0 (manual cleanup)

## External Dependencies
- **ONNX Models**: 
  - SmilingWolf/swin-v2-tagger-v3 (~100MB)
  - SCRFD_10G_KPS (~20MB)
  - ArcFace iresnet100 (~100MB)
  - Source: Hugging Face or GitHub releases
- **ONNX Runtime**: Automatically downloaded by `ort` crate with `download-binaries` feature
- **Execution Providers**: CUDA (NVIDIA), CoreML (Apple), DirectML (Windows), CPU (fallback)

## v1.0 MVP Scope
- **In Scope**:
  - File import with hash calculation and deduplication
  - Automatic AI tagging and face detection
  - Basic UI for browsing images and tags
  - Thumbnail caching with instant loading
  - SQLite database with 7-table schema
  - File reconnection when paths change
  
- **Out of Scope (Deferred to v1.1+)**:
  - Face clustering UI and manual grouping
  - Advanced search with full-text search (FTS5)
  - NSFW detection
  - Export functionality (ZIP/folder + metadata)
  - Startup optimization (splash screen, SSR)
  - Thumbnail cache size management (LRU eviction)

```
