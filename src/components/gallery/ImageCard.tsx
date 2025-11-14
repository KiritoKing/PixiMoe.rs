import { useState, useEffect } from "react";
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
    <div 
      onClick={onClick}
      className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer transition-all ${
        isSelected 
          ? "ring-4 ring-blue-500" 
          : "hover:ring-2 hover:ring-blue-500"
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Loading spinner */}
      {showLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <svg
            className="animate-spin h-8 w-8 text-gray-400 dark:text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {/* Error state */}
      {showError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900/20">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
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
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
