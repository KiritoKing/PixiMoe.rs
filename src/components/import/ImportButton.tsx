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
import { ImportDialog } from "./ImportDialog";
import type { ProgressEvent } from "@/types";
import toast from "react-hot-toast";
import { createToastWithDetails } from "@/lib/utils/notifications";
import { open } from "@tauri-apps/plugin-dialog";

export function ImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ProgressEvent | null>(null);
  const [thumbnailProgress, setThumbnailProgress] = useState<ProgressEvent | null>(null);
  const [aiProgress, setAiProgress] = useState<ProgressEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
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
      
      // Show toast for AI tagging completion with notification center integration
      if (event.payload.stage === "complete") {
        createToastWithDetails(
          toast,
          "success",
          "AI 标签完成",
          event.payload.message,
          `文件哈希: ${event.payload.file_hash || "未知"}\n${event.payload.message}`
        );
      } else if (event.payload.stage === "error") {
        createToastWithDetails(
          toast,
          "error",
          "AI 标签失败",
          event.payload.message,
          `文件哈希: ${event.payload.file_hash || "未知"}\n错误: ${event.payload.message}`
        );
      }
    });

    return () => {
      unlistenImport.then((fn) => fn());
      unlistenThumbnail.then((fn) => fn());
      unlistenAi.then((fn) => fn());
    };
  }, []);

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "webp", "gif"],
          },
        ],
      });

      if (!selected) {
        return;
      }

      const filePaths = Array.isArray(selected) ? selected : [selected];
      setSelectedFiles(filePaths);
      setDialogOpen(true);
    } catch (error) {
      console.error("File selection failed:", error);
    }
  };

  const handleImportConfirm = async (options: { tagNames: string[]; enableAITagging: boolean }) => {
    setIsImporting(true);
    setImportProgress(null);
    setThumbnailProgress(null);
    setAiProgress(null);

    try {
      const response = await importMutation.mutateAsync({
        paths: selectedFiles,
        tagNames: options.tagNames,
        enableAITagging: options.enableAITagging,
      });
      const results = response.results;
      const appliedTags = response.tagNames;
      
      const imported = results.filter((r) => !r.is_duplicate).length;
      const duplicates = results.filter((r) => r.is_duplicate).length;

      if (imported > 0) {
        const message = `导入完成！已导入 ${imported} 个文件` +
          (duplicates > 0 ? `，跳过 ${duplicates} 个重复文件` : "") +
          (appliedTags && appliedTags.length > 0 ? `，应用了 ${appliedTags.length} 个标签` : "") +
          (options.enableAITagging ? `。AI 标签处理中...` : "");
        const details = `成功导入: ${imported} 个文件\n` +
          (duplicates > 0 ? `跳过重复: ${duplicates} 个文件\n` : "") +
          (appliedTags && appliedTags.length > 0 ? `应用的标签: ${appliedTags.join(", ")}\n` : "") +
          (options.enableAITagging ? `AI 标签处理将在后台进行` : `AI 标签已禁用`);
        createToastWithDetails(toast, "success", "导入完成", message, details);
      } else if (duplicates > 0) {
        const message = `所有 ${duplicates} 个文件都是重复的，已跳过`;
        const details = `跳过的重复文件数: ${duplicates}`;
        createToastWithDetails(toast, "info", "导入完成", message, details);
      }
      
      // Clear selected files
      setSelectedFiles([]);
    } catch (error) {
      console.error("Import failed:", error);
      if (error instanceof Error && error.message !== "No files selected") {
        const message = `导入失败: ${error.message}`;
        const details = `错误详情: ${error.message}\n${error.stack || ""}`;
        createToastWithDetails(toast, "error", "导入失败", message, details);
      }
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <>
      <div className="relative">
        <Popover open={(importProgress || thumbnailProgress || aiProgress) !== null}>
          <PopoverTrigger asChild>
            <Button
              onClick={handleFileSelect}
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
          <PopoverContent className="w-[320px] p-4" align="start" sideOffset={8}>
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

      {/* Import Dialog */}
      <ImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleImportConfirm}
        fileCount={selectedFiles.length}
      />
    </>
  );
}
