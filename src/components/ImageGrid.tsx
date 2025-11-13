import { useFiles } from "@/lib/hooks";
import type { FileRecord } from "@/types";

interface ImageGridProps {
  files?: FileRecord[];
  isLoading?: boolean;
}

export function ImageGrid({ files: customFiles, isLoading: customLoading }: ImageGridProps) {
  const { data: fetchedFiles, isLoading: fetchLoading } = useFiles();
  
  const files = customFiles ?? fetchedFiles ?? [];
  const isLoading = customLoading ?? fetchLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 dark:text-gray-600 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-24 w-24 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No images yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Import some images to get started. Click the "Import" button above to select files.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {files.map((file) => (
        <ImageCard key={file.file_hash} file={file} />
      ))}
    </div>
  );
}

interface ImageCardProps {
  file: FileRecord;
}

function ImageCard({ file }: ImageCardProps) {
  // Use direct app-asset:// protocol URL
  const thumbnailUrl = `app-asset://localhost/thumbnails/${file.file_hash}.webp`;
  const fileName = file.original_path.split("/").pop() || file.original_path;

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
      <img
        src={thumbnailUrl}
        alt={fileName}
        className="w-full h-full object-cover"
        style={{ width: '100%', height: '100%', display: 'block' }}
        loading="lazy"
        onError={(e) => {
          console.error("Failed to load thumbnail:", thumbnailUrl, e);
          e.currentTarget.style.border = "2px solid red";
        }}
        onLoad={(e) => {
          console.log("Thumbnail loaded successfully:", thumbnailUrl);
          console.log("Image natural dimensions:", e.currentTarget.naturalWidth, "x", e.currentTarget.naturalHeight);
        }}
      />
      
      {/* Hover overlay with gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
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
