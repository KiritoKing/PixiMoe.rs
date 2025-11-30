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
import type { Tag } from "@/types";

interface TagDeleteDialogProps {
	tag: Tag;
	onConfirm: () => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function TagDeleteDialog({
	tag,
	onConfirm,
	onCancel,
	isLoading = false,
}: TagDeleteDialogProps) {
	const fileCount = tag.file_count ?? 0;

	return (
		<AlertDialog open={true} onOpenChange={(open) => !open && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>确认删除标签</AlertDialogTitle>
					<AlertDialogDescription>
						<div className="space-y-2 mt-2">
							<p>
								确定要删除标签 <strong>&quot;{tag.name}&quot;</strong> 吗？
							</p>
							{fileCount > 0 && (
								<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
									<p className="text-sm font-medium text-destructive">
										警告：此标签正在被 {fileCount} 个文件使用
									</p>
									<p className="text-xs text-muted-foreground mt-1">
										删除此标签将从所有关联的文件中移除，此操作无法撤销。
									</p>
								</div>
							)}
							{fileCount === 0 && (
								<p className="text-sm text-muted-foreground">
									此标签未被任何文件使用，可以安全删除。
								</p>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isLoading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isLoading ? "删除中..." : "删除"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
