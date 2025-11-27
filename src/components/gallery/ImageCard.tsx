import { AlertTriangle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileRecord } from "@/types";
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

	// Use direct app-asset:// protocol URL with cache-busting timestamp
	const thumbnailUrl = `app-asset://localhost/thumbnails/${file.file_hash}.webp${thumbnailTimestamp ? `?t=${thumbnailTimestamp}` : ""}`;
	const originalUrl = `app-asset://localhost/originals/${file.file_hash}`;
	const fileName = file.original_path.split("/").pop() || file.original_path;

	// Determine which image URL to use
	const imageUrl = useOriginal ? originalUrl : thumbnailUrl;

	// Reset image state when thumbnail updates
	useEffect(() => {
		if (thumbnailTimestamp) {
			console.log(
				`Thumbnail timestamp updated for ${file.file_hash}, resetting states`,
			);
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

	return (
		<>
			<Card
				onClick={onClick}
				onContextMenu={handleContextMenu}
				className={`group relative aspect-square overflow-hidden cursor-pointer transition-all ${
					isSelected
						? "ring-4 ring-blue-500"
						: "hover:ring-2 hover:ring-blue-500"
				}`}
			>
				{/* Selection indicator */}
				{isSelected && (
					<div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
						<Check className="w-4 h-4 text-white" />
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

				<img
					src={imageUrl}
					alt={fileName}
					data-hash={file.file_hash}
					className="w-full h-full object-cover"
					style={{
						width: "100%",
						height: "100%",
						display: imageError ? "none" : "block",
						opacity: imageLoaded ? 1 : 0,
						transition: "opacity 0.2s ease-in-out",
					}}
					loading="lazy"
					onLoadStart={() => {
						console.log(
							`Starting to load ${useOriginal ? "original" : "thumbnail"}:`,
							imageUrl,
						);
						setHasAttemptedLoad(true);
					}}
					onError={(e) => {
						console.error(
							`Failed to load ${useOriginal ? "original" : "thumbnail"}:`,
							imageUrl,
							e,
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
						console.log(
							`${useOriginal ? "Original" : "Thumbnail"} loaded successfully:`,
							imageUrl,
						);
						setImageLoaded(true);
						setImageError(false);
						setHasAttemptedLoad(true);
					}}
				/>

				{/* Hover overlay with gradient */}
				<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
					<div className="text-white">
						<p className="text-sm font-medium truncate mb-1">{fileName}</p>
						<div className="flex items-center gap-2 text-xs text-gray-200">
							<span>
								{file.width} × {file.height}
							</span>
							<span>•</span>
							<span>{formatFileSize(file.file_size_bytes)}</span>
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
