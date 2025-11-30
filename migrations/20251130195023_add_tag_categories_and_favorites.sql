-- Add TagCategories table and Favorites table
-- This migration implements Phase 1.1 of the Enhanced Tag System

-- ============================================================================
-- 1. Create TagCategories table
-- ============================================================================
CREATE TABLE TagCategories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color_code TEXT NOT NULL DEFAULT '#6B7280',
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Insert built-in categories
INSERT INTO TagCategories (name, color_code, is_builtin, sort_order) VALUES
    ('GENERAL', '#10B981', TRUE, 1),
    ('CHARACTER', '#3B82F6', TRUE, 2),
    ('RATING', '#EF4444', TRUE, 3),
    ('ARTIST', '#F59E0B', TRUE, 4);

-- ============================================================================
-- 2. Add category_id column to Tags table
-- ============================================================================
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
CREATE TABLE Tags_new (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'general',
    category_id INTEGER NOT NULL DEFAULT 1,
    CHECK(type IN ('general', 'character', 'artist', 'series', 'rating')),
    FOREIGN KEY (category_id) REFERENCES TagCategories(category_id)
);

-- Copy data from old table and map types to categories
-- Map 'general' type to GENERAL category (1)
INSERT INTO Tags_new (tag_id, name, type, category_id)
SELECT tag_id, name, type, 1 FROM Tags WHERE type = 'general';
-- Map 'character' type to CHARACTER category (2)
INSERT INTO Tags_new (tag_id, name, type, category_id)
SELECT tag_id, name, type, 2 FROM Tags WHERE type = 'character';
-- Map 'rating' type to RATING category (3)
INSERT INTO Tags_new (tag_id, name, type, category_id)
SELECT tag_id, name, type, 3 FROM Tags WHERE type = 'rating';
-- Map 'artist' type to ARTIST category (4)
INSERT INTO Tags_new (tag_id, name, type, category_id)
SELECT tag_id, name, type, 4 FROM Tags WHERE type = 'artist';
-- Map 'series' type to GENERAL category (1) as fallback
INSERT INTO Tags_new (tag_id, name, type, category_id)
SELECT tag_id, name, type, 1 FROM Tags WHERE type = 'series';

-- Drop the old table
DROP TABLE Tags;

-- Rename the new table to original name
ALTER TABLE Tags_new RENAME TO Tags;

-- Recreate indexes
CREATE INDEX idx_tags_name ON Tags(name);
CREATE INDEX idx_tags_type ON Tags(type);
CREATE INDEX idx_tags_category_id ON Tags(category_id);

-- ============================================================================
-- 3. Create Favorites table
-- ============================================================================
CREATE TABLE Favorites (
    favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash TEXT NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_hash) REFERENCES Files(file_hash) ON DELETE CASCADE
);

-- Create index for favorites
CREATE INDEX idx_favorites_file_hash ON Favorites(file_hash);
CREATE INDEX idx_favorites_created_at ON Favorites(created_at);

