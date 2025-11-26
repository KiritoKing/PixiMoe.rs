import { useState, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { RefreshCw, ImageIcon } from "lucide-react";
import { useFiles } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { FileRecord, ProgressEvent } from "@/types";
import { ImageViewer } from "./ImageViewer";
import { BatchTagEditor } from "@/components/tags/BatchTagEditor";
import { ImageCard } from "./ImageCard";

interface ImageGridProps {
  files?: FileRecord[];
  isLoading?: boolean;
}

export function ImageGrid({ files: customFiles, isLoading: customLoading }: ImageGridProps) {
  const { data: fetchedFiles, isLoading: fetchLoading } = useFiles();
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [thumbnailLoadingHashes, setThumbnailLoadingHashes] = useState<Set<string>>(new Set());
  const [thumbnailTimestamps, setThumbnailTimestamps] = useState<Map<string, number>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const files = customFiles ?? fetchedFiles ?? [];
  const isLoading = customLoading ?? fetchLoading;

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

  const handleCardClick = useCallback((file: FileRecord, e: React.MouseEvent) => {
    if (e.shiftKey || selectionMode) {
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
    } else {
      // Open viewer
      setSelectedFile(file);
    }
  }, [selectionMode]);

  const clearSelection = useCallback(() => {
    setSelectedHashes(new Set());
    setSelectionMode(false);
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ImageIcon className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">
          No images yet
        </h3>
        <p className="text-muted-foreground max-w-md">
          Import some images to get started. Click the "Import" button above to select files.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Refresh button - shown when there are files */}
      {files.length > 0 && (
        <div className="flex justify-end px-4 pt-4 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            title="刷新所有缩略图"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新缩略图
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
        {files.map((file) => (
          <ImageCard 
            key={file.file_hash} 
            file={file} 
            isSelected={selectedHashes.has(file.file_hash)}
            isLoadingThumbnail={thumbnailLoadingHashes.has(file.file_hash)}
            thumbnailTimestamp={thumbnailTimestamps.get(file.file_hash)}
            onClick={(e) => handleCardClick(file, e)} 
          />
        ))}
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
    </>
  );
}
