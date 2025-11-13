-- 7-Table Schema for AI-Powered Image Gallery
-- Content-addressed file storage with AI-generated metadata

-- Files: Core content-addressed storage (BLAKE3 hash as PK)
CREATE TABLE Files (
    file_hash TEXT PRIMARY KEY NOT NULL,
    original_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_last_modified INTEGER NOT NULL,  -- Unix timestamp
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    date_imported INTEGER NOT NULL,       -- Unix timestamp
    is_missing INTEGER NOT NULL DEFAULT 0 -- Boolean: 0=exists, 1=missing
);

-- Tags: AI-generated and user-created tags (Danbooru-style taxonomy)
CREATE TABLE Tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'general',
    CHECK(type IN ('general', 'character', 'artist', 'series'))
);

-- Folders: User-defined hierarchical organization
CREATE TABLE Folders (
    folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_folder_id INTEGER,
    date_created INTEGER NOT NULL,       -- Unix timestamp
    FOREIGN KEY (parent_folder_id) REFERENCES Folders(folder_id) ON DELETE CASCADE
);

-- Persons: Named individuals for face recognition
CREATE TABLE Persons (
    person_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    cover_face_id INTEGER                -- Reference to representative face
);

-- Faces: Detected faces with embeddings and bounding boxes
CREATE TABLE Faces (
    face_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash TEXT NOT NULL,
    person_id INTEGER,
    embedding BLOB NOT NULL,             -- 512-dimensional ArcFace vector
    box_coords TEXT NOT NULL,            -- JSON: [x1, y1, x2, y2]
    FOREIGN KEY (file_hash) REFERENCES Files(file_hash) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES Persons(person_id) ON DELETE SET NULL
);

-- FileTags: Many-to-many junction (Files ↔ Tags)
CREATE TABLE FileTags (
    file_hash TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (file_hash, tag_id),
    FOREIGN KEY (file_hash) REFERENCES Files(file_hash) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags(tag_id) ON DELETE CASCADE
);

-- FileFolders: Many-to-many junction (Files ↔ Folders)
CREATE TABLE FileFolders (
    file_hash TEXT NOT NULL,
    folder_id INTEGER NOT NULL,
    PRIMARY KEY (file_hash, folder_id),
    FOREIGN KEY (file_hash) REFERENCES Files(file_hash) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES Folders(folder_id) ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX idx_files_date_imported ON Files(date_imported);
CREATE INDEX idx_files_is_missing ON Files(is_missing);
CREATE INDEX idx_tags_name ON Tags(name);
CREATE INDEX idx_tags_type ON Tags(type);
CREATE INDEX idx_faces_file_hash ON Faces(file_hash);
CREATE INDEX idx_faces_person_id ON Faces(person_id);
CREATE INDEX idx_filetags_tag_id ON FileTags(tag_id);
CREATE INDEX idx_filefolders_folder_id ON FileFolders(folder_id);
