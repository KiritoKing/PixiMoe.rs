import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Tag } from "@/types";

interface SelectedTagsAreaProps {
	selectedTags: Tag[];
	onRemoveTag: (tagId: number) => void;
	onClearAll: () => void;
}

export function SelectedTagsArea({ selectedTags, onRemoveTag, onClearAll }: SelectedTagsAreaProps) {
	if (selectedTags.length === 0) {
		return null;
	}

	return (
		<div className="p-4 border-b bg-muted/30">
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-medium text-muted-foreground">
					已选择 ({selectedTags.length})
				</span>
				<button
					type="button"
					onClick={onClearAll}
					className="text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					清除全部
				</button>
			</div>
			<ScrollArea className="w-full h-auto whitespace-nowrap">
				<div className="flex gap-2 pb-2 w-max">
					{selectedTags.map((tag) => (
						<Badge
							key={tag.tag_id}
							variant="secondary"
							className="gap-1 pr-1 cursor-default flex-shrink-0 max-w-[200px]"
						>
							<span className="text-xs truncate" title={tag.name}>
								{tag.name}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onRemoveTag(tag.tag_id);
								}}
								className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
								aria-label={`移除 ${tag.name}`}
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	);
}
