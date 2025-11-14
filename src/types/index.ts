// TypeScript type definitions matching Rust backend structures

export interface FileRecord {
  file_hash: string;
  original_path: string;
  file_size_bytes: number;
  file_last_modified: number;
  width: number;
  height: number;
  date_imported: number;
  is_missing: number;
}

export interface Tag {
  tag_id: number;
  name: string;
  type: string;
  file_count?: number;
}

export interface ImportResult {
  file_hash: string;
  is_duplicate: boolean;
}

export interface ProgressEvent {
  stage: string;
  message: string;
  file_hash?: string; // Optional file hash for per-file progress tracking
}

// Specific progress event types for better type checking
export type ImportProgressStage = "hashing" | "saving";
export type ThumbnailProgressStage = "generating" | "complete" | "error";
export type AITaggingProgressStage =
  | "classifying"
  | "saving_tags"
  | "complete"
  | "error"
  | "skipped"
  | "batch_complete";
