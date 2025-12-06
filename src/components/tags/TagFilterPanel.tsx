import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FavoriteCheckbox } from "@/components/favorites/FavoriteCheckbox";
import { HealthStatusFilter } from "@/components/gallery/HealthStatusFilter";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTags } from "@/lib/hooks/useTags";
import { getUIPreference, setUIPreference, UI_PREFERENCE_KEYS } from "@/lib/ui-persister";
import type { ImageHealthStatus, Tag } from "@/types";
import { CollapsibleCategorySection } from "./CollapsibleCategorySection";
import { EmptyTagsSection } from "./EmptyTagsSection";
import { SelectedTagsArea } from "./SelectedTagsArea";
import { SortControl, type SortMode } from "./SortControl";

interface TagFilterPanelProps {
	selectedTagIds: number[];
	onTagsChange: (tagIds: number[]) => void;
	searchInputRef?: React.RefObject<HTMLInputElement | null>;
	favoritesOnly?: boolean;
	onFavoritesOnlyChange?: (favoritesOnly: boolean) => void;
	fileHashes?: string[];
	healthFilter?: ImageHealthStatus | null;
	onHealthFilterChange?: (healthFilter: ImageHealthStatus | null) => void;
}

export function TagFilterPanel({
	selectedTagIds,
	onTagsChange,
	searchInputRef,
	favoritesOnly = false,
	onFavoritesOnlyChange,
	fileHashes = [],
	healthFilter,
	onHealthFilterChange,
}: TagFilterPanelProps) {
	const { data: tags, isLoading: tagsLoading } = useTags();
	const { data: categories, isLoading: categoriesLoading } = useCategories();
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
	const [showEmptyTags, setShowEmptyTags] = useState(false);
	const [sortMode, setSortMode] = useState<SortMode>("alphabetical");
	const [healthFilterExpanded, setHealthFilterExpanded] = useState(false);

	// Load persisted preferences
	useEffect(() => {
		const loadPreferences = async () => {
			const savedSortMode = await getUIPreference<SortMode>(
				UI_PREFERENCE_KEYS.TAG_FILTER_SORT_MODE,
				"alphabetical"
			);
			const savedShowEmptyTags = await getUIPreference<boolean>(
				UI_PREFERENCE_KEYS.TAG_FILTER_SHOW_EMPTY_TAGS,
				false
			);
			setSortMode(savedSortMode);
			setShowEmptyTags(savedShowEmptyTags);
		};
		loadPreferences();
	}, []);

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 300); // 300ms debounce

		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Save preferences when they change
	useEffect(() => {
		setUIPreference(UI_PREFERENCE_KEYS.TAG_FILTER_SORT_MODE, sortMode);
	}, [sortMode]);

	useEffect(() => {
		setUIPreference(UI_PREFERENCE_KEYS.TAG_FILTER_SHOW_EMPTY_TAGS, showEmptyTags);
	}, [showEmptyTags]);

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

	// Filter tags by search query (using debounced query)
	// Supports searching by both name and alias
	const filteredTags = useMemo(() => {
		if (!tags) return [];
		if (!debouncedSearchQuery.trim()) return tags;
		const query = debouncedSearchQuery.toLowerCase();
		return tags.filter(
			(tag) =>
				tag.name.toLowerCase().includes(query) || tag.alias?.toLowerCase().includes(query)
		);
	}, [tags, debouncedSearchQuery]);

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
					ref={searchInputRef}
					type="text"
					placeholder="搜索标签... (Ctrl+K)"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full"
				/>

				{/* Favorites filter */}
				{onFavoritesOnlyChange && (
					<div className="mt-3">
						<FavoriteCheckbox
							fileHashes={fileHashes}
							onChange={onFavoritesOnlyChange}
							checked={favoritesOnly}
						/>
					</div>
				)}

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

			{/* Health status filter at bottom */}
			<div className="border-t p-3">
				<Collapsible open={healthFilterExpanded} onOpenChange={setHealthFilterExpanded}>
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
						>
							<span>Image Health Issues</span>
							<ChevronDown
								className={`h-4 w-4 transition-transform ${healthFilterExpanded ? "rotate-180" : ""}`}
							/>
						</button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3">
						<HealthStatusFilter
							currentFilter={healthFilter}
							onFilterChange={onHealthFilterChange}
						/>
					</CollapsibleContent>
				</Collapsible>
			</div>
		</div>
	);
}
