# tag-management Specification

## Purpose
提供标签的CRUD操作、搜索、关联管理等标签管理功能。包括标签查询、添加/删除标签、标签搜索、批量操作等。
## Requirements
### Requirement: Tag Query Operations
The system SHALL provide Tauri commands for querying tag data with alias support.

#### Scenario: All tags are retrieved with alias support
- **WHEN** `get_all_tags()` command is called
- **THEN** all tag records are returned from `Tags` table
- **AND** each tag includes: tag_id, name, alias, type, category_id, file_count
- **AND** alias field is used for display when not NULL
- **AND** original name field is used when alias is NULL
- **AND** tags are ordered by COALESCE(alias, name) ASC for consistent sorting

#### Scenario: Tag search works with both names
- **WHEN** user searches for tags via `search_tags()` command
- **THEN** search matches both original name and alias fields
- **AND** SQL query uses: WHERE name LIKE ? OR alias LIKE ?
- **AND** results display using alias when available
- **AND** results are ordered by file_count DESC, COALESCE(alias, name) ASC

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

### Requirement: Translation Dictionary Management
The system SHALL provide functionality for users to upload and manage translation dictionary files with high fault tolerance.

#### Scenario: User uploads translation dictionary
- **WHEN** user uploads CSV file through settings UI
- **THEN** file format is validated as CSV with required columns: name,translated_name,language_code
- **AND** file is stored in user data directory: `{app_data_dir}/translations/translations.csv`
- **AND** available languages are extracted from the file
- **WHEN** file contains invalid entries or malformed data
- **THEN** invalid rows are skipped with warning messages
- **AND** processing continues with valid entries
- **AND** user is informed about valid/invalid entry counts and available languages

#### Scenario: User selects display language
- **WHEN** user selects a language from available languages
- **THEN** system clears existing aliases in Tags table
- **AND** system applies translations for selected language from dictionary
- **AND** language preference is persisted to application settings
- **AND** tag queries are invalidated to refresh UI with new aliases

#### Scenario: User refreshes translations for new tags
- **WHEN** user clicks refresh button after importing new images
- **THEN** system re-applies translations for current language
- **AND** new tags that exist in dictionary receive their aliases
- **AND** progress is reported to user

#### Scenario: Translation dictionary format validation with fault tolerance
- **WHEN** translation CSV is processed
- **THEN** required columns are validated: name,translated_name,language_code
- **AND** tag names are matched against existing Tags table by name field
- **AND** language_code uses ISO 639-1 format (e.g., "zh", "ja", "es")
- **AND** rows with invalid data are logged and skipped without stopping processing
- **AND** single file can contain multiple languages

#### Scenario: Language preference management
- **WHEN** user selects display language in settings
- **THEN** preference is persisted to application settings
- **AND** system applies translations for that language from dictionary
- **WHEN** translation file is missing or language not in dictionary
- **THEN** system falls back to original English tags
- **AND** user is notified about fallback status

### Requirement: Database Alias Field Management
The system SHALL add and maintain an alias field in the Tags table for efficient translation lookups.

#### Scenario: Alias field is added to Tags table
- **WHEN** database migration runs
- **THEN** `alias` column is added to Tags table with TEXT type
- **AND** column defaults to NULL (no alias)
- **AND** appropriate indexes are created for efficient querying

#### Scenario: Alias refresh processes translations for selected language
- **WHEN** user selects a language
- **THEN** background task clears all existing aliases
- **AND** background task updates Tags.alias field for matching tag names
- **AND** UPDATE statement uses: UPDATE Tags SET alias = ? WHERE name = ?
- **AND** processing handles large datasets in batches to avoid blocking
- **AND** progress is reported via application events
- **AND** errors during refresh are logged but don't stop overall process

#### Scenario: Alias refresh handles missing translations gracefully
- **WHEN** processing tag names not found in translation dictionary
- **THEN** corresponding alias fields remain NULL
- **AND** original English name continues to be used for display

### Requirement: Application-Layer Translation Mapping
The system SHALL implement translation mapping at the application layer without affecting core AI data flow.

#### Scenario: Tag queries use alias when available
- **WHEN** `get_all_tags()` or other tag queries are executed
- **THEN** query returns alias field alongside original name
- **AND** if alias is not NULL, alias is used for display purposes
- **AND** if alias is NULL, original English name is used as fallback
- **AND** tags are ordered by COALESCE(alias, name) ASC for consistent sorting

#### Scenario: Tag search supports both name and alias
- **WHEN** user searches for tags in any search context
- **THEN** search matches both original name and alias fields
- **AND** backend search uses: WHERE name LIKE ? OR alias LIKE ?
- **AND** frontend filtering checks both name and alias properties
- **AND** results display using alias when available

#### Scenario: Tag display uses translation mapping
- **WHEN** UI components display tags
- **THEN** alias field is used when available and not empty
- **AND** original name can be shown as tooltip or secondary text
- **AND** no changes are made to underlying tag storage or AI inference
- **AND** all tag operations (add, remove) continue to use original names

#### Scenario: Translation mapping is transparent to core systems
- **WHEN** AI tagging generates new tags or tag associations are made
- **THEN** original English names are used for all database operations
- **AND** alias field is populated when user triggers refresh
- **AND** AI inference, file associations, and tag management remain unchanged
- **AND** translation mapping only affects display layer

