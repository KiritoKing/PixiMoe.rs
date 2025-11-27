import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteFromDisk: boolean) => void;
  fileCount: number;
  isBatch?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  fileCount,
  isBatch = false,
}: DeleteConfirmDialogProps) {
  const [deleteFromDisk, setDeleteFromDisk] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteFromDisk);
    setDeleteFromDisk(false); // Reset state
    onClose();
  };

  const handleClose = () => {
    setDeleteFromDisk(false); // Reset state
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            确认删除
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBatch ? (
              <div className="space-y-2">
                <p>
                  您即将删除 <strong>{fileCount}</strong> 张图片。
                </p>
                <p className="text-sm text-muted-foreground">
                  这个操作将从数据库中删除这些图片的记录。缩略图将被自动删除。
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="delete-from-disk"
                      checked={deleteFromDisk}
                      onCheckedChange={(checked) =>
                        setDeleteFromDisk(checked === true)
                      }
                    />
                    <label
                      htmlFor="delete-from-disk"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      同时删除原始文件（不可恢复）
                    </label>
                  </div>
                  {deleteFromDisk && (
                    <p className="text-xs text-destructive ml-6">
                      ⚠️ 原始文件将从磁盘中永久删除，此操作无法撤销！
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  您即将删除这张图片。
                </p>
                <p className="text-sm text-muted-foreground">
                  这个操作将从数据库中删除这张图片的记录。缩略图将被自动删除。
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="delete-from-disk-single"
                      checked={deleteFromDisk}
                      onCheckedChange={(checked) =>
                        setDeleteFromDisk(checked === true)
                      }
                    />
                    <label
                      htmlFor="delete-from-disk-single"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      同时删除原始文件（不可恢复）
                    </label>
                  </div>
                  {deleteFromDisk && (
                    <p className="text-xs text-destructive ml-6">
                      ⚠️ 原始文件将从磁盘中永久删除，此操作无法撤销！
                    </p>
                  )}
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">取消</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}