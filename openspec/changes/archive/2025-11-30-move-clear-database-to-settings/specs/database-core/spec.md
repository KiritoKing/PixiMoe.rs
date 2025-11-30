# database-core Specification

## ADDED Requirements

### Requirement: Database Clearing Command
The system SHALL provide a Tauri command for clearing all database data with confirmation text validation.

#### Scenario: Clear database command validates confirmation text
- **WHEN** `clear_database(confirmation: String)` command is called
- **THEN** confirmation text is validated against required value: `CLEAR_ALL_DATA_PERMANENTLY`
- **WHEN** confirmation text does not match
- **THEN** command returns error: "Invalid confirmation text"
- **WHEN** confirmation text matches
- **THEN** command proceeds with database clearing operation
- **AND** all tables are cleared in order: FileTags, FileFolders, Faces, Files, Tags, Folders, Persons
- **AND** auto-increment sequences are reset
- **AND** progress events are emitted during operation
- **AND** command returns summary of cleared tables and record counts

