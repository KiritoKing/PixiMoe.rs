import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Tag, TagCategory } from "@/types";

interface CollapsibleCategorySectionProps {
	category: TagCategory;
	tags: Tag[];
	selectedTagIds: number[];
	onToggleTag: (tagId: number) => void;
	defaultCollapsed?: boolean;
}

export function CollapsibleCategorySection({
	category,
	tags,
	selectedTagIds,
	onToggleTag,
	defaultCollapsed = false,
}: CollapsibleCategorySectionProps) {
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

	if (tags.length === 0) {
		return null;
	}

	const selectedCount = tags.filter((tag) => selectedTagIds.includes(tag.tag_id)).length;

	return (
		<div className="mb-4 w-full">
			{/* Category Header */}
			<button
				type="button"
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors group"
			>
				<div className="flex items-center gap-2 min-w-0 flex-1">
					{isCollapsed ? (
						<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
					)}
					<div
						className="w-3 h-3 rounded-full shrink-0"
						style={{ backgroundColor: category.color_code }}
					/>
					<span className="text-sm font-semibold truncate min-w-0">{category.name}</span>
					<Badge variant="outline" className="text-xs shrink-0">
						{tags.length}
					</Badge>
					{selectedCount > 0 && (
						<Badge variant="secondary" className="text-xs shrink-0">
							{selectedCount} 已选
						</Badge>
					)}
				</div>
			</button>

			{/* Tags List */}
			{!isCollapsed && (
				<div className="ml-6 space-y-1 mt-1">
					{tags.map((tag) => (
						<button
							key={tag.tag_id}
							type="button"
							className={cn(
								"flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer transition-colors text-left w-full",
								selectedTagIds.includes(tag.tag_id) && "bg-accent"
							)}
							onClick={() => onToggleTag(tag.tag_id)}
						>
							<Checkbox
								checked={selectedTagIds.includes(tag.tag_id)}
								onCheckedChange={() => onToggleTag(tag.tag_id)}
								className="shrink-0"
							/>
							<span className="flex-1 text-sm truncate min-w-0" title={tag.name}>
								{tag.name}
							</span>
							{tag.file_count !== undefined && tag.file_count > 0 && (
								<Badge variant="outline" className="text-xs shrink-0">
									{tag.file_count}
								</Badge>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
