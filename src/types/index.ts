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
	type: string; // Legacy field, kept for backward compatibility
	category_id: number; // New field for category system
	alias?: string | null; // Translated name, null if no translation available
	file_count?: number;
}

export interface TagCategory {
	category_id: number;
	name: string;
	color_code: string;
	is_builtin: boolean;
	sort_order: number;
}

export interface Favorite {
	favorite_id: number;
	file_hash: string;
	created_at: string; // ISO 8601 datetime string
}

export interface ImportResult {
	file_hash: string;
	is_duplicate: boolean;
}

export interface ProgressEvent {
	stage: string;
	message: string;
	file_hash?: string; // Optional file hash for per-file progress tracking
	current?: number; // Current progress (n)
	total?: number; // Total count (m)
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

// Notification types
export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	details?: string; // Expandable details section
	timestamp: number;
	read: boolean;
	pinned: boolean;
}
