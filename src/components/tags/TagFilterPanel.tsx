import { useState } from "react";
import { useTags } from "@/lib/hooks";
import type { Tag } from "@/types";

interface TagFilterPanelProps {
  selectedTagIds: number[];
  onTagsChange: (tagIds: number[]) => void;
}

export function TagFilterPanel({ selectedTagIds, onTagsChange }: TagFilterPanelProps) {
  const { data: tags, isLoading } = useTags();
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredTags = tags?.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tags by type
  const tagsByType = filteredTags?.reduce((acc, tag) => {
    if (!acc[tag.type]) {
      acc[tag.type] = [];
    }
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const tagTypeLabels: Record<string, string> = {
    general: "General",
    character: "Characters",
    artist: "Artists",
    series: "Series",
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-3">Filter by Tags</h2>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Clear button */}
        {selectedTagIds.length > 0 && (
          <button
            onClick={clearFilters}
            className="mt-2 w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters ({selectedTagIds.length})
          </button>
        )}
      </div>

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto p-4">
        {!filteredTags || filteredTags.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            {searchQuery ? "No tags found" : "No tags available"}
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(tagsByType || {}).map(([type, typeTags]) => (
              <div key={type}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {tagTypeLabels[type] || type}
                </h3>
                <div className="space-y-1">
                  {typeTags.map((tag) => (
                    <label
                      key={tag.tag_id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.tag_id)}
                        onChange={() => toggleTag(tag.tag_id)}
                        className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm truncate">{tag.name}</span>
                      {tag.file_count !== undefined && tag.file_count > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {tag.file_count}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
