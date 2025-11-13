# Design: Core File Management and AI Tagging

## Architecture Overview

This change implements the core data flow of the image gallery application, spanning file I/O, database operations, AI inference, and UI rendering. The design follows the local-first, async-first, content-addressed principles established in `openspec/project.md`.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  ImageGrid  │  TagFilterPanel  │  ImportDialog              │
│                                                              │
│  useFiles()  │  useTags()  │  useImportFiles()             │
│  (TanStack Query + tauri-plugin-store persistence)          │
└────────────┬────────────────────────────────────────────────┘
             │ Tauri IPC (invoke + events)
┌────────────▼────────────────────────────────────────────────┐
│                    Backend (Rust/Tauri)                      │
├─────────────────────────────────────────────────────────────┤
│  Commands    │  import_file, get_all_files, get_all_tags   │
│              │  add_tag_to_file, search_files_by_tags       │
├─────────────────────────────────────────────────────────────┤
│  File Pipeline:                                             │
│    1. Hash (BLAKE3) → 2. DB Check → 3. Thumbnail (WebP)    │
│    4. AI Tag → 5. Insert DB                                 │
├─────────────────────────────────────────────────────────────┤
│  AI Module   │  tagger::classify_image() with ONNX         │
│              │  (spawned in tokio::task::spawn_blocking)    │
├─────────────────────────────────────────────────────────────┤
│  Protocols   │  app-asset:// → serve thumbnails with       │
│              │  permanent cache headers                     │
├─────────────────────────────────────────────────────────────┤
│  Database    │  SqlitePool → Files, Tags, FileTags         │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Content-Addressed Storage with BLAKE3

**Decision**: Use BLAKE3 hash as the primary key for files instead of file paths.

**Rationale**:
- **Deduplication**: Automatically detects identical files even with different names/paths
- **Integrity**: Hash serves as cryptographic checksum; detects corruption
- **Tracking**: Can reconnect files if moved/renamed (future feature)
- **Performance**: BLAKE3 is ~10x faster than SHA256, crucial for large files

**Trade-offs**:
- Adds hashing overhead during import (~100-200 MB/s on SSD, acceptable for user-initiated action)
- Requires handling hash collisions (astronomically rare with 256-bit hash)

**Implementation**:
```rust
use blake3::Hasher;
use std::fs::File;
use std::io::{BufReader, Read};

fn calculate_hash(path: &Path) -> Result<String, Error> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Hasher::new();
    let mut buffer = [0; 8192];
    
    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 { break; }
        hasher.update(&buffer[..count]);
    }
    
    Ok(hasher.finalize().to_hex().to_string())
}
```

### 2. Async Pipeline Architecture

**Decision**: Implement file import as an async pipeline with background tasks and progress events.

**Rationale**:
- **Responsiveness**: Main thread stays responsive during slow I/O and AI inference
- **Progress Feedback**: Users see real-time import status via event streaming
- **Parallelism**: Multiple files can be processed concurrently (future enhancement)

**Implementation Pattern**:
```rust
#[tauri::command]
async fn import_file(
    app: tauri::AppHandle,
    path: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<ImportResult, AppError> {
    // Spawn blocking task for CPU/IO-intensive work
    let handle = tokio::task::spawn_blocking(move || {
        app.emit("import_progress", ProgressEvent { stage: "hashing", ... })?;
        let hash = calculate_hash(&path)?;
        
        // ... thumbnail, AI tagging ...
        
        Ok(hash)
    });
    
    let hash = handle.await??;
    
    // Database operations (async)
    insert_file(&pool, hash, metadata).await?;
    
    Ok(ImportResult { hash, is_duplicate: false })
}
```

### 3. Thumbnail Protocol with Permanent Caching

**Decision**: Serve thumbnails via custom `app-asset://` protocol with `Cache-Control: max-age=31536000, immutable`.

**Rationale**:
- **Content-Addressed**: Thumbnail filename is `{file_hash}.webp`; content never changes → safe for permanent caching
- **Performance**: WebView's disk cache handles storage; no custom LRU logic needed in v1.0
- **Security**: Tauri protocol handler validates paths; no directory traversal risks

**Implementation**:
```rust
use tauri::webview::WebviewWindowBuilder;

fn register_asset_protocol(app: &tauri::App) {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let thumbnail_dir = app_data_dir.join("thumbnails");
    
    app.asset_protocol_scope().allow_directory(&thumbnail_dir, true);
}

// In main.rs setup hook:
tauri::Builder::default()
    .register_asynchronous_uri_scheme_protocol("app-asset", move |_app, request, responder| {
        // Parse request URL: app-asset://thumbnails/{hash}.webp
        // Read file from thumbnail_dir/{hash}.webp
        // Return response with Cache-Control header
    })
```

**Trade-off**:
- v1.0 accepts unbounded cache growth (documented as known limitation)
- v1.1+ will implement LRU eviction when cache exceeds threshold

### 4. AI Tagging Pipeline

**Decision**: Run AI inference in `tokio::task::spawn_blocking` with separate model initialization.

**Rationale**:
- **Initialization Cost**: Loading ONNX model (~100MB) takes ~1-2 seconds; should happen once at startup
- **Thread Safety**: ONNX Runtime session is `Send + Sync`; can be shared across tasks via `Arc<Mutex<Session>>`
- **Blocking I/O**: Model inference is CPU-bound; `spawn_blocking` prevents blocking async executor

**Model Loading Strategy**:
```rust
use ort::{Session, SessionBuilder};
use std::sync::{Arc, Mutex};
use once_cell::sync::Lazy;

static TAGGER_MODEL: Lazy<Arc<Mutex<Session>>> = Lazy::new(|| {
    let model_path = get_model_path("swin-v2-tagger-v3.onnx");
    let session = SessionBuilder::new()
        .unwrap()
        .with_model_from_file(model_path)
        .unwrap();
    Arc::new(Mutex::new(session))
});

pub async fn classify_image(image_path: &Path) -> Result<Vec<Tag>, Error> {
    let path = image_path.to_owned();
    
    tokio::task::spawn_blocking(move || {
        let session = TAGGER_MODEL.lock().unwrap();
        
        // Preprocess image (resize, normalize)
        let input_tensor = preprocess_image(&path)?;
        
        // Run inference
        let outputs = session.run(vec![input_tensor])?;
        
        // Postprocess (parse labels, apply threshold)
        parse_tags(outputs)
    }).await?
}
```

**Threshold Strategy**:
- Use confidence threshold of **0.35** (balances precision/recall for SmilingWolf model)
- Filter out tags with type `'meta'` (not useful for search)
- Limit to top 50 tags per image (prevents database bloat)

### 5. Frontend State Management

**Decision**: Use TanStack Query for file/tag data, Zustand for import progress UI state.

**Rationale**:
- **Separation**: Server state (files, tags) vs transient UI state (progress, dialogs)
- **Caching**: TanStack Query provides automatic caching and refetching
- **Persistence**: Queries are persisted via tauri-plugin-store for instant startup

**Query Invalidation Strategy**:
```typescript
const importFileMutation = useMutation({
  mutationFn: (path: string) => invoke('import_file', { path }),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
  },
});
```

**Event Handling for Progress**:
```typescript
useEffect(() => {
  const unlisten = listen('import_progress', (event) => {
    setProgress(event.payload);
  });
  
  return () => { unlisten.then(fn => fn()); };
}, []);
```

## Performance Considerations

### Import Pipeline Timing (per image)
1. **BLAKE3 Hashing**: ~5-20ms (10MB file @ 500-2000 MB/s)
2. **Database Check**: ~1-5ms (indexed query on primary key)
3. **Thumbnail Generation**: ~50-100ms (resize + WebP encode)
4. **AI Tagging**: ~100-200ms (GPU) / ~500-1000ms (CPU)
5. **Database Insert**: ~5-10ms (transaction with 3 tables)

**Total**: ~200-400ms per image (GPU), ~600-1200ms (CPU)

### Batch Import Optimization (v1.1+)
- v1.0: Sequential processing (simple, predictable)
- v1.1+: Parallel processing with `futures::stream::iter().buffer_unordered(4)`
- Limit concurrency to avoid memory exhaustion (4 images × ~100MB model = ~400MB)

## Error Handling Strategy

### Recoverable Errors
- **Duplicate file**: Return `{ is_duplicate: true }` instead of error
- **Unsupported format**: Skip with warning, continue batch import
- **AI inference failure**: Insert file without tags, log warning

### Non-Recoverable Errors
- **Database connection failure**: Show error dialog, exit gracefully
- **Out of disk space**: Abort import, show clear error message
- **ONNX model missing**: Display setup instructions on first run

## Testing Strategy

### Unit Tests
- `calculate_hash()`: Test with known file content
- `generate_thumbnail()`: Verify WebP output dimensions/quality
- `parse_tags()`: Test threshold filtering and type exclusions

### Integration Tests
- Import same file twice → verify deduplication
- Import then query by tags → verify end-to-end flow
- Thumbnail protocol → verify cache headers and 404 handling

### Manual Testing Checklist
- [ ] Import 100+ images without UI freeze
- [ ] Restart app → verify thumbnails load from cache instantly
- [ ] Import duplicate → verify "already exists" message
- [ ] Filter by multiple tags → verify AND logic
- [ ] Delete `.onnx` model → verify error message clarity

## Future Enhancements (Deferred to v1.1+)

1. **Face Detection**: Conditional pipeline (only if `cosplay` or `photorealistic` tags detected)
2. **Batch Import UI**: Drag-and-drop folder, bulk progress bar
3. **Thumbnail Cache Management**: LRU eviction when exceeds 500MB
4. **Import Queue**: Persistent queue for large batches (survive app restart)
5. **Export Functionality**: ZIP archive with sidecar JSON metadata
