# file-management Specification

## Purpose
提供文件导入、查询、去重等文件管理功能。包括基于BLAKE3哈希的内容寻址存储、自动去重、文件元数据提取和查询操作。

## Requirements
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

