-- Add alias field to Tags table for translation support
-- This migration adds an alias column to store translated tag names

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
CREATE TABLE Tags_new (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'general',
    category_id INTEGER NOT NULL DEFAULT 1,
    alias TEXT,
    CHECK(type IN ('general', 'character', 'artist', 'series', 'rating')),
    FOREIGN KEY (category_id) REFERENCES TagCategories(category_id)
);

-- Copy data from old table
INSERT INTO Tags_new (tag_id, name, type, category_id, alias)
SELECT tag_id, name, type, category_id, NULL FROM Tags;

-- Drop the old table
DROP TABLE Tags;

-- Rename the new table to original name
ALTER TABLE Tags_new RENAME TO Tags;

-- Recreate indexes
CREATE INDEX idx_tags_name ON Tags(name);
CREATE INDEX idx_tags_type ON Tags(type);
CREATE INDEX idx_tags_category_id ON Tags(category_id);
CREATE INDEX idx_tags_alias ON Tags(alias);
