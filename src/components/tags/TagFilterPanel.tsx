import { useCallback, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTags } from "@/lib/hooks/useTags";
import type { Tag } from "@/types";
import { CollapsibleCategorySection } from "./CollapsibleCategorySection";
import { EmptyTagsSection } from "./EmptyTagsSection";
import { SelectedTagsArea } from "./SelectedTagsArea";
import { SortControl, type SortMode } from "./SortControl";

interface TagFilterPanelProps {
	selectedTagIds: number[];
	onTagsChange: (tagIds: number[]) => void;
}

export function TagFilterPanel({ selectedTagIds, onTagsChange }: TagFilterPanelProps) {
	const { data: tags, isLoading: tagsLoading } = useTags();
	const { data: categories, isLoading: categoriesLoading } = useCategories();
	const [searchQuery, setSearchQuery] = useState("");
	const [showEmptyTags, setShowEmptyTags] = useState(false);
	const [sortMode, setSortMode] = useState<SortMode>("alphabetical");

	const isLoading = tagsLoading || categoriesLoading;

	const toggleTag = (tagId: number) => {
		if (selectedTagIds.includes(tagId)) {
			onTagsChange(selectedTagIds.filter((id) => id !== tagId));
		} else {
			onTagsChange([...selectedTagIds, tagId]);
		}
	};

	const clearFilters = () => {
		onTagsChange([]);
	};

	// Filter tags by search query
	const filteredTags = useMemo(() => {
		if (!tags) return [];
		if (!searchQuery.trim()) return tags;
		const query = searchQuery.toLowerCase();
		return tags.filter((tag) => tag.name.toLowerCase().includes(query));
	}, [tags, searchQuery]);

	// Separate tags into those with files and those without
	const tagsWithFiles = useMemo(
		() => filteredTags.filter((tag) => tag.file_count !== undefined && tag.file_count > 0),
		[filteredTags]
	);

	const tagsWithoutFiles = useMemo(
		() => filteredTags.filter((tag) => !tag.file_count || tag.file_count === 0),
		[filteredTags]
	);

	// Sort tags based on sort mode
	const sortTags = useCallback(
		(tagsToSort: Tag[]): Tag[] => {
			const sorted = [...tagsToSort];
			switch (sortMode) {
				case "alphabetical":
					return sorted.sort((a, b) => a.name.localeCompare(b.name));
				case "count-asc":
					return sorted.sort(
						(a, b) =>
							(a.file_count ?? 0) - (b.file_count ?? 0) ||
							a.name.localeCompare(b.name)
					);
				case "count-desc":
					return sorted.sort(
						(a, b) =>
							(b.file_count ?? 0) - (a.file_count ?? 0) ||
							a.name.localeCompare(b.name)
					);
				default:
					return sorted;
			}
		},
		[sortMode]
	);

	// Group tags by category
	const tagsByCategory = useMemo(() => {
		if (!categories || !tagsWithFiles.length) return new Map<number, Tag[]>();

		const grouped = new Map<number, Tag[]>();
		const sortedTags = sortTags(tagsWithFiles);

		for (const tag of sortedTags) {
			const categoryId = tag.category_id;
			if (!grouped.has(categoryId)) {
				grouped.set(categoryId, []);
			}
			const categoryTags = grouped.get(categoryId);
			if (categoryTags) {
				categoryTags.push(tag);
			}
		}

		return grouped;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [categories, tagsWithFiles, sortTags]);

	// Get selected tags for display
	const selectedTags = useMemo(() => {
		if (!tags) return [];
		return tags.filter((tag) => selectedTagIds.includes(tag.tag_id));
	}, [tags, selectedTagIds]);

	// Sort categories by sort_order
	const sortedCategories = useMemo(() => {
		if (!categories) return [];
		return [...categories].sort((a, b) => a.sort_order - b.sort_order);
	}, [categories]);

	if (isLoading) {
		return (
			<div className="w-80 border-r flex flex-col h-full">
				<div className="p-4 border-b">
					<Skeleton className="h-10 w-full mb-3" />
					<Skeleton className="h-8 w-full" />
				</div>
				<div className="p-4 space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={`skeleton-tag-${i}`} className="h-6 w-full" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div
			className="w-80 border-r flex flex-col h-full shrink-0"
			style={{ width: "320px", maxWidth: "320px", minWidth: "320px" }}
		>
			{/* Selected Tags Area */}
			<SelectedTagsArea
				selectedTags={selectedTags}
				onRemoveTag={toggleTag}
				onClearAll={clearFilters}
			/>

			{/* Header */}
			<div className="p-4 border-b shrink-0 overflow-hidden">
				<div className="flex items-center justify-between mb-3 gap-2 min-w-0">
					<h2 className="text-lg font-semibold truncate min-w-0">Filter by Tags</h2>
					<SortControl sortMode={sortMode} onSortChange={setSortMode} />
				</div>

				{/* Search */}
				<Input
					type="text"
					placeholder="搜索标签..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full"
				/>

				{/* Show empty tags toggle */}
				<div className="mt-3 flex items-center gap-2">
					<Checkbox
						id="show-empty-tags"
						checked={showEmptyTags}
						onCheckedChange={(checked) => setShowEmptyTags(checked === true)}
					/>
					<Label htmlFor="show-empty-tags" className="text-sm cursor-pointer">
						显示空标签
					</Label>
				</div>
			</div>

			{/* Tag list */}
			<ScrollArea className="flex-1">
				<div className="p-4">
					{!filteredTags || filteredTags.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							{searchQuery ? "未找到标签" : "暂无标签"}
						</p>
					) : (
						<div>
							{/* Category sections */}
							{sortedCategories.map((category) => {
								const categoryTags = tagsByCategory.get(category.category_id) ?? [];
								if (categoryTags.length === 0) return null;

								return (
									<CollapsibleCategorySection
										key={category.category_id}
										category={category}
										tags={categoryTags}
										selectedTagIds={selectedTagIds}
										onToggleTag={toggleTag}
									/>
								);
							})}

							{/* Empty tags section */}
							{showEmptyTags && tagsWithoutFiles.length > 0 && (
								<EmptyTagsSection tags={sortTags(tagsWithoutFiles)} />
							)}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
