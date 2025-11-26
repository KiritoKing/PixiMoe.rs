import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Upload, Loader2 } from "lucide-react";
import { useImportFiles } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
      <Popover open={(importProgress || thumbnailProgress || aiProgress) !== null}>
        <PopoverTrigger asChild>
          <Button
            onClick={handleImport}
            disabled={isImporting}
          >
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
        <PopoverContent className="w-[280px]" align="start">
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
            {thumbnailProgress && thumbnailProgress.stage === "generating" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                  <p className="text-xs font-medium text-purple-600">Thumbnail</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generating...
                </p>
              </div>
            )}
            
            {/* AI tagging progress */}
            {aiProgress && (aiProgress.stage === "classifying" || aiProgress.stage === "saving_tags") && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-green-600" />
                  <p className="text-xs font-medium text-green-600">AI Tagging</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {aiProgress.stage === "classifying" ? "Analyzing image..." : "Saving tags..."}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
