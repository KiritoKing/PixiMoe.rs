import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useImportFiles } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import type { ProgressEvent } from "@/types";

export function ImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const importMutation = useImportFiles();

  useEffect(() => {
    // Listen for import progress events
    const unlisten = listen<ProgressEvent>("import_progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setProgress(null);

    try {
      const results = await importMutation.mutateAsync(undefined);
      
      const imported = results.filter((r) => !r.is_duplicate).length;
      const duplicates = results.filter((r) => r.is_duplicate).length;

      alert(
        `Import complete!\n\n` +
        `Imported: ${imported} file(s)\n` +
        (duplicates > 0 ? `Duplicates skipped: ${duplicates}` : "")
      );
    } catch (error) {
      console.error("Import failed:", error);
      if (error instanceof Error && error.message !== "No files selected") {
        alert(`Import failed: ${error.message}`);
      }
    } finally {
      setIsImporting(false);
      setProgress(null);
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

      {/* Progress indicator */}
      {progress && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px] z-10">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{progress.stage}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {progress.message}
              </p>
            </div>
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
