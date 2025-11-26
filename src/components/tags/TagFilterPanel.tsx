import { useState } from "react";
import { useTags } from "@/lib/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="w-64 border-r p-4">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Filter by Tags</h2>
        
        {/* Search */}
        <Input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Clear button */}
        {selectedTagIds.length > 0 && (
          <Button
            variant="link"
            size="sm"
            onClick={clearFilters}
            className="mt-2 w-full"
          >
            Clear filters ({selectedTagIds.length})
          </Button>
        )}
      </div>

      {/* Tag list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {!filteredTags || filteredTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {searchQuery ? "No tags found" : "No tags available"}
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(tagsByType || {}).map(([type, typeTags]) => (
                <div key={type}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {tagTypeLabels[type] || type}
                  </h3>
                  <div className="space-y-1">
                    {typeTags.map((tag) => (
                      <label
                        key={tag.tag_id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.tag_id)}
                          onChange={() => toggleTag(tag.tag_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="flex-1 text-sm truncate">{tag.name}</span>
                        {tag.file_count !== undefined && tag.file_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {tag.file_count}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
