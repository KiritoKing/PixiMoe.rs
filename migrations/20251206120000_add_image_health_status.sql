-- Add health status tracking for images
-- Supports comprehensive image health checking system

-- Add health status columns to Files table
ALTER TABLE Files
ADD COLUMN thumbnail_health INTEGER NOT NULL DEFAULT 0; -- 0=healthy, 1=missing, 2=corrupted

ALTER TABLE Files
ADD COLUMN last_health_check INTEGER DEFAULT NULL; -- Unix timestamp of last health check

-- Indexes for health status queries
CREATE INDEX idx_files_thumbnail_health ON Files(thumbnail_health);
CREATE INDEX idx_files_last_health_check ON Files(last_health_check);