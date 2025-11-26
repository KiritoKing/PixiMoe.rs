import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { RefreshCw, ImageIcon } from "lucide-react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
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

// Calculate number of columns based on container width
// Dynamically calculates maximum columns that fit in the available width
// Minimum item size: 120px, gap: 16px, padding: 16px * 2
function getColumnCount(width: number, minItemSize: number = 120, gap: number = 16, padding: number = 32): number {
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

export function ImageGrid({ files: customFiles, isLoading: customLoading }: ImageGridProps) {
  const { data: fetchedFiles, isLoading: fetchLoading } = useFiles();
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [thumbnailLoadingHashes, setThumbnailLoadingHashes] = useState<Set<string>>(new Set());
  const [thumbnailTimestamps, setThumbnailTimestamps] = useState<Map<string, number>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  
  const files = customFiles ?? fetchedFiles ?? [];
  const isLoading = customLoading ?? fetchLoading;


  // Refs for virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null); // Scroll container
  const containerRef = useRef<HTMLDivElement>(null); // Virtual content container
  const widthMeasureRef = useRef<HTMLDivElement>(null); // Container for width measurement

  // Constants for layout calculation
  const gap = 16; // gap-4 = 16px
  const padding = 16; // p-4 = 16px
  const minItemSize = 120; // Minimum item size in pixels
  
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
      if (typeof window !== 'undefined') {
        return getColumnCount(window.innerWidth, minItemSize, gap, padding * 2);
      }
      return 2; // Fallback default
    }
    return getColumnCount(containerWidth, minItemSize, gap, padding * 2);
  }, [containerWidth, minItemSize, gap, padding]);

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
    window.addEventListener('resize', handleWindowResize);

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
          (window as any).__imageGridResizeObserver = observer;
        }
        updateWidth();
      }, 200);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleWindowResize);
        if ((window as any).__imageGridResizeObserver) {
          (window as any).__imageGridResizeObserver.disconnect();
          delete (window as any).__imageGridResizeObserver;
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
      window.removeEventListener('resize', handleWindowResize);
      if ((window as any).__imageGridResizeObserver) {
        (window as any).__imageGridResizeObserver.disconnect();
        delete (window as any).__imageGridResizeObserver;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Calculate item size (considering gap)
  const availableWidth = containerWidth > 0 ? containerWidth - padding * 2 : 0;
  const itemSize = useMemo(() => {
    if (columnCount === 0) return minItemSize; // Default estimate
    if (containerWidth === 0 || availableWidth <= 0) {
      // Estimate based on window width if container not measured yet
      if (typeof window !== 'undefined') {
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
    // Ensure minimum size
    return Math.max(calculatedSize, minItemSize);
  }, [columnCount, containerWidth, availableWidth, gap, padding, minItemSize]);

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
  }, [columnCount, containerWidth, virtualizer]);

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
  }, [selectionMode, files, lastSelectedIndex]);

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

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div ref={widthMeasureCallbackRef} className="h-full w-full flex flex-col">
      {/* Refresh button - shown when there are files */}
      {files.length > 0 && (
        <div className="flex justify-end px-4 pt-4 pb-2 shrink-0">
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
                        isLoadingThumbnail={thumbnailLoadingHashes.has(file.file_hash)}
                        thumbnailTimestamp={thumbnailTimestamps.get(file.file_hash)}
                        onClick={(e) => handleCardClick(file, e)}
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
    </div>
  );
}
