# ui-components Specification

## MODIFIED Requirements

### Requirement: File Import Dialog Component
The system SHALL provide a modal dialog for importing files with progress feedback and tagging options.

#### Scenario: Import progress is displayed
- **WHEN** user selects files and confirms
- **THEN** `useImportFiles()` mutation is called for each file sequentially
- **AND** progress indicators show current stage (import → thumbnail → AI tagging)
- **AND** current file number and total count are displayed accurately (e.g., "2 / 5")
- **AND** percentage progress is calculated and displayed
- **AND** UI remains responsive during import
- **AND** AI tagging progress count uses backend-provided `current` and `total` values directly (not manually incremented)
- **AND** AI tagging "processing" count is calculated as `total - current` for batch operations
- **AND** thumbnail progress is tracked manually (since backend doesn't send `total`)

#### Scenario: Import events update progress
- **WHEN** backend emits `import_progress` event
- **THEN** frontend event listener receives event with { file_hash, stage }
- **AND** progress indicator updates to show current stage name
- **AND** stage indicator animates to next step
- **AND** progress state is tracked in component state
- **WHEN** backend emits `ai_tagging_progress` events during batch operations
- **THEN** frontend uses `current` and `total` values directly from backend events
- **AND** progress count is set to `current` value (not manually incremented)
- **AND** "processing" count is calculated as `total - current` for batch operations
- **AND** processing Set is cleared when batch events are received (since they have no `file_hash`)

