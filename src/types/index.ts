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
  stage: "hashing" | "thumbnail" | "ai" | "saving";
  message: string;
}
