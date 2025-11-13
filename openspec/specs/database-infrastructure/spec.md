# database-infrastructure Specification

## Purpose
TBD - created by archiving change init-project-scaffold. Update Purpose after archive.
## Requirements
### Requirement: SQLite Database with sqlx
The system SHALL use sqlx as the async SQLite driver with compile-time query validation and migration management.

#### Scenario: sqlx dependencies are configured
- **WHEN** `src-tauri/Cargo.toml` is configured
- **THEN** `sqlx` dependency is added with features: `runtime-tokio`, `sqlite`, `macros`
- **AND** `tokio` is configured with `full` feature set
- **AND** all dependencies compile successfully

#### Scenario: Database connection pool is initialized
- **WHEN** Tauri application starts
- **THEN** `SqlitePool` is created in `main.rs` setup hook
- **AND** pool is configured with appropriate limits (max_connections: 5)
- **AND** pool is registered as managed state via `.manage(pool)`
- **AND** pool is accessible in all Tauri commands via `State<SqlitePool>`

#### Scenario: Database migrations run automatically
- **WHEN** application starts with uninitialized database
- **THEN** sqlx migration runner checks `migrations/` directory
- **AND** all pending migrations are applied in order
- **AND** migration history is stored in `_sqlx_migrations` table
- **AND** application startup completes successfully
- **WHEN** migrations fail
- **THEN** application shows error message and exits gracefully

### Requirement: Database Schema Implementation
The system SHALL implement the 7-table schema as defined in the technical specification.

#### Scenario: Files table structure
- **WHEN** initial migration is applied
- **THEN** `Files` table is created with columns:
  - `file_hash TEXT PRIMARY KEY NOT NULL` (BLAKE3 hash)
  - `original_path TEXT NOT NULL`
  - `file_size_bytes INTEGER NOT NULL`
  - `file_last_modified INTEGER NOT NULL`
  - `width INTEGER NOT NULL`
  - `height INTEGER NOT NULL`
  - `date_imported INTEGER NOT NULL`
  - `is_missing INTEGER NOT NULL DEFAULT 0`
- **AND** primary key constraint is enforced on `file_hash`

#### Scenario: Tags table structure
- **WHEN** initial migration is applied
- **THEN** `Tags` table is created with columns:
  - `tag_id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `name TEXT NOT NULL UNIQUE`
  - `type TEXT NOT NULL DEFAULT 'general'`
- **AND** unique constraint prevents duplicate tag names
- **AND** check constraint validates type is one of: 'general', 'character', 'artist', 'series'

#### Scenario: Folders table structure
- **WHEN** initial migration is applied
- **THEN** `Folders` table is created with columns:
  - `folder_id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `name TEXT NOT NULL`
  - `parent_folder_id INTEGER`
  - `date_created INTEGER NOT NULL`
- **AND** foreign key constraint on `parent_folder_id` references `Folders(folder_id)`
- **AND** self-referential hierarchy is supported

#### Scenario: Persons table structure
- **WHEN** initial migration is applied
- **THEN** `Persons` table is created with columns:
  - `person_id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `name TEXT NOT NULL UNIQUE`
  - `cover_face_id INTEGER`
- **AND** unique constraint prevents duplicate person names

#### Scenario: Faces table structure
- **WHEN** initial migration is applied
- **THEN** `Faces` table is created with columns:
  - `face_id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `file_hash TEXT NOT NULL`
  - `person_id INTEGER`
  - `embedding BLOB NOT NULL` (512-dimensional vector)
  - `box_coords TEXT NOT NULL` (JSON: [x1, y1, x2, y2])
- **AND** foreign key on `file_hash` references `Files(file_hash)` with `ON DELETE CASCADE`
- **AND** foreign key on `person_id` references `Persons(person_id)` with `ON DELETE SET NULL`

#### Scenario: FileTags junction table structure
- **WHEN** initial migration is applied
- **THEN** `FileTags` table is created with columns:
  - `file_hash TEXT NOT NULL`
  - `tag_id INTEGER NOT NULL`
- **AND** composite primary key on `(file_hash, tag_id)` prevents duplicates
- **AND** foreign key on `file_hash` references `Files(file_hash)` with `ON DELETE CASCADE`
- **AND** foreign key on `tag_id` references `Tags(tag_id)` with `ON DELETE CASCADE`

#### Scenario: FileFolders junction table structure
- **WHEN** initial migration is applied
- **THEN** `FileFolders` table is created with columns:
  - `file_hash TEXT NOT NULL`
  - `folder_id INTEGER NOT NULL`
- **AND** composite primary key on `(file_hash, folder_id)` prevents duplicates
- **AND** foreign key on `file_hash` references `Files(file_hash)` with `ON DELETE CASCADE`
- **AND** foreign key on `folder_id` references `Folders(folder_id)` with `ON DELETE CASCADE`

### Requirement: sqlx CLI Integration
The system SHALL use sqlx-cli for database management and migration authoring.

#### Scenario: sqlx-cli is installed
- **WHEN** developer follows setup instructions
- **THEN** command `cargo install sqlx-cli --no-default-features --features sqlite` succeeds
- **AND** `sqlx` command is available in PATH
- **AND** sqlx version is compatible with project dependencies

#### Scenario: Database can be created
- **WHEN** developer runs `sqlx database create`
- **THEN** SQLite database file is created at path specified in `DATABASE_URL`
- **AND** file permissions allow read/write access
- **AND** subsequent commands can connect successfully

#### Scenario: Migrations can be created
- **WHEN** developer runs `sqlx migrate add <name>`
- **THEN** new migration file is created in `migrations/` directory
- **AND** filename includes timestamp and provided name
- **AND** file contains empty `-- Add migration script here` template

#### Scenario: Migrations can be applied
- **WHEN** developer runs `sqlx migrate run`
- **THEN** all pending migrations are executed in order
- **AND** `_sqlx_migrations` table tracks applied migrations
- **AND** command exits with success code

#### Scenario: Compile-time checking works
- **WHEN** developer uses `query!()` or `query_as!()` macros
- **AND** `DATABASE_URL` environment variable is set
- **THEN** SQL queries are validated against actual database schema at compile time
- **AND** invalid SQL causes compilation error with clear message
- **AND** query results have correct Rust types

### Requirement: Database Module Organization
The system SHALL organize database code in a modular Rust structure.

#### Scenario: Database module exists
- **WHEN** `src-tauri/src/db/mod.rs` is created
- **THEN** module exports `init_pool()` function for pool creation
- **AND** module exports `run_migrations()` function for migration runner
- **AND** module is imported in `main.rs`

#### Scenario: Error handling is centralized
- **WHEN** database errors occur
- **THEN** `sqlx::Error` is converted to custom `AppError` type via `From` trait
- **AND** errors include context about which operation failed
- **AND** errors are properly serialized for Tauri command responses

### Requirement: Environment Configuration
The system SHALL use environment variables for database configuration with proper validation.

#### Scenario: DATABASE_URL is required
- **WHEN** application attempts to connect to database
- **AND** `DATABASE_URL` environment variable is not set
- **THEN** application fails with clear error message
- **AND** error message includes example of correct format

#### Scenario: DATABASE_URL format is validated
- **WHEN** `DATABASE_URL` is set to invalid value
- **THEN** connection attempt fails with descriptive error
- **AND** error explains expected format: `sqlite://path/to/database.db`

#### Scenario: .env file is loaded in development
- **WHEN** application runs in development mode
- **AND** `.env` file exists in project root
- **THEN** `dotenvy` or equivalent crate loads variables
- **AND** variables are available to Rust code
- **AND** `.env` is listed in `.gitignore`

### Requirement: File Query Operations
The system SHALL provide Tauri commands for querying file records from the database.

#### Scenario: All files can be retrieved
- **WHEN** frontend calls `get_all_files()` command
- **THEN** all file records are returned from `Files` table
- **AND** records are ordered by `date_imported DESC` (newest first)
- **AND** response includes all columns: file_hash, original_path, dimensions, file_size, dates, is_missing status
- **AND** query executes in under 100ms for 10,000 files

#### Scenario: Pagination is supported
- **WHEN** `get_all_files(offset, limit)` is called with parameters
- **THEN** only the specified range of records is returned
- **AND** offset starts from 0
- **AND** limit defaults to 100 if not specified
- **AND** subsequent pages can be fetched by incrementing offset

#### Scenario: Single file can be retrieved by hash
- **WHEN** `get_file_by_hash(file_hash)` is called
- **THEN** file record is returned if exists
- **AND** associated tags are included via LEFT JOIN with FileTags and Tags tables
- **AND** response includes tag names, types, and IDs
- **WHEN** hash does not exist
- **THEN** `None` is returned (not an error)

### Requirement: File Import with Deduplication
The system SHALL support importing files with automatic content-based deduplication.

#### Scenario: New file is imported successfully
- **WHEN** `import_file(path)` command is called with valid image path
- **THEN** file content is hashed using BLAKE3
- **AND** database is queried for existing hash
- **AND** if hash does not exist, new record is inserted into `Files` table
- **AND** record includes: file_hash, original_path, file_size_bytes, file_last_modified, width, height, date_imported
- **AND** `is_missing` is set to 0 (file exists)
- **AND** command returns `{ file_hash, is_duplicate: false }`

#### Scenario: Duplicate file is detected
- **WHEN** `import_file(path)` is called with file that has existing hash
- **THEN** database query finds matching file_hash
- **AND** no new record is inserted
- **AND** command returns `{ file_hash, is_duplicate: true }` immediately
- **AND** no thumbnail or AI processing occurs

#### Scenario: File metadata is extracted correctly
- **WHEN** new image file is imported
- **THEN** image dimensions (width, height) are extracted using `image` crate
- **AND** file size in bytes is read from filesystem metadata
- **AND** file last modified timestamp is read from filesystem
- **AND** current timestamp is recorded as date_imported
- **AND** all values are stored as integers (Unix timestamps for dates)

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

### Requirement: Transaction Safety for File Import
The system SHALL ensure data consistency when importing files with tags.

#### Scenario: File import is atomic
- **WHEN** `import_file()` operation inserts file record and tags
- **THEN** all database operations occur within a single transaction
- **AND** if any operation fails (file insert, tag insert, junction insert), all changes are rolled back
- **AND** database remains consistent (no orphaned records)
- **WHEN** transaction commits
- **THEN** all data is durably persisted to disk

#### Scenario: AI tagging failures do not corrupt database
- **WHEN** AI tagging fails after file record is inserted
- **THEN** file record remains in database with is_missing=0
- **AND** file has no tags in FileTags table (expected state)
- **AND** user can manually add tags later
- **AND** AI tagging can be retried without duplicating file record

