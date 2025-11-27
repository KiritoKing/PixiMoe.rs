import { CheckSquare, Edit, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BatchOperationsBarProps {
	selectedCount: number;
	filesCount?: number;
	onClearSelection: () => void;
	onSelectAll: () => void;
	onDelete: () => void;
	onEditTags: () => void;
}

export function BatchOperationsBar({
	selectedCount,
	filesCount = 0,
	onClearSelection,
	onSelectAll,
	onDelete,
	onEditTags,
}: BatchOperationsBarProps) {
	return (
		<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
			<div className="flex items-center justify-between px-4 py-3">
				<div className="flex items-center gap-3">
					<Badge variant="secondary" className="px-3 py-1">
						<CheckSquare className="w-4 h-4 mr-2" />
						已选中 {selectedCount} 张图片
					</Badge>

					{filesCount > 0 && (
						<span className="text-sm text-muted-foreground">
							{selectedCount === filesCount
								? "全部选中"
								: `共 ${filesCount} 张`}
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					{/* Select All / Clear All button */}
					{selectedCount < filesCount ? (
						<Button variant="outline" size="sm" onClick={onSelectAll}>
							全选
						</Button>
					) : (
						<Button variant="outline" size="sm" onClick={onClearSelection}>
							<X className="w-4 h-4 mr-2" />
							清除选择
						</Button>
					)}

					{/* Batch actions */}
					<Button variant="outline" size="sm" onClick={onEditTags}>
						<Edit className="w-4 h-4 mr-2" />
						编辑标签
					</Button>

					<Button variant="destructive" size="sm" onClick={onDelete}>
						<Trash2 className="w-4 h-4 mr-2" />
						删除图片
					</Button>
				</div>
			</div>
		</div>
	);
}
