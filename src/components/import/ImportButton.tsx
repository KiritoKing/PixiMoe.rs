import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useBatchAITagging, useImportFiles } from "@/lib/hooks";
import { createToastWithDetails } from "@/lib/utils/notifications";
import type { ProgressEvent } from "@/types";
import { ImportDialog } from "./ImportDialog";

export function ImportButton() {
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState<ProgressEvent | null>(
		null,
	);
	const [thumbnailProgress, setThumbnailProgress] =
		useState<ProgressEvent | null>(null);
	const [aiProgress, setAiProgress] = useState<ProgressEvent | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
	const importMutation = useImportFiles();
	const batchAITaggingMutation = useBatchAITagging();

	// Track thumbnail processing state
	const [thumbnailProcessingHashes, setThumbnailProcessingHashes] = useState<
		Set<string>
	>(new Set());
	const [thumbnailCompleteCount, setThumbnailCompleteCount] = useState(0);
	const [thumbnailTotal, setThumbnailTotal] = useState(0);

	// Track AI tagging processing state
	const [aiTaggingProcessingHashes, setAiTaggingProcessingHashes] = useState<
		Set<string>
	>(new Set());
	const [aiTaggingCompleteCount, setAiTaggingCompleteCount] = useState(0);
	const [aiTaggingTotal, setAiTaggingTotal] = useState(0);

	useEffect(() => {
		// Listen for import progress events
		const unlistenImport = listen<ProgressEvent>("import_progress", (event) => {
			setImportProgress(event.payload);
		});

		// Listen for thumbnail progress events
		const unlistenThumbnail = listen<ProgressEvent>(
			"thumbnail_progress",
			(event) => {
				setThumbnailProgress(event.payload);
				const payload = event.payload;

				if (payload.file_hash) {
					setThumbnailProcessingHashes((prev) => {
						const next = new Set(prev);
						if (payload.stage === "generating") {
							next.add(payload.file_hash);
						} else if (
							payload.stage === "complete" ||
							payload.stage === "error"
						) {
							next.delete(payload.file_hash);
							if (payload.stage === "complete") {
								setThumbnailCompleteCount((count) => count + 1);
							}
						}
						return next;
					});
				}

				// Update total if provided
				if (payload.total !== undefined) {
					setThumbnailTotal(payload.total);
				}
			},
		);

		// Listen for AI tagging progress events
		const unlistenAi = listen<ProgressEvent>("ai_tagging_progress", (event) => {
			setAiProgress(event.payload);
			const payload = event.payload;

			if (payload.file_hash) {
				setAiTaggingProcessingHashes((prev) => {
					const next = new Set(prev);
					if (
						payload.stage === "classifying" ||
						payload.stage === "saving_tags"
					) {
						next.add(payload.file_hash);
					} else if (
						payload.stage === "complete" ||
						payload.stage === "error" ||
						payload.stage === "skipped"
					) {
						next.delete(payload.file_hash);
						if (payload.stage === "complete") {
							setAiTaggingCompleteCount((count) => count + 1);
						}
					}
					return next;
				});
			}

			// Update total if provided
			if (payload.total !== undefined) {
				setAiTaggingTotal(payload.total);
			}

			// Handle batch complete
			if (payload.stage === "batch_complete") {
				setAiTaggingProcessingHashes(new Set());
				if (payload.current !== undefined && payload.total !== undefined) {
					setAiTaggingCompleteCount(payload.current);
					setAiTaggingTotal(payload.total);
				}
			}

			// Show toast for AI tagging completion with notification center integration
			if (payload.stage === "complete") {
				createToastWithDetails(
					toast,
					"success",
					"AI 标签完成",
					payload.message,
					`文件哈希: ${payload.file_hash || "未知"}\n${payload.message}`,
				);
			} else if (payload.stage === "error") {
				createToastWithDetails(
					toast,
					"error",
					"AI 标签失败",
					payload.message,
					`文件哈希: ${payload.file_hash || "未知"}\n错误: ${payload.message}`,
				);
			}
		});

		return () => {
			unlistenImport.then((fn) => fn());
			unlistenThumbnail.then((fn) => fn());
			unlistenAi.then((fn) => fn());
		};
	}, []);

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
					"files",
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
					(options.enableAITagging
						? `AI 标签处理将在后台进行`
						: `AI 标签已禁用`);
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
			(aiProgress.stage === "classifying" ||
				aiProgress.stage === "saving_tags"));

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
					<PopoverContent
						className="w-[320px] p-4"
						align="start"
						sideOffset={8}
					>
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
										{aiTaggingProcessingHashes.size > 0 &&
											` (${aiTaggingProcessingHashes.size} 处理中)`}
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
