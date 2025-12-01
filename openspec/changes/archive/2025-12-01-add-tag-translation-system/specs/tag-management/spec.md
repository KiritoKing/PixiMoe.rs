## ADDED Requirements
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

## MODIFIED Requirements
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
