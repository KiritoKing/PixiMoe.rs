import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useImportFiles } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import type { ProgressEvent } from "@/types";
import toast from "react-hot-toast";

export function ImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ProgressEvent | null>(null);
  const [thumbnailProgress, setThumbnailProgress] = useState<ProgressEvent | null>(null);
  const [aiProgress, setAiProgress] = useState<ProgressEvent | null>(null);
  const importMutation = useImportFiles();

  useEffect(() => {
    // Listen for import progress events
    const unlistenImport = listen<ProgressEvent>("import_progress", (event) => {
      setImportProgress(event.payload);
    });

    // Listen for thumbnail progress events
    const unlistenThumbnail = listen<ProgressEvent>("thumbnail_progress", (event) => {
      setThumbnailProgress(event.payload);
    });

    // Listen for AI tagging progress events
    const unlistenAi = listen<ProgressEvent>("ai_tagging_progress", (event) => {
      setAiProgress(event.payload);
      
      // Show toast for AI tagging completion
      if (event.payload.stage === "complete") {
        toast.success(event.payload.message, {
          duration: 3000,
          position: "bottom-right",
        });
      } else if (event.payload.stage === "error") {
        toast.error(event.payload.message, {
          duration: 5000,
          position: "bottom-right",
        });
      }
    });

    return () => {
      unlistenImport.then((fn) => fn());
      unlistenThumbnail.then((fn) => fn());
      unlistenAi.then((fn) => fn());
    };
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(null);
    setThumbnailProgress(null);
    setAiProgress(null);

    try {
      const results = await importMutation.mutateAsync(undefined);
      
      const imported = results.filter((r) => !r.is_duplicate).length;
      const duplicates = results.filter((r) => r.is_duplicate).length;

      if (imported > 0) {
        toast.success(
          `Import complete! Imported: ${imported} file(s)` +
          (duplicates > 0 ? `, ${duplicates} duplicate(s) skipped` : "") +
          `. AI tagging in progress...`,
          {
            duration: 4000,
            position: "bottom-right",
          }
        );
      } else if (duplicates > 0) {
        toast(`All ${duplicates} file(s) were duplicates, skipped`, {
          duration: 3000,
          position: "bottom-right",
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      if (error instanceof Error && error.message !== "No files selected") {
        toast.error(`Import failed: ${error.message}`, {
          duration: 5000,
          position: "bottom-right",
        });
      }
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleImport}
        disabled={isImporting}
        className="relative"
      >
        {isImporting ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Importing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <UploadIcon />
            Import Files
          </span>
        )}
      </Button>

      {/* Progress indicators */}
      {(importProgress || thumbnailProgress || aiProgress) && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[250px] z-10">
          <div className="space-y-2">
            {/* Import progress */}
            {importProgress && (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Import</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {importProgress.message}
                  </p>
                </div>
              </div>
            )}
            
            {/* Thumbnail progress */}
            {thumbnailProgress && thumbnailProgress.stage === "generating" && (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Thumbnail</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Generating...
                  </p>
                </div>
              </div>
            )}
            
            {/* AI tagging progress */}
            {aiProgress && (aiProgress.stage === "classifying" || aiProgress.stage === "saving_tags") && (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">AI Tagging</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {aiProgress.stage === "classifying" ? "Analyzing image..." : "Saving tags..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner({ size = "default" }: { size?: "default" | "sm" }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <svg
      className={`animate-spin ${sizeClass}`}
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
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}
