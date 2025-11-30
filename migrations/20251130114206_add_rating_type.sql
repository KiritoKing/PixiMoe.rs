-- Add rating type support to Tags table
-- This migration enables AI classification restoration by allowing 'rating' tag type

-- Since SQLite doesn't support ALTER CONSTRAINT directly,
-- we need to recreate the table with updated CHECK constraint

-- Create new Tags table with 'rating' type support
CREATE TABLE Tags_new (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'general',
    CHECK(type IN ('general', 'character', 'artist', 'series', 'rating'))
);

-- Copy data from old table
INSERT INTO Tags_new (tag_id, name, type)
SELECT tag_id, name, type FROM Tags;

-- Drop the old table
DROP TABLE Tags;

-- Rename the new table to original name
ALTER TABLE Tags_new RENAME TO Tags;

-- Recreate indexes for performance
CREATE INDEX idx_tags_name ON Tags(name);
CREATE INDEX idx_tags_type ON Tags(type);
