## Context
This is the foundational architectural setup for a local-first, AI-powered image gallery desktop application. The system is built on Tauri v2 (Rust backend + WebView frontend) with the following core principles:

- **Local-First**: All data (database, thumbnails, AI models) runs locally on user's machine
- **Non-Destructive**: Original files are never modified; all metadata stored in SQLite
- **Content-Addressed**: Files identified by BLAKE3 hash for deduplication and robust tracking
- **Zero-Config AI**: ONNX Runtime automatically selects optimal hardware (NPU > GPU > CPU)

The application manages approximately 10,000+ images with AI-driven tagging, face detection/recognition, and organizing capabilities.

## Goals / Non-Goals

### Goals
1. **Establish robust foundation**: Set up all core technologies (Tauri, React, SQLite, ONNX Runtime) with proper configuration
2. **Enable rapid iteration**: Configure hot module replacement (HMR) via Vite for fast frontend development
3. **Database-first design**: Implement the 7-table schema that serves as the "central brain" of the application
4. **State management clarity**: Separate UI state (Zustand) from server state (TanStack Query) with persistence
5. **Developer experience**: Provide comprehensive tooling (TypeScript strict mode, linting, formatting) and documentation

### Non-Goals
1. **UI polish**: v1.0 MVP accepts brief startup white screen; SSR/splash optimization deferred to v1.1+
2. **Advanced features**: No facial clustering algorithms, AI model optimization, or complex UI animations in this phase
3. **Production deployment**: Focus on local development setup; CI/CD and release builds come later
4. **Cross-platform testing**: Initial development targets single platform; multi-OS validation deferred

## Decisions

### Decision 1: sqlx over rusqlite
**Rationale**: 
- Compile-time SQL validation prevents runtime errors
- Native async/await support (rusqlite requires blocking or manual thread pools)
- Built-in migration system via `sqlx-cli`
- Better integration with Tokio runtime that Tauri uses

**Alternatives considered**:
- `rusqlite`: Simpler API but lacks async and compile-time checking
- `diesel`: Too heavyweight for embedded SQLite use case

### Decision 2: TanStack Query + tauri-plugin-store for persistence
**Rationale**:
- TanStack Query provides automatic cache management, deduplication, and background refetching
- `tauri-plugin-store` is the official Tauri solution for persistent key-value storage
- Custom Persister adapter bridges the two systems cleanly
- Survives app restarts for "instant" load experience

**Alternatives considered**:
- Manual localStorage management: Too low-level, reinvents TanStack Query's cache
- IndexedDB: Overkill for simple cache persistence
- Rust-side cache: Would require custom serialization and duplicate state management

### Decision 3: ONNX Runtime with `download` strategy
**Rationale**:
- Cross-platform AI inference without Python/CUDA installation
- Automatic hardware acceleration (CUDA > CoreML > DirectML > CPU)
- `download` strategy fetches prebuilt binaries, avoiding massive build times
- Models are `.onnx` format (framework-agnostic)

**Alternatives considered**:
- `tract`: Pure Rust but lacks hardware acceleration support
- `candle`: Emerging but immature ecosystem compared to ONNX
- Python/PyTorch: Requires users to install Python toolchain (violates zero-config principle)

### Decision 4: shadcn/ui over component libraries
**Rationale**:
- Components are copied into project (full control, no version lock-in)
- Built on Radix UI (accessibility out of the box)
- Tailwind CSS for styling (no CSS-in-JS runtime overhead)
- Highly customizable without ejecting from framework

**Alternatives considered**:
- Material-UI: Heavy bundle size, React-specific styling constraints
- Ant Design: Less customizable, opinionated design system
- Headless UI: Requires more manual styling work

### Decision 5: pnpm over npm/yarn
**Rationale**:
- Disk space efficiency via content-addressable storage
- Strict dependency resolution (catches phantom dependencies)
- Faster installation than npm
- Better monorepo support (future-proofing)

## Architecture Patterns

### Backend Module Structure
```
src-tauri/src/
├── main.rs              # Tauri setup, protocol registration, command registration
├── error.rs             # Centralized AppError with thiserror
├── db/
│   ├── mod.rs           # SqlitePool initialization and migration runner
│   └── queries.rs       # Raw SQL query functions (future)
├── commands/
│   ├── mod.rs           # All #[tauri::command] exports
│   ├── files.rs         # File-related commands
│   ├── tags.rs          # Tag-related commands
│   └── faces.rs         # Face-related commands (future)
├── ai/
│   ├── mod.rs           # ONNX Runtime session management
│   ├── tagger.rs        # SmilingWolf model inference
│   └── face.rs          # SCRFD + ArcFace pipeline (future)
└── protocols/
    └── thumbnails.rs    # app-asset:// handler
```

### Frontend Module Structure
```
src/
├── main.tsx            # Entry point with QueryClientProvider
├── App.tsx             # Root component with routing
├── components/
│   ├── ui/             # shadcn/ui components (copied)
│   └── gallery/        # Custom gallery components (future)
├── hooks/
│   ├── useTags.ts      # TanStack Query hooks for tags
│   ├── useFiles.ts     # TanStack Query hooks for files
│   └── useUI.ts        # Zustand hooks for UI state
└── lib/
    ├── tauri.ts        # Typed Tauri invoke wrappers
    └── persister.ts    # Custom TanStack Query persister
```

### Database Schema Relationships
```
Files (1) ----< FileTags >---- (N) Tags
  |                              |
  |                              └── type: 'general' | 'character' | 'artist' | 'series'
  |
  ├──< FileFolders >---- (N) Folders
  |                              |
  |                              └── parent_folder_id (self-referential hierarchy)
  |
  └──< Faces ---- (N:1) ---- Persons
       |                         |
       └── embedding (512d)      └── name, cover_face_id
```

## Risks / Trade-offs

### Risk 1: sqlx compile-time checks require DATABASE_URL
**Impact**: CI/CD must have database or use offline mode
**Mitigation**: 
- Use `sqlx prepare` to generate `.sqlx/` directory for offline compilation
- Document requirement in CI/CD setup guide
- Provide Docker compose for consistent development environment

### Risk 2: ONNX Runtime binary size
**Impact**: Release builds will be 50-100MB larger due to runtime libraries
**Mitigation**:
- Acceptable trade-off for zero-config user experience
- Future: explore dynamic loading of execution providers (only download CUDA if detected)

### Risk 3: WebView cache size unbounded
**Impact**: Thumbnail cache could grow indefinitely on disk
**Mitigation**:
- v1.0: Document manual cache cleanup via AppDataDir
- v1.1+: Implement LRU eviction policy with configurable size limit

### Risk 4: First-run AI indexing can take hours
**Impact**: Poor user experience if not communicated clearly
**Mitigation**:
- Prominent progress UI (% complete, current file, ETA)
- Pausable/resumable indexing via task queue
- "Fast mode" option: hash + thumbnail only, defer AI analysis

## Migration Plan
N/A - This is the initial project setup with no existing state to migrate.

## Open Questions
1. **Model distribution strategy**: Should ONNX models be bundled in release builds or downloaded on first launch?
   - Bundled: Larger installer (300MB+), works offline immediately
   - Download: Smaller installer, requires internet on first run
   - **Recommendation**: Start with bundled for v1.0 MVP simplicity

2. **Database location**: Should SQLite file be in AppDataDir or configurable by user?
   - AppDataDir: Simple, cross-platform, automatic cleanup on uninstall
   - User-configurable: More control, easier backup, but complex UX
   - **Recommendation**: AppDataDir for v1.0, add config option in v1.1

3. **Error telemetry**: How to handle crashes/errors in production?
   - **Recommendation**: Defer to v1.1+, focus on local logging first
