import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Wand2, Loader2 } from "lucide-react";
import { useFileTags, useAddTag, useRemoveTag, useRunAITagging } from "@/lib/hooks";
import type { FileRecord } from "@/types";
import { TagInput } from "@/components/tags/TagInput";
import toast from "react-hot-toast";

interface ImageViewerProps {
  file: FileRecord;
  allFiles: FileRecord[];
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

export function ImageViewer({ file, allFiles, onClose, onNavigate }: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { data: tags = [] } = useFileTags(file.file_hash);
  const addTagMutation = useAddTag();
  const removeTagMutation = useRemoveTag();
  const aiTagMutation = useRunAITagging();
  const [newTags, setNewTags] = useState<string[]>([]);

  const hasAITags = tags.some((tag) => tag.type === "ai-generated");

  const currentIndex = allFiles.findIndex((f) => f.file_hash === file.file_hash);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allFiles.length - 1;

  useEffect(() => {
    // Use app-asset:// protocol to load original image
    setImageUrl(`app-asset://localhost/originals/${file.file_hash}`);
    setImageLoading(true);
    setImageError(false);
  }, [file.file_hash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && canGoPrev && onNavigate) {
        onNavigate("prev");
      } else if (e.key === "ArrowRight" && canGoNext && onNavigate) {
        onNavigate("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoPrev, canGoNext, onClose, onNavigate]);

  const handleAddTags = async () => {
    if (newTags.length === 0) return;

    for (const tagName of newTags) {
      await addTagMutation.mutateAsync({
        fileHash: file.file_hash,
        tagName,
      });
    }
    setNewTags([]);
  };

  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate({
      fileHash: file.file_hash,
      tagId,
    });
  };

  const handleRunAI = async () => {
    try {
      const count = await aiTagMutation.mutateAsync(file.file_hash);
      toast.success(`Added ${count} AI-generated tag(s)`);
    } catch (error) {
      toast.error(`AI tagging failed: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation buttons */}
      {canGoPrev && onNavigate && (
        <button
          onClick={() => onNavigate("prev")}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {canGoNext && onNavigate && (
        <button
          onClick={() => onNavigate("next")}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div className="flex w-full h-full max-w-7xl gap-4 p-4">
        {/* Image */}
        <div className="flex-1 flex items-center justify-center relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          )}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Failed to load image</p>
                <p className="text-sm text-gray-400">The original file may have been moved or deleted</p>
              </div>
            </div>
          )}
          <img
            src={imageUrl}
            alt={file.original_path}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            style={{ display: imageError ? 'none' : 'block' }}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-900 rounded-lg p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">File Details</h3>

          {/* File info */}
          <div className="space-y-2 text-sm mb-6">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Size:</span>{" "}
              {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Dimensions:</span>{" "}
              {file.width} × {file.height}
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Hash:</span>{" "}
              <span className="text-xs font-mono">{file.file_hash.slice(0, 16)}...</span>
            </div>
          </div>

          {/* Tags section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Tags</h4>
              <button
                onClick={handleRunAI}
                disabled={hasAITags || aiTagMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasAITags ? "AI tags already generated" : "Run AI tagging"}
              >
                <Wand2 className="w-3 h-3" />
                {aiTagMutation.isPending ? "Running..." : "AI Tag"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag.tag_id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm"
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.tag_id)}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add new tags */}
            <div className="space-y-2">
              <TagInput value={newTags} onChange={setNewTags} placeholder="Add new tags..." />
              {newTags.length > 0 && (
                <button
                  onClick={handleAddTags}
                  disabled={addTagMutation.isPending}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
                >
                  {addTagMutation.isPending ? "Adding..." : `Add ${newTags.length} tag(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
