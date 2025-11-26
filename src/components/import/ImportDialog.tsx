import { useState } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tags/TagInput";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { tagNames: string[]; enableAITagging: boolean }) => void;
  fileCount: number;
}

export function ImportDialog({
  open,
  onOpenChange,
  onConfirm,
  fileCount,
}: ImportDialogProps) {
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [enableAITagging, setEnableAITagging] = useState(true);

  const handleConfirm = () => {
    onConfirm({ tagNames, enableAITagging });
    // Reset form
    setTagNames([]);
    setEnableAITagging(true);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    setTagNames([]);
    setEnableAITagging(true);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when dialog is closed (via X button or clicking outside)
      setTagNames([]);
      setEnableAITagging(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导入文件</DialogTitle>
          <DialogDescription>
            已选择 {fileCount} 个文件。请配置导入选项。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Tagging Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-tagging" className="text-base font-medium">
                启用 AI 标签
              </Label>
              <p className="text-sm text-muted-foreground">
                自动为导入的图片生成 AI 标签（可能需要一些时间）
              </p>
            </div>
            <Switch
              id="ai-tagging"
              checked={enableAITagging}
              onCheckedChange={setEnableAITagging}
            />
          </div>

          {/* Manual Tag Input */}
          <div className="space-y-2">
            <Label htmlFor="manual-tags" className="text-base font-medium">
              手动添加标签（可选）
            </Label>
            <TagInput
              value={tagNames}
              onChange={setTagNames}
              placeholder="添加标签..."
            />
            {tagNames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                将为所有 {fileCount} 个文件添加 {tagNames.length} 个标签
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            <Upload className="mr-2 h-4 w-4" />
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

