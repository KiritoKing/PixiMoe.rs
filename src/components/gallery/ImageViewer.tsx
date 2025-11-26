import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Wand2, Loader2 } from "lucide-react";
import { useFileTags, useAddTag, useRemoveTag, useRunAITagging } from "@/lib/hooks";
import type { FileRecord } from "@/types";
import { TagInput } from "@/components/tags/TagInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 gap-0">
        <DialogHeader className="sr-only">
          <span>Image Viewer</span>
        </DialogHeader>
        
        <div className="relative flex w-full h-full">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Navigation buttons */}
          {canGoPrev && onNavigate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("prev")}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {canGoNext && onNavigate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("next")}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative bg-muted">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Failed to load image</p>
                  <p className="text-sm text-muted-foreground">The original file may have been moved or deleted</p>
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
          <div className="w-80 border-l bg-background">
            <ScrollArea className="h-full">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">File Details</h3>

                {/* File info */}
                <div className="space-y-2 text-sm mb-6">
                  <div>
                    <span className="text-muted-foreground">Size:</span>{" "}
                    {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dimensions:</span>{" "}
                    {file.width} × {file.height}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hash:</span>{" "}
                    <span className="text-xs font-mono">{file.file_hash.slice(0, 16)}...</span>
                  </div>
                </div>

                {/* Tags section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Tags</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunAI}
                      disabled={hasAITags || aiTagMutation.isPending}
                      className="flex items-center gap-1"
                      title={hasAITags ? "AI tags already generated" : "Run AI tagging"}
                    >
                      <Wand2 className="w-3 h-3" />
                      {aiTagMutation.isPending ? "Running..." : "AI Tag"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <Badge key={tag.tag_id} variant="secondary" className="gap-1">
                        {tag.name}
                        <button
                          onClick={() => handleRemoveTag(tag.tag_id)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Add new tags */}
                  <div className="space-y-2">
                    <TagInput value={newTags} onChange={setNewTags} placeholder="Add new tags..." />
                    {newTags.length > 0 && (
                      <Button
                        onClick={handleAddTags}
                        disabled={addTagMutation.isPending}
                        className="w-full"
                        size="sm"
                      >
                        {addTagMutation.isPending ? "Adding..." : `Add ${newTags.length} tag(s)`}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
