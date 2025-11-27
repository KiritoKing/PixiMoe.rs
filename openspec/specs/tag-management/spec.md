# tag-management Specification

## Purpose
提供标签的CRUD操作、搜索、关联管理等标签管理功能。包括标签查询、添加/删除标签、标签搜索、批量操作等。

## Requirements
### Requirement: Tag Query Operations
The system SHALL provide Tauri commands for querying tag data from the database.

#### Scenario: All tags are retrieved with file counts
- **WHEN** `get_all_tags()` command is called
- **THEN** all tag records are returned from `Tags` table
- **AND** each tag includes: tag_id, name, type
- **AND** file_count is calculated via COUNT JOIN with FileTags table
- **AND** tags are ordered by name ASC alphabetically
- **AND** query uses appropriate indexes for performance

#### Scenario: File-specific tags are retrieved
- **WHEN** `get_file_tags(file_hash)` command is called
- **THEN** tags associated with specified file are returned
- **AND** query joins FileTags and Tags tables
- **AND** WHERE clause filters by file_hash
- **AND** tags are ordered by type, then name
- **AND** empty array is returned if file has no tags

### Requirement: Tag Management Operations
The system SHALL support adding and removing tags from files.

#### Scenario: Tag is added to file
- **WHEN** `add_tag_to_file(file_hash, tag_name)` command is called
- **THEN** tag_id is looked up in `Tags` table by name
- **WHEN** tag does not exist
- **THEN** new tag record is inserted with inferred type (default 'general')
- **AND** tag_id is retrieved
- **THEN** record is inserted into `FileTags` table with (file_hash, tag_id)
- **WHEN** association already exists
- **THEN** duplicate key constraint is handled gracefully (no error)
- **AND** command returns success

#### Scenario: Tag is removed from file
- **WHEN** `remove_tag_from_file(file_hash, tag_id)` command is called
- **THEN** matching record is deleted from `FileTags` table
- **AND** WHERE clause filters by both file_hash AND tag_id
- **AND** command returns success even if association did not exist
- **AND** tag record in `Tags` table is not deleted (may be used by other files)

### Requirement: Tag-Based File Search
The system SHALL support searching files by multiple tags with AND logic.

#### Scenario: Files are filtered by single tag
- **WHEN** `search_files_by_tags([tag_id])` command is called with one tag
- **THEN** all files associated with that tag are returned
- **AND** query joins Files and FileTags tables
- **AND** WHERE clause filters by tag_id
- **AND** files are ordered by date_imported DESC

#### Scenario: Files are filtered by multiple tags (AND logic)
- **WHEN** `search_files_by_tags([tag_id1, tag_id2, tag_id3])` is called
- **THEN** only files that have ALL specified tags are returned
- **AND** query uses GROUP BY with HAVING COUNT(*) = number of tags
- **AND** intersection logic ensures exact match of all tags
- **AND** empty result is returned if no files match all criteria

#### Scenario: Empty tag list returns all files
- **WHEN** `search_files_by_tags([])` is called with empty array
- **THEN** all files are returned (no filtering)
- **AND** behavior matches `get_all_files()`
- **AND** same ordering is applied (date_imported DESC)

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
- **WHEN** `import_file(path, tag_names[])` command is invoked with tag_names parameter
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

