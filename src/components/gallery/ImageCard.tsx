import { useState, useEffect } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileRecord } from "@/types";

interface ImageCardProps {
  file: FileRecord;
  isSelected: boolean;
  isLoadingThumbnail: boolean;
  thumbnailTimestamp?: number;
  onClick: (e: React.MouseEvent) => void;
}

export function ImageCard({ file, isSelected, isLoadingThumbnail, thumbnailTimestamp, onClick }: ImageCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  // Use direct app-asset:// protocol URL with cache-busting timestamp
  const thumbnailUrl = `app-asset://localhost/thumbnails/${file.file_hash}.webp${thumbnailTimestamp ? `?t=${thumbnailTimestamp}` : ''}`;
  const fileName = file.original_path.split("/").pop() || file.original_path;

  // Reset image state when thumbnail updates
  useEffect(() => {
    if (thumbnailTimestamp) {
      console.log(`Thumbnail timestamp updated for ${file.file_hash}, resetting states`);
      setImageLoaded(false);
      setImageError(false);
      setHasAttemptedLoad(false);
    }
  }, [thumbnailTimestamp, file.file_hash]);

  // Determine if we should show loading or error
  // Show loading when:
  // 1. Backend is generating thumbnail (isLoadingThumbnail)
  // 2. Image hasn't loaded yet and we haven't errored (initial state)
  // 3. Image is actively loading (hasAttemptedLoad but not loaded/errored)
  // Show error only when:
  // 1. We've attempted to load and got an error
  // 2. NOT currently regenerating (isLoadingThumbnail is false)
  const showLoading = isLoadingThumbnail || (!imageLoaded && !imageError) || (!imageLoaded && hasAttemptedLoad && !imageError);
  const showError = imageError && !isLoadingThumbnail && hasAttemptedLoad;

  return (
    <Card 
      onClick={onClick}
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
        src={thumbnailUrl}
        alt={fileName}
        data-hash={file.file_hash}
        className="w-full h-full object-cover"
        style={{ 
          width: '100%', 
          height: '100%', 
          display: imageError ? 'none' : 'block',
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out'
        }}
        loading="lazy"
        onLoadStart={() => {
          console.log("Starting to load thumbnail:", thumbnailUrl);
          setHasAttemptedLoad(true);
        }}
        onError={(e) => {
          console.error("Failed to load thumbnail:", thumbnailUrl, e);
          setImageError(true);
          setImageLoaded(false);
          setHasAttemptedLoad(true);
        }}
        onLoad={() => {
          console.log("Thumbnail loaded successfully:", thumbnailUrl);
          setImageLoaded(true);
          setImageError(false);
          setHasAttemptedLoad(true);
        }}
      />
      
      {/* Hover overlay with gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
        <div className="text-white">
          <p className="text-sm font-medium truncate mb-1">
            {fileName}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-200">
            <span>{file.width} × {file.height}</span>
            <span>•</span>
            <span>{formatFileSize(file.file_size_bytes)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
