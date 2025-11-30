import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/lib/hooks/useCategories";
import { getTagCategoryColor } from "@/lib/utils";
import type { Tag } from "@/types";

interface EmptyTagsSectionProps {
	tags: Tag[];
}

export function EmptyTagsSection({ tags }: EmptyTagsSectionProps) {
	const { data: categories } = useCategories();

	if (tags.length === 0) {
		return null;
	}

	return (
		<div className="mt-4 pt-4 border-t">
			<h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
				空标签 ({tags.length})
			</h3>
			<div className="flex flex-wrap gap-2">
				{tags.map((tag) => (
					<Badge
						key={tag.tag_id}
						variant="outline"
						className="px-2.5 py-0.5 cursor-default opacity-60 max-w-[200px] shrink-0"
						style={{
							borderLeftColor: getTagCategoryColor(tag, categories),
							borderLeftWidth: "3px",
						}}
					>
						<span className="text-xs truncate block" title={tag.name}>
							{tag.name}
						</span>
					</Badge>
				))}
			</div>
		</div>
	);
}
