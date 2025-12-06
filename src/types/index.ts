// TypeScript type definitions matching Rust backend structures

export type ImageHealthStatus =
	| "healthy"
	| "thumbnail_missing"
	| "original_missing"
	| "both_missing"
	| "original_corrupted"
	| "thumbnail_corrupted";

export interface FileRecord {
	file_hash: string;
	original_path: string;
	file_size_bytes: number;
	file_last_modified: number;
	width: number;
	height: number;
	date_imported: number;
	is_missing: number;
	thumbnail_health?: number; // 0=healthy, 1=missing, 2=corrupted
	last_health_check?: number; // Unix timestamp
	health_status?: ImageHealthStatus;
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

// Health check related types
export interface HealthCheckResult {
	total_checked: number;
	healthy_count: number;
	issues_found: number;
	thumbnail_missing_count: number;
	original_missing_count: number;
	thumbnail_corrupted_count: number;
	original_corrupted_count: number;
	both_missing_count: number;
	has_missing_originals: boolean;
}

export interface HealthCheckProgressEvent {
	stage: string;
	message: string;
	file_hash?: string;
	current?: number;
	total?: number;
	status?: ImageHealthStatus;
}

export interface FileWithHealthStatus extends FileRecord {
	thumbnail_health: number;
	last_health_check?: number;
}

export interface RecoveryResult {
	success: boolean;
	message: string;
	regenerated_count?: number;
}
