import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useImportFiles } from "@/lib/hooks/useImportFiles";
import { useBatchAITagging } from "@/lib/hooks/useTagManagement";
import { useTauriEvent } from "@/lib/hooks/useTauriEvent";
import { createToastWithDetails } from "@/lib/utils/notifications";
import type { ProgressEvent } from "@/types";
import { ImportDialog } from "./ImportDialog";

export function ImportButton() {
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState<ProgressEvent | null>(null);
	const [thumbnailProgress, setThumbnailProgress] = useState<ProgressEvent | null>(null);
	const [aiProgress, setAiProgress] = useState<ProgressEvent | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
	const importMutation = useImportFiles();
	const batchAITaggingMutation = useBatchAITagging();

	// Track thumbnail processing state
	const [thumbnailProcessingHashes, setThumbnailProcessingHashes] = useState<Set<string>>(
		new Set()
	);
	const [thumbnailCompleteCount, setThumbnailCompleteCount] = useState(0);
	const [thumbnailTotal, setThumbnailTotal] = useState(0);

	// Track AI tagging processing state
	const [aiTaggingProcessingHashes, setAiTaggingProcessingHashes] = useState<Set<string>>(
		new Set()
	);
	const [aiTaggingCompleteCount, setAiTaggingCompleteCount] = useState(0);
	const [aiTaggingTotal, setAiTaggingTotal] = useState(0);
	// Track processed batch_complete events to prevent duplicate notifications
	const processedBatchCompleteRef = useRef<Set<string>>(new Set());

	// Listen for import progress events
	useTauriEvent<ProgressEvent>("import_progress", (payload) => {
		setImportProgress(payload);
	});

	// Listen for thumbnail progress events
	useTauriEvent<ProgressEvent>("thumbnail_progress", (payload) => {
		setThumbnailProgress(payload);

		if (payload.file_hash) {
			const fileHash = payload.file_hash;
			setThumbnailProcessingHashes((prev) => {
				const next = new Set(prev);
				if (payload.stage === "generating") {
					next.add(fileHash);
				} else if (payload.stage === "complete" || payload.stage === "error") {
					next.delete(fileHash);
					if (payload.stage === "complete") {
						// Backend doesn't send total/current for thumbnails, so we manually count
						setThumbnailCompleteCount((count) => count + 1);
					}
				}
				return next;
			});
		}

		// Update total if provided (backend doesn't send this, but keep for future compatibility)
		if (payload.total !== undefined) {
			setThumbnailTotal(payload.total);
		}
	});

	// Listen for AI tagging progress events
	useTauriEvent<ProgressEvent>("ai_tagging_progress", (payload) => {
		setAiProgress(payload);

		// For batch operations, use the current/total values from backend directly
		// Backend sends current and total in each complete/error/skipped event during batch processing
		if (payload.current !== undefined && payload.total !== undefined) {
			setAiTaggingCompleteCount(payload.current);
			setAiTaggingTotal(payload.total);
			// For batch operations, clear processing hashes since we track by current/total
			// The "processing" count will be calculated as total - current
			setAiTaggingProcessingHashes(new Set());
		} else if (payload.total !== undefined) {
			// Update total if provided (fallback for non-batch events)
			setAiTaggingTotal(payload.total);
		}

		// Track individual file processing (for non-batch operations or per-file status)
		// Note: In batch operations, complete events have file_hash: None, so this only
		// tracks classifying/saving_tags stages
		if (payload.file_hash) {
			const fileHash = payload.file_hash;
			setAiTaggingProcessingHashes((prev) => {
				const next = new Set(prev);
				if (payload.stage === "classifying" || payload.stage === "saving_tags") {
					next.add(fileHash);
				} else if (
					payload.stage === "complete" ||
					payload.stage === "error" ||
					payload.stage === "skipped"
				) {
					// Only remove if we're not in batch mode (batch mode uses current/total)
					// In batch mode, file_hash is None for complete events, so this won't execute
					next.delete(fileHash);
				}
				return next;
			});
		}

		// Handle batch complete - only show toast on batch completion, not per-file
		if (payload.stage === "batch_complete") {
			setAiTaggingProcessingHashes(new Set());
			if (payload.current !== undefined && payload.total !== undefined) {
				setAiTaggingCompleteCount(payload.current);
				setAiTaggingTotal(payload.total);
			}
			// Show summary toast only when batch completes
			// Use a unique key to prevent duplicate notifications
			if (payload.current !== undefined && payload.total !== undefined) {
				const batchKey = `${payload.current}-${payload.total}-${payload.message}`;
				// Only process if we haven't seen this batch completion before
				if (!processedBatchCompleteRef.current.has(batchKey)) {
					processedBatchCompleteRef.current.add(batchKey);
					const successCount = payload.current;
					const totalCount = payload.total;
					const message = `已完成 ${successCount}/${totalCount} 个文件的 AI 标签`;
					createToastWithDetails(
						toast,
						"success",
						"AI 标签批量完成",
						message,
						payload.message
					);
					// Clean up old keys after a delay to prevent memory leak
					setTimeout(() => {
						processedBatchCompleteRef.current.delete(batchKey);
					}, 10000);
				}
			}
		}

		// Only show toast for errors (not per-file completion)
		// Per-file completions are tracked silently, only batch completion shows toast
		if (payload.stage === "error" && !payload.file_hash) {
			// Only show error toast if it's a batch-level error (no file_hash)
			createToastWithDetails(toast, "error", "AI 标签失败", payload.message, payload.message);
		}
	});

	const handleFileSelect = async () => {
		try {
			const selected = await open({
				multiple: true,
				filters: [
					{
						name: "Images",
						extensions: ["jpg", "jpeg", "png", "webp", "gif"],
					},
				],
			});

			if (!selected) {
				return;
			}

			const filePaths = Array.isArray(selected) ? selected : [selected];
			setSelectedFiles(filePaths);
			setDialogOpen(true);
		} catch (error) {
			console.error("File selection failed:", error);
		}
	};

	const handleImportConfirm = async (options: {
		tagNames: string[];
		enableAITagging: boolean;
	}) => {
		setIsImporting(true);
		setImportProgress(null);
		setThumbnailProgress(null);
		setAiProgress(null);

		// Reset progress counters
		setThumbnailProcessingHashes(new Set());
		setThumbnailCompleteCount(0);
		setThumbnailTotal(0);
		setAiTaggingProcessingHashes(new Set());
		setAiTaggingCompleteCount(0);
		setAiTaggingTotal(0);

		try {
			const response = await importMutation.mutateAsync({
				paths: selectedFiles,
				tagNames: options.tagNames,
				enableAITagging: options.enableAITagging,
			});
			const results = response.results;
			const appliedTags = response.tagNames;
			const importedHashes = response.importedHashes || [];

			const imported = results.filter((r) => !r.is_duplicate).length;
			const duplicates = results.filter((r) => r.is_duplicate).length;

			// Initialize total counts based on imported files
			setThumbnailTotal(imported);

			// Start AI tagging after all files are imported (if enabled)
			if (options.enableAITagging && importedHashes.length > 0) {
				console.log(
					"[Import] Starting batch AI tagging for",
					importedHashes.length,
					"files"
				);
				setAiTaggingTotal(importedHashes.length);
				// Start batch AI tagging asynchronously (don't await - let it run in background)
				batchAITaggingMutation.mutateAsync(importedHashes).catch((error) => {
					console.error("[Import] Batch AI tagging failed:", error);
					toast.error(`AI 标签批量处理失败: ${error}`);
				});
			}

			if (imported > 0) {
				const message =
					`导入完成！已导入 ${imported} 个文件` +
					(duplicates > 0 ? `，跳过 ${duplicates} 个重复文件` : "") +
					(appliedTags && appliedTags.length > 0
						? `，应用了 ${appliedTags.length} 个标签`
						: "") +
					(options.enableAITagging ? `。AI 标签处理中...` : "");
				const details =
					`成功导入: ${imported} 个文件\n` +
					(duplicates > 0 ? `跳过重复: ${duplicates} 个文件\n` : "") +
					(appliedTags && appliedTags.length > 0
						? `应用的标签: ${appliedTags.join(", ")}\n`
						: "") +
					(options.enableAITagging ? `AI 标签处理将在后台进行` : `AI 标签已禁用`);
				createToastWithDetails(toast, "success", "导入完成", message, details);
			} else if (duplicates > 0) {
				const message = `所有 ${duplicates} 个文件都是重复的，已跳过`;
				const details = `跳过的重复文件数: ${duplicates}`;
				createToastWithDetails(toast, "info", "导入完成", message, details);
			}

			// Clear selected files
			setSelectedFiles([]);
		} catch (error) {
			console.error("Import failed:", error);
			if (error instanceof Error && error.message !== "No files selected") {
				const message = `导入失败: ${error.message}`;
				const details = `错误详情: ${error.message}\n${error.stack || ""}`;
				createToastWithDetails(toast, "error", "导入失败", message, details);
			}
		} finally {
			setIsImporting(false);
			setImportProgress(null);
		}
	};

	// 检查是否有实际内容要显示
	const hasContent =
		importProgress !== null ||
		(thumbnailProgress !== null && thumbnailProgress.stage === "generating") ||
		(aiProgress !== null &&
			(aiProgress.stage === "classifying" || aiProgress.stage === "saving_tags"));

	return (
		<>
			<div className="relative">
				<Popover open={hasContent}>
					<PopoverTrigger asChild>
						<Button onClick={handleFileSelect} disabled={isImporting}>
							{isImporting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Import Files
								</>
							)}
						</Button>
					</PopoverTrigger>

					{/* Progress indicators */}
					<PopoverContent className="w-[320px] p-4" align="start" sideOffset={8}>
						<div className="space-y-3">
							{/* Import progress */}
							{importProgress && (
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<Loader2 className="h-3 w-3 animate-spin text-blue-600" />
										<p className="text-xs font-medium text-blue-600">Import</p>
									</div>
									<p className="text-xs text-muted-foreground">
										{importProgress.message}
									</p>
								</div>
							)}

							{/* Thumbnail progress */}
							{(thumbnailProcessingHashes.size > 0 ||
								(thumbnailCompleteCount > 0 &&
									thumbnailCompleteCount < thumbnailTotal)) && (
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<Loader2 className="h-3 w-3 animate-spin text-purple-600" />
										<p className="text-xs font-medium text-purple-600">
											缩略图
										</p>
									</div>
									<p className="text-xs text-muted-foreground">
										{thumbnailCompleteCount}/{thumbnailTotal} 完成
										{thumbnailProcessingHashes.size > 0 &&
											` (${thumbnailProcessingHashes.size} 处理中)`}
									</p>
								</div>
							)}

							{/* AI tagging progress */}
							{(aiTaggingProcessingHashes.size > 0 ||
								(aiTaggingCompleteCount > 0 &&
									aiTaggingCompleteCount < aiTaggingTotal)) && (
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<Loader2 className="h-3 w-3 animate-spin text-green-600" />
										<p className="text-xs font-medium text-green-600">
											AI 标签
										</p>
									</div>
									<p className="text-xs text-muted-foreground">
										{aiTaggingCompleteCount}/{aiTaggingTotal} 完成
										{(() => {
											// Calculate processing count: for batch operations use total - current,
											// for individual operations use the Set size
											const processingCount =
												aiTaggingTotal > 0
													? aiTaggingTotal - aiTaggingCompleteCount
													: aiTaggingProcessingHashes.size;
											return processingCount > 0
												? ` (${processingCount} 处理中)`
												: "";
										})()}
									</p>
								</div>
							)}
						</div>
					</PopoverContent>
				</Popover>
			</div>

			{/* Import Dialog */}
			<ImportDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirm={handleImportConfirm}
				fileCount={selectedFiles.length}
			/>
		</>
	);
}
