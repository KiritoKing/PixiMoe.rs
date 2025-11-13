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

