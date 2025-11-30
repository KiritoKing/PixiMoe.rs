import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { listen } from "@tauri-apps/api/event";
import { ImageIcon, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BatchTagEditor } from "@/components/tags/BatchTagEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddFavorites, useRemoveFavorites } from "@/lib/hooks/useFavorites";
import { useDeleteFile, useDeleteFilesBatch, useFiles } from "@/lib/hooks/useFiles";
import type { FileRecord, ProgressEvent } from "@/types";
import { BatchOperationsBar } from "./BatchOperationsBar";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ImageCard } from "./ImageCard";
import { ImageViewer } from "./ImageViewer"; // Extend Window interface to store resize observer

declare global {
	interface Window {
		__imageGridResizeObserver?: ResizeObserver;
		pendingDeleteFileHash?: string;
	}
}

interface ImageGridProps {
	files?: FileRecord[];
	isLoading?: boolean;
}

// Calculate number of columns based on container width
// Dynamically calculates maximum columns that fit in the available width
// Minimum item size: 120px, gap: 16px, padding: 16px * 2
function getColumnCount(
	width: number,
	minItemSize: number = 120,
	gap: number = 16,
	padding: number = 32
): number {
	if (width <= 0) return 2; // Fallback

	const availableWidth = width - padding;
	if (availableWidth <= 0) return 2;

	// Calculate maximum columns that can fit
	// Formula: availableWidth >= columns * minItemSize + (columns - 1) * gap
	// Solve for columns: columns <= (availableWidth + gap) / (minItemSize + gap)
	const maxColumns = Math.floor((availableWidth + gap) / (minItemSize + gap));

	// Ensure at least 2 columns, and cap at a reasonable maximum (e.g., 10)
	return Math.max(2, Math.min(maxColumns, 10));
}

type ThumbnailSize = "small" | "medium" | "large";

export function ImageGrid({ files: customFiles, isLoading: customLoading }: ImageGridProps) {
	const { data: fetchedFiles, isLoading: fetchLoading } = useFiles();
	const deleteFileMutation = useDeleteFile();
	const deleteFilesBatchMutation = useDeleteFilesBatch();
	const addFavoritesMutation = useAddFavorites();
	const removeFavoritesMutation = useRemoveFavorites();

	const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
	const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
	const [selectionMode, setSelectionMode] = useState(false);
	const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
	const [thumbnailLoadingHashes, setThumbnailLoadingHashes] = useState<Set<string>>(new Set());
	const [thumbnailTimestamps, setThumbnailTimestamps] = useState<Map<string, number>>(new Map());
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [containerWidth, setContainerWidth] = useState(0);
	const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("small");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteDialogIsBatch, setDeleteDialogIsBatch] = useState(false);
	const [deleteDialogFileCount, setDeleteDialogFileCount] = useState(1);

	const files = customFiles ?? fetchedFiles ?? [];
	const isLoading = customLoading ?? fetchLoading;

	// Refs for virtual scrolling
	const parentRef = useRef<HTMLDivElement>(null); // Scroll container
	const containerRef = useRef<HTMLDivElement>(null); // Virtual content container
	const widthMeasureRef = useRef<HTMLDivElement>(null); // Container for width measurement

	// Constants for layout calculation
	const gap = 16; // gap-4 = 16px
	const padding = 16; // p-4 = 16px
	// Dynamic minItemSize based on thumbnail size selection
	// Use more distinct values to ensure visible differences
	const minItemSize = useMemo(() => {
		switch (thumbnailSize) {
			case "small":
				return 100;
			case "medium":
				return 160;
			case "large":
				return 240;
			default:
				return 100;
		}
	}, [thumbnailSize]);

	// Calculate column count based on container width
	// Use dynamic calculation with actual gap and padding values
	const columnCount = useMemo(() => {
		// If width not measured yet, try to estimate from parent or window
		if (containerWidth === 0) {
			// Try to get width from parent element if available
			if (widthMeasureRef.current?.parentElement) {
				const parentWidth = widthMeasureRef.current.parentElement.clientWidth;
				if (parentWidth > 0) {
					return getColumnCount(parentWidth, minItemSize, gap, padding * 2);
				}
			}
			// Fallback to window width
			if (typeof window !== "undefined") {
				return getColumnCount(window.innerWidth, minItemSize, gap, padding * 2);
			}
			return 2; // Fallback default
		}
		return getColumnCount(containerWidth, minItemSize, gap, padding * 2);
	}, [containerWidth, minItemSize]);

	// Use callback ref to ensure we get the element when it's mounted
	const widthMeasureCallbackRef = useCallback((element: HTMLDivElement | null) => {
		widthMeasureRef.current = element;
		if (element) {
			setContainerWidth(element.clientWidth);
		}
	}, []);

	// Measure container width on mount and resize
	useEffect(() => {
		const updateWidth = () => {
			const element = widthMeasureRef.current;
			if (element) {
				const width = element.clientWidth;
				if (width > 0) {
					setContainerWidth(width);
				}
			}
		};

		const measureElement = widthMeasureRef.current;

		// Set up window resize listener immediately (doesn't need ref)
		const handleWindowResize = () => {
			updateWidth();
		};
		window.addEventListener("resize", handleWindowResize);

		// Set up ResizeObserver if element is available
		let resizeObserver: ResizeObserver | null = null;
		if (measureElement) {
			resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const width = entry.contentRect.width;
					if (width > 0) {
						setContainerWidth(width);
					}
				}
			});
			resizeObserver.observe(measureElement);
		} else {
			// Retry after a short delay
			const timeoutId = setTimeout(() => {
				const element = widthMeasureRef.current;
				if (element) {
					const observer = new ResizeObserver((entries) => {
						for (const entry of entries) {
							const width = entry.contentRect.width;
							if (width > 0) {
								setContainerWidth(width);
							}
						}
					});
					observer.observe(element);
					// Store observer reference for cleanup
					window.__imageGridResizeObserver = observer;
				}
				updateWidth();
			}, 200);

			return () => {
				clearTimeout(timeoutId);
				window.removeEventListener("resize", handleWindowResize);
				if (window.__imageGridResizeObserver) {
					window.__imageGridResizeObserver.disconnect();
					delete window.__imageGridResizeObserver;
				}
			};
		}

		// Initial measurement
		updateWidth();

		// Also try after a short delay in case layout hasn't settled
		const timeoutId1 = setTimeout(updateWidth, 0);
		const timeoutId2 = setTimeout(updateWidth, 100);

		return () => {
			clearTimeout(timeoutId1);
			clearTimeout(timeoutId2);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			window.removeEventListener("resize", handleWindowResize);
			if (window.__imageGridResizeObserver) {
				window.__imageGridResizeObserver.disconnect();
				delete window.__imageGridResizeObserver;
			}
		};
	}, []); // Empty deps - only run on mount/unmount

	// Calculate item size (considering gap)
	const availableWidth = containerWidth > 0 ? containerWidth - padding * 2 : 0;
	const itemSize = useMemo(() => {
		if (columnCount === 0) return minItemSize; // Default estimate
		if (containerWidth === 0 || availableWidth <= 0) {
			// Estimate based on window width if container not measured yet
			if (typeof window !== "undefined") {
				const estimatedWidth = window.innerWidth - padding * 2;
				if (estimatedWidth > 0 && columnCount > 0) {
					return Math.floor((estimatedWidth - gap * (columnCount - 1)) / columnCount);
				}
			}
			return minItemSize; // Fallback
		}
		// Calculate item size to exactly fill available width without overflow
		// Formula: (availableWidth - gaps) / columns
		// gaps = gap * (columnCount - 1)
		const calculatedSize = Math.floor((availableWidth - gap * (columnCount - 1)) / columnCount);
		// Use minItemSize as target size, but allow slight adjustment if needed
		// This ensures visible differences between size options
		// If calculated size is close to minItemSize (within 20px), use minItemSize
		// Otherwise, use calculated size but ensure it's at least minItemSize
		if (Math.abs(calculatedSize - minItemSize) < 20) {
			return minItemSize;
		}
		// Ensure minimum size
		return Math.max(calculatedSize, minItemSize);
	}, [columnCount, containerWidth, availableWidth, minItemSize]);

	// Calculate total number of rows
	const totalRows = Math.ceil(files.length / columnCount);
	// Row height = item size + gap (for spacing between rows)
	const rowHeight = itemSize + gap;

	// Configure virtualizer for rows
	// Recreate when columnCount changes to ensure proper row calculation
	const virtualizer = useVirtualizer({
		count: totalRows,
		getScrollElement: () => parentRef.current,
		estimateSize: () => rowHeight,
		overscan: 2, // Render 2 extra rows above and below viewport
	});

	// Force remeasure when columnCount or containerWidth changes
	useEffect(() => {
		if (columnCount > 0 && virtualizer) {
			// Use requestAnimationFrame to ensure DOM has updated
			requestAnimationFrame(() => {
				virtualizer.measure();
			});
		}
	}, [columnCount, virtualizer]);

	// Listen for thumbnail generation events
	useEffect(() => {
		const unlistenThumbnail = listen<ProgressEvent>("thumbnail_progress", (event) => {
			const { stage, file_hash } = event.payload;

			if (file_hash) {
				if (stage === "generating") {
					setThumbnailLoadingHashes((prev) => new Set(prev).add(file_hash));
				} else if (stage === "complete") {
					console.log(`Thumbnail complete for ${file_hash}, updating timestamp`);
					// Remove from loading set
					setThumbnailLoadingHashes((prev) => {
						const newSet = new Set(prev);
						newSet.delete(file_hash);
						return newSet;
					});
					// Update timestamp to force cache bust
					setThumbnailTimestamps((prev) => {
						const newMap = new Map(prev);
						newMap.set(file_hash, Date.now());
						return newMap;
					});
				} else if (stage === "error") {
					setThumbnailLoadingHashes((prev) => {
						const newSet = new Set(prev);
						newSet.delete(file_hash);
						return newSet;
					});
				}
			}
		});

		return () => {
			unlistenThumbnail.then((fn) => fn());
		};
	}, []);

	const handleNavigate = (direction: "prev" | "next") => {
		if (!selectedFile) return;
		const currentIndex = files.findIndex((f) => f.file_hash === selectedFile.file_hash);
		if (direction === "prev" && currentIndex > 0) {
			setSelectedFile(files[currentIndex - 1]);
		} else if (direction === "next" && currentIndex < files.length - 1) {
			setSelectedFile(files[currentIndex + 1]);
		}
	};

	const handleCardClick = useCallback(
		(file: FileRecord, e: React.MouseEvent) => {
			const currentIndex = files.findIndex((f) => f.file_hash === file.file_hash);

			if (e.shiftKey && lastSelectedIndex !== null) {
				// Range selection
				setSelectionMode(true);
				setSelectedHashes((prev) => {
					const newSet = new Set(prev);
					const start = Math.min(lastSelectedIndex, currentIndex);
					const end = Math.max(lastSelectedIndex, currentIndex);
					for (let i = start; i <= end; i++) {
						newSet.add(files[i].file_hash);
					}
					return newSet;
				});
			} else if (e.ctrlKey || e.metaKey || selectionMode) {
				// Toggle selection
				setSelectionMode(true);
				setSelectedHashes((prev) => {
					const newSet = new Set(prev);
					if (newSet.has(file.file_hash)) {
						newSet.delete(file.file_hash);
					} else {
						newSet.add(file.file_hash);
					}
					return newSet;
				});
				setLastSelectedIndex(currentIndex);
			} else {
				// Open viewer
				setSelectedFile(file);
				setLastSelectedIndex(currentIndex);
			}
		},
		[selectionMode, files, lastSelectedIndex]
	);

	const clearSelection = useCallback(() => {
		setSelectedHashes(new Set());
		setSelectionMode(false);
		setLastSelectedIndex(null);
	}, []);

	const handleRefreshAll = useCallback(() => {
		console.log("Force refreshing all thumbnails");
		setIsRefreshing(true);
		// Update timestamps for all files to force cache bust
		setThumbnailTimestamps((prev) => {
			const newMap = new Map(prev);
			files.forEach((file) => {
				newMap.set(file.file_hash, Date.now());
			});
			return newMap;
		});
		// Reset animation after a short delay
		setTimeout(() => setIsRefreshing(false), 600);
	}, [files]);

	// Batch operation handlers
	const handleSelectAll = useCallback(() => {
		const allFileHashes = new Set(files.map((file) => file.file_hash));
		setSelectedHashes(allFileHashes);
		setSelectionMode(true);
	}, [files]);

	const handleBatchDelete = useCallback(() => {
		if (selectedHashes.size === 0) return;

		setDeleteDialogIsBatch(true);
		setDeleteDialogFileCount(selectedHashes.size);
		setDeleteDialogOpen(true);
	}, [selectedHashes]);

	const handleBatchEditTags = useCallback(() => {
		// This will be handled by the existing BatchTagEditor component
		// The BatchTagEditor is already shown when selectedHashes.size > 0
	}, []);

	const handleBatchAddFavorites = useCallback(async () => {
		if (selectedHashes.size === 0) return;

		const fileHashes = Array.from(selectedHashes);
		try {
			const count = await addFavoritesMutation.mutateAsync(fileHashes);
			toast.success(`已添加 ${count} 个文件到收藏`);
			clearSelection();
		} catch (error) {
			toast.error(`添加收藏失败: ${error}`);
		}
	}, [selectedHashes, addFavoritesMutation, clearSelection]);

	const handleBatchRemoveFavorites = useCallback(async () => {
		if (selectedHashes.size === 0) return;

		const fileHashes = Array.from(selectedHashes);
		try {
			const count = await removeFavoritesMutation.mutateAsync(fileHashes);
			toast.success(`已从收藏中移除 ${count} 个文件`);
			clearSelection();
		} catch (error) {
			toast.error(`移除收藏失败: ${error}`);
		}
	}, [selectedHashes, removeFavoritesMutation, clearSelection]);

	const handleSingleDelete = useCallback((fileHash: string) => {
		// Store file hash for deletion after confirmation
		setDeleteDialogIsBatch(false);
		setDeleteDialogFileCount(1);
		setDeleteDialogOpen(true);
		// We'll need to track which file to delete - let's add a ref for this
		window.pendingDeleteFileHash = fileHash;
	}, []);

	const handleSingleEditTags = useCallback((fileHash: string) => {
		// Select the file and show the batch tag editor
		setSelectedHashes(new Set([fileHash]));
		setSelectionMode(true);
	}, []);

	const handleDeleteConfirm = useCallback(
		(deleteFromDisk: boolean) => {
			if (deleteDialogIsBatch) {
				// Batch delete
				deleteFilesBatchMutation.mutate({
					fileHashes: Array.from(selectedHashes),
					deleteFromDisk,
				});
				clearSelection();
			} else {
				// Single file delete
				const pendingFileHash = window.pendingDeleteFileHash;
				if (pendingFileHash) {
					deleteFileMutation.mutate({
						fileHash: pendingFileHash,
						deleteFromDisk,
					});
					delete window.pendingDeleteFileHash; // Clean up
				}
			}
		},
		[
			deleteDialogIsBatch,
			selectedHashes,
			deleteFilesBatchMutation,
			deleteFileMutation,
			clearSelection,
		]
	);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if user is typing in an input/textarea
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			// Delete key - delete selected files
			if (e.key === "Delete" && selectedHashes.size > 0) {
				handleBatchDelete();
			}

			// Escape key - clear selection
			if (e.key === "Escape") {
				if (selectedHashes.size > 0) {
					clearSelection();
				}
				if (selectedFile) {
					setSelectedFile(null);
				}
				if (deleteDialogOpen) {
					setDeleteDialogOpen(false);
				}
			}

			// Ctrl+A / Cmd+A - select all files
			if ((e.ctrlKey || e.metaKey) && e.key === "a") {
				e.preventDefault();
				handleSelectAll();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		selectedHashes,
		selectedFile,
		deleteDialogOpen,
		clearSelection,
		handleSelectAll,
		handleBatchDelete,
	]);

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
				{Array.from({ length: 12 }).map((_, i) => (
					<Skeleton key={`loading-skeleton-${i}`} className="aspect-square rounded-lg" />
				))}
			</div>
		);
	}

	if (files.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-8 text-center">
				<ImageIcon className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
				<h3 className="text-xl font-semibold mb-2">No images yet</h3>
				<p className="text-muted-foreground max-w-md">
					Import some images to get started. Click the "Import" button above to select
					files.
				</p>
			</div>
		);
	}

	const virtualRows = virtualizer.getVirtualItems();
	const totalHeight = virtualizer.getTotalSize();

	return (
		<div ref={widthMeasureCallbackRef} className="h-full w-full flex flex-col">
			{/* Toolbar - shown when there are files */}
			{files.length > 0 && (
				<div className="flex justify-between items-center px-4 pt-4 pb-2 shrink-0">
					{/* Thumbnail size selector */}
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">缩略图大小:</span>
						<div className="flex gap-1 border rounded-md p-1">
							<Button
								variant={thumbnailSize === "small" ? "default" : "ghost"}
								size="sm"
								onClick={() => setThumbnailSize("small")}
								className="h-7 px-3"
							>
								小
							</Button>
							<Button
								variant={thumbnailSize === "medium" ? "default" : "ghost"}
								size="sm"
								onClick={() => setThumbnailSize("medium")}
								className="h-7 px-3"
							>
								中
							</Button>
							<Button
								variant={thumbnailSize === "large" ? "default" : "ghost"}
								size="sm"
								onClick={() => setThumbnailSize("large")}
								className="h-7 px-3"
							>
								大
							</Button>
						</div>
					</div>

					{/* Refresh button */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefreshAll}
						disabled={isRefreshing}
						title="刷新所有缩略图"
					>
						<RefreshCw
							className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
						/>
						刷新缩略图
					</Button>
				</div>
			)}

			{/* Batch Operations Bar */}
			{selectedHashes.size > 0 && (
				<BatchOperationsBar
					selectedCount={selectedHashes.size}
					filesCount={files.length}
					onClearSelection={clearSelection}
					onSelectAll={handleSelectAll}
					onDelete={handleBatchDelete}
					onEditTags={handleBatchEditTags}
					onAddFavorites={handleBatchAddFavorites}
					onRemoveFavorites={handleBatchRemoveFavorites}
				/>
			)}

			{/* Virtual scroll container */}
			<div
				ref={parentRef}
				className="overflow-y-auto flex-1 w-full overflow-x-hidden"
				style={{ contain: "strict" }}
			>
				<div
					ref={containerRef}
					className="relative"
					style={{
						height: `${totalHeight}px`,
						width: "100%",
						boxSizing: "border-box",
					}}
				>
					{virtualRows.map((virtualRow: VirtualItem) => {
						const rowIndex = virtualRow.index;
						const startIndex = rowIndex * columnCount;
						const endIndex = Math.min(startIndex + columnCount, files.length);
						const rowFiles = files.slice(startIndex, endIndex);

						return (
							<div
								key={virtualRow.key}
								data-index={rowIndex}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualRow.size}px`,
									transform: `translateY(${virtualRow.start}px)`,
									boxSizing: "border-box",
								}}
							>
								<div
									className="grid gap-4"
									style={{
										gridTemplateColumns: `repeat(${columnCount}, ${itemSize}px)`,
										width: `${itemSize * columnCount + gap * (columnCount - 1)}px`,
										maxWidth: "100%",
										paddingLeft: `${padding}px`,
										paddingRight: `${padding}px`,
										boxSizing: "border-box",
										margin: "0 auto",
									}}
								>
									{rowFiles.map((file) => (
										<div
											key={file.file_hash}
											style={{
												width: `${itemSize}px`,
												height: `${itemSize}px`,
												boxSizing: "border-box",
											}}
										>
											<ImageCard
												file={file}
												isSelected={selectedHashes.has(file.file_hash)}
												isLoadingThumbnail={thumbnailLoadingHashes.has(
													file.file_hash
												)}
												thumbnailTimestamp={thumbnailTimestamps.get(
													file.file_hash
												)}
												onClick={(e) => handleCardClick(file, e)}
												onDelete={handleSingleDelete}
												onEditTags={handleSingleEditTags}
											/>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</div>
			{selectedFile && (
				<ImageViewer
					file={selectedFile}
					allFiles={files}
					onClose={() => setSelectedFile(null)}
					onNavigate={handleNavigate}
				/>
			)}
			{selectedHashes.size > 0 && (
				<BatchTagEditor
					selectedHashes={Array.from(selectedHashes)}
					commonTags={[]}
					onClearSelection={clearSelection}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				isOpen={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
				onConfirm={handleDeleteConfirm}
				fileCount={deleteDialogFileCount}
				isBatch={deleteDialogIsBatch}
			/>
		</div>
	);
}
