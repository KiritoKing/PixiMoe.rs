# database-infrastructure Specification Deltas

## ADDED Requirements

### Requirement: User Tag Management Commands
The system SHALL provide Tauri commands for adding and removing tags from files.

#### Scenario: Add tag to single file
- **WHEN** `add_tag_to_file(file_hash, tag_name, tag_type?)` command is invoked
- **THEN** tag is looked up in Tags table by name
- **AND** if tag does not exist, new tag is inserted with specified type (default: "general")
- **AND** file-tag association is inserted into FileTags table
- **AND** if association already exists, operation is idempotent (no error)
- **AND** command returns tag_id and success status

#### Scenario: Remove tag from single file
- **WHEN** `remove_tag_from_file(file_hash, tag_id)` command is invoked
- **THEN** file-tag association is deleted from FileTags table
- **AND** tag remains in Tags table (not deleted)
- **AND** if association does not exist, operation is idempotent (no error)
- **AND** command returns success status

#### Scenario: Add tags to multiple files (batch)
- **WHEN** `add_tags_to_files(file_hashes[], tag_names[], tag_type?)` command is invoked
- **THEN** each tag is looked up or created in Tags table
- **AND** for each file-tag pair, association is inserted into FileTags table
- **AND** all insertions happen in single transaction
- **AND** duplicate associations are ignored (INSERT OR IGNORE)
- **AND** command returns count of associations created

#### Scenario: Remove tag from multiple files (batch)
- **WHEN** `remove_tag_from_files(file_hashes[], tag_id)` command is invoked
- **THEN** all matching associations are deleted from FileTags table in single transaction
- **AND** command returns count of associations removed

#### Scenario: Create new tag with type
- **WHEN** `create_tag(name, type)` command is invoked
- **THEN** tag is inserted into Tags table with specified name and type
- **AND** if tag with name already exists, error is returned with existing tag_id
- **AND** type is validated against enum: general, character, artist, series
- **AND** command returns new tag_id

### Requirement: Tag Search and Autocomplete
The system SHALL provide commands for searching tags by name prefix for autocomplete functionality.

#### Scenario: Search tags by prefix
- **WHEN** `search_tags(prefix, limit?)` command is invoked
- **THEN** Tags table is queried with `WHERE name LIKE 'prefix%'`
- **AND** results are sorted by usage count (file count descending, then alphabetically)
- **AND** up to `limit` results are returned (default: 20)
- **AND** each result includes tag_id, name, type, and file_count

#### Scenario: Get all tags with usage counts
- **WHEN** `get_all_tags()` command is invoked
- **THEN** all tags are fetched from Tags table
- **AND** each tag is joined with FileTags to calculate file count
- **AND** results are sorted by type (general, character, artist, series) then alphabetically
- **AND** tags with zero files are included (for completeness)

### Requirement: Import-Time Tag Association
The system SHALL support applying tags to files during import operation.

#### Scenario: Tags are applied during import
- **WHEN** `import_file_with_tags(path, tag_names[])` command is invoked
- **THEN** file import pipeline executes normally (hash, thumbnail, insert)
- **AND** after file insert, each tag_name is looked up or created
- **AND** file-tag associations are inserted for all specified tags
- **AND** import returns file_hash and list of applied tag_ids
- **AND** AI-generated tags are added separately (not replaced by user tags)

#### Scenario: Invalid tags are rejected
- **WHEN** tag_name contains invalid characters (e.g., SQL injection attempt)
- **THEN** command returns validation error before database operation
- **WHEN** tag_type is not in allowed enum
- **THEN** command returns error: "Invalid tag type"
