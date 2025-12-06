import { AlertCircle, AlertTriangle, Check, FileX } from "lucide-react";
import { useEffect, useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileRecord, ImageHealthStatus } from "@/types";
import { ImageContextMenu } from "./ImageContextMenu";

interface ImageCardProps {
	file: FileRecord;
	isSelected: boolean;
	isLoadingThumbnail: boolean;
	thumbnailTimestamp?: number;
	onClick: (e: React.MouseEvent) => void;
	onDelete?: (fileHash: string) => void;
	onEditTags?: (fileHash: string) => void;
}

// Helper function to determine health status from file data
function getHealthStatus(file: FileRecord): ImageHealthStatus {
	// If the backend has already determined health status, use it
	if (file.health_status) {
		return file.health_status;
	}

	// Otherwise determine from available data
	const isMissing = file.is_missing === 1;
	const thumbnailHealth = file.thumbnail_health || 0;

	if (isMissing && thumbnailHealth === 1) {
		return "both_missing";
	} else if (isMissing) {
		return "original_missing";
	} else if (thumbnailHealth === 1) {
		return "thumbnail_missing";
	} else if (thumbnailHealth === 2) {
		return "thumbnail_corrupted";
	}

	return "healthy";
}

// Health status indicator component - uses container query for responsive sizing
function HealthStatusIndicator({ status }: { status: ImageHealthStatus }) {
	const getConfig = () => {
		switch (status) {
			case "original_missing":
				return {
					title: "原图文件丢失",
					color: "bg-red-500/90",
				};
			case "thumbnail_missing":
				return {
					title: "缩略图丢失",
					color: "bg-yellow-500/90",
				};
			case "thumbnail_corrupted":
				return {
					title: "缩略图损坏",
					color: "bg-orange-500/90",
				};
			case "both_missing":
				return {
					title: "缩略图和原图都丢失",
					color: "bg-red-600/90",
				};
			case "original_corrupted":
				return {
					title: "原图损坏",
					color: "bg-red-500/90",
				};
			default:
				return null;
		}
	};

	const config = getConfig();
	if (!config) return null;

	// Responsive: small (< 150px) / medium (150-250px) / large (> 250px)
	return (
		<div
			className={`absolute top-1 left-1 ${config.color} rounded-full flex items-center justify-center z-10 shadow-sm
				w-4 h-4 @[150px]:w-5 @[150px]:h-5 @[250px]:w-6 @[250px]:h-6`}
			title={config.title}
		>
			<AlertCircle className="w-3 h-3 @[150px]:w-3.5 @[150px]:h-3.5 @[250px]:w-4 @[250px]:h-4 text-white" />
		</div>
	);
}

export function ImageCard({
	file,
	isSelected,
	isLoadingThumbnail: _isLoadingThumbnail,
	thumbnailTimestamp,
	onClick,
	onDelete,
	onEditTags,
}: ImageCardProps) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
	const [useOriginal, setUseOriginal] = useState(false);
	const [contextMenuOpen, setContextMenuOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		x: 0,
		y: 0,
	});

	// Determine health status
	const healthStatus = getHealthStatus(file);
	const hasHealthIssues = healthStatus !== "healthy";

	// Use direct app-asset:// protocol URL with cache-busting timestamp
	const thumbnailUrl = `app-asset://localhost/thumbnails/${file.file_hash}.webp${thumbnailTimestamp ? `?t=${thumbnailTimestamp}` : ""}`;
	const originalUrl = `app-asset://localhost/originals/${file.file_hash}`;
	const fileName = file.original_path.split("/").pop() || file.original_path;

	// Determine which image URL to use
	const imageUrl = useOriginal ? originalUrl : thumbnailUrl;

	// Reset image state when thumbnail updates
	useEffect(() => {
		if (thumbnailTimestamp) {
			console.log(`Thumbnail timestamp updated for ${file.file_hash}, resetting states`);
			setImageLoaded(false);
			setImageError(false);
			setHasAttemptedLoad(false);
			setUseOriginal(false); // Try thumbnail again when timestamp updates
		}
	}, [thumbnailTimestamp, file.file_hash]);

	// Reset loading state when image URL changes (switching between thumbnail and original)
	// This ensures smooth transition when falling back to original or when thumbnail becomes available
	useEffect(() => {
		setImageLoaded(false);
		setImageError(false);
		setHasAttemptedLoad(false);
	}, []);

	// Handle right-click context menu
	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenuPosition({ x: e.clientX, y: e.clientY });
		setContextMenuOpen(true);
	};

	// Handle context menu actions
	const handleDelete = () => {
		onDelete?.(file.file_hash);
	};

	const handleEditTags = () => {
		onEditTags?.(file.file_hash);
	};

	// Determine if we should show loading or error
	// Show loading only when:
	// 1. Image is actively loading (hasAttemptedLoad but not loaded/errored)
	// Do NOT show loading when backend is generating thumbnail (isLoadingThumbnail)
	// Show error only when:
	// 1. We've attempted to load and got an error
	// 2. Both thumbnail and original failed to load
	const showLoading = hasAttemptedLoad && !imageLoaded && !imageError;
	const showError = imageError && hasAttemptedLoad && useOriginal; // Only show error if original also failed

	// Determine if we should show a fallback for missing images
	const shouldShowFallback =
		healthStatus === "both_missing" || (healthStatus === "original_missing" && hasHealthIssues);

	return (
		<>
			<Card
				onClick={onClick}
				onContextMenu={handleContextMenu}
				className={`@container group relative aspect-square overflow-hidden cursor-pointer transition-all ${
					isSelected ? "ring-4 ring-blue-500" : "hover:ring-2 hover:ring-blue-500"
				}`}
			>
				{/* Health status indicator */}
				{hasHealthIssues && <HealthStatusIndicator status={healthStatus} />}

				{/* Selection indicator - responsive sizing with container queries */}
				{isSelected && (
					<div
						className="absolute top-1 right-1 bg-blue-500 rounded-full flex items-center justify-center z-10 shadow-sm
						w-4 h-4 @[150px]:w-5 @[150px]:h-5 @[250px]:w-6 @[250px]:h-6"
					>
						<Check className="w-3 h-3 @[150px]:w-3.5 @[150px]:h-3.5 @[250px]:w-4 @[250px]:h-4 text-white" />
					</div>
				)}

				{/* Loading skeleton */}
				{showLoading && (
					<div className="absolute inset-0 flex items-center justify-center">
						<Skeleton className="w-full h-full" />
					</div>
				)}

				{/* Error state */}
				{showError && (
					<div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
						<AlertTriangle className="w-8 h-8 text-destructive" />
					</div>
				)}

				{/* Fallback for missing images - responsive with container queries */}
				{shouldShowFallback && (
					<div className="absolute inset-0 flex items-center justify-center bg-muted/80 border border-dashed border-muted-foreground/30 rounded-sm">
						<div className="flex flex-col items-center text-center p-1 @[150px]:p-2 @[250px]:p-4">
							<FileX className="w-6 h-6 @[150px]:w-8 @[150px]:h-8 @[250px]:w-12 @[250px]:h-12 text-muted-foreground/60 @[150px]:mb-1 @[250px]:mb-2" />
							{/* Show text only on medium and large sizes */}
							<p className="hidden @[150px]:block text-xs @[250px]:text-sm text-muted-foreground font-medium">
								文件丢失
							</p>
							<p className="hidden @[250px]:block text-xs text-muted-foreground/70 mt-1 max-w-[90%] truncate">
								{fileName}
							</p>
						</div>
					</div>
				)}

				<img
					src={shouldShowFallback ? undefined : imageUrl}
					alt={shouldShowFallback ? "" : fileName}
					data-hash={file.file_hash}
					className="w-full h-full object-cover"
					style={{
						width: shouldShowFallback ? 0 : "100%",
						height: shouldShowFallback ? 0 : "100%",
						display: imageError || shouldShowFallback ? "none" : "block",
						opacity: imageLoaded ? 1 : 0,
						transition: "opacity 0.2s ease-in-out",
					}}
					loading={shouldShowFallback ? "eager" : "lazy"}
					onLoadStart={() => {
						if (shouldShowFallback) return;
						console.log(
							`Starting to load ${useOriginal ? "original" : "thumbnail"}:`,
							imageUrl
						);
						setHasAttemptedLoad(true);
					}}
					onError={(e) => {
						if (shouldShowFallback) return;
						console.error(
							`Failed to load ${useOriginal ? "original" : "thumbnail"}:`,
							imageUrl,
							e
						);
						if (!useOriginal) {
							// Thumbnail failed, fallback to original
							console.log("Falling back to original image");
							setUseOriginal(true);
							setImageLoaded(false);
							setImageError(false);
							setHasAttemptedLoad(false); // Reset to allow original to load
						} else {
							// Original also failed
							setImageError(true);
							setImageLoaded(false);
							setHasAttemptedLoad(true);
						}
					}}
					onLoad={() => {
						if (shouldShowFallback) return;
						console.log(
							`${useOriginal ? "Original" : "Thumbnail"} loaded successfully:`,
							imageUrl
						);
						setImageLoaded(true);
						setImageError(false);
						setHasAttemptedLoad(true);
					}}
				/>

				{/* Hover overlay with gradient - responsive with container queries */}
				<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-1 @[150px]:p-1.5 @[250px]:p-2 pointer-events-none">
					{/* Top right: Favorite button - hidden on small, shown on medium+ */}
					<div className="hidden @[120px]:flex justify-end pointer-events-auto">
						<FavoriteButton
							fileHash={file.file_hash}
							variant="ghost"
							size="icon"
							className="scale-50 @[150px]:scale-[0.6] @[250px]:scale-75 hover:scale-[0.65] @[150px]:hover:scale-[0.75] @[250px]:hover:scale-90 transition-transform"
						/>
					</div>
					{/* Spacer for small size (no favorite button) */}
					<div className="@[120px]:hidden flex-1" />
					{/* Bottom: File info - responsive content */}
					<div className="text-white pointer-events-none">
						{/* File name: hidden on small, truncated on medium+ */}
						<p className="hidden @[150px]:block text-[10px] @[250px]:text-sm font-medium truncate @[250px]:mb-1">
							{fileName}
						</p>
						{/* Dimensions: hidden on small, compact on medium, full on large */}
						<div className="hidden @[150px]:flex items-center gap-1 @[250px]:gap-2 text-[9px] @[250px]:text-xs text-gray-200">
							<span className="@[250px]:hidden">
								{file.width}×{file.height}
							</span>
							<span className="hidden @[250px]:inline">
								{file.width} × {file.height}
							</span>
							<span className="hidden @[200px]:inline">•</span>
							<span className="hidden @[200px]:inline">
								{formatFileSize(file.file_size_bytes)}
							</span>
						</div>
					</div>
				</div>
			</Card>

			{/* Context Menu */}
			{onDelete && onEditTags && (
				<ImageContextMenu
					file={file}
					isOpen={contextMenuOpen}
					position={contextMenuPosition}
					onClose={() => setContextMenuOpen(false)}
					onDelete={handleDelete}
					onEditTags={handleEditTags}
				/>
			)}
		</>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
