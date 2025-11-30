import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getTagCategoryColor } from "@/lib/utils";
import type { Tag, TagCategory } from "@/types";

interface TagListProps {
	tags: Tag[];
	categories: TagCategory[];
	selectedTagIds: number[];
	onSelect: (tagId: number, selected: boolean) => void;
	onSelectAll: (selected: boolean) => void;
	onEdit: (tag: Tag) => void;
	onDelete: (tag: Tag) => void;
}

export function TagList({
	tags,
	categories,
	selectedTagIds,
	onSelect,
	onSelectAll,
	onEdit,
	onDelete,
}: TagListProps) {
	const allSelected = tags.length > 0 && tags.every((tag) => selectedTagIds.includes(tag.tag_id));
	const someSelected = selectedTagIds.length > 0 && !allSelected;

	if (tags.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>没有找到标签</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{/* Select All */}
			<div className="flex items-center gap-2 p-2 border-b">
				<Checkbox
					checked={allSelected}
					onCheckedChange={(checked) => onSelectAll(checked === true)}
					ref={(el) => {
						if (el && el instanceof HTMLButtonElement) {
							// @ts-expect-error - indeterminate is a valid property for checkbox
							el.indeterminate = someSelected;
						}
					}}
				/>
				<span className="text-sm text-muted-foreground">
					{selectedTagIds.length > 0 ? `已选择 ${selectedTagIds.length} 个标签` : "全选"}
				</span>
			</div>

			{/* Tag Items */}
			{tags.map((tag) => {
				const category = categories.find((cat) => cat.category_id === tag.category_id);
				const isSelected = selectedTagIds.includes(tag.tag_id);
				return (
					<div
						key={tag.tag_id}
						className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
							isSelected ? "bg-accent border-primary" : "bg-card hover:bg-accent"
						}`}
					>
						{/* Checkbox */}
						<Checkbox
							checked={isSelected}
							onCheckedChange={(checked) => onSelect(tag.tag_id, checked === true)}
							onClick={(e) => e.stopPropagation()}
						/>

						{/* Category Color Indicator */}
						<div
							className="w-4 h-4 rounded-full shrink-0"
							style={{
								backgroundColor: getTagCategoryColor(tag, categories),
							}}
						/>

						{/* Tag Info */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="font-medium truncate">{tag.name}</span>
								{category && (
									<Badge variant="outline" className="text-xs shrink-0">
										{category.name}
									</Badge>
								)}
							</div>
							{tag.file_count !== undefined && (
								<p className="text-xs text-muted-foreground mt-1">
									{tag.file_count} 个文件
								</p>
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center gap-1 shrink-0">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => onEdit(tag)}
							>
								<Edit2 className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-destructive hover:text-destructive"
								onClick={() => onDelete(tag)}
								title="删除标签"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
