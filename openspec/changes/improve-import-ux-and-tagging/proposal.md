# Change: Improve Import UX and Tagging Capabilities

## Why
Current file import experience blocks user interaction with modal dialogs, lacks visibility into processing stages, and doesn't support manual tagging. Users cannot see what's happening during import, cannot click-to-enlarge images, and have no way to add or batch-add tags to images. The automatic thumbnail regeneration feature at startup also lacks spec documentation.

## What Changes
- **Non-blocking notifications**: Replace blocking `alert()` dialogs with toast notifications for immediate feedback
- **Persistent notification center**: Add notification history panel with full details, filtering, and persistence across sessions
- **Async thumbnail generation**: Move thumbnail creation to background thread pool to unblock import pipeline
- **Detailed progress tracking**: Show separate progress for file import vs AI tagging with real-time updates
- **Complete AI tagger implementation**: Implement full ONNX inference pipeline for SmilingWolf/swin-v2-tagger-v3 model (currently stub)
- **Image lightbox viewer**: Add click-to-enlarge functionality for viewing full-resolution images
- **Manual tagging UI**: Implement tag selection/creation for single and batch-tagged files
- **Manual AI tagging**: Allow users to run AI tagging on existing files (single or batch selection)
- **Import-time tagging**: Allow users to apply tags during import workflow
- **Startup thumbnail regeneration spec**: Document existing auto-regeneration behavior in specifications

## Impact
- Affected specs:
  - `ui-framework`: Add notification system, image viewer, and manual tagging components
  - `media-processing`: Multi-threaded thumbnail generation, startup thumbnail regeneration
  - `ai-runtime`: Separate AI tagging progress from import pipeline
  - `database-infrastructure`: Add user-initiated tag operations (already supported by schema)

- Affected code:
  - `src-tauri/src/commands/files.rs`: Refactor thumbnail generation to use thread pool, separate AI progress events
  - `src/components/ImportButton.tsx`: Replace alerts with toast notifications and notification center integration
  - `src/components/ImageGrid.tsx`: Add click handler for lightbox viewer
  - `src/components/`: New components for ImageViewer, TagInput, NotificationCenter, NotificationToast
  - `src/lib/hooks/`: New hooks for tag management, notifications, and notification persistence
  - `src/lib/stores/`: New Zustand store for notification state management
