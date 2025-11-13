import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { ImageGrid } from "./components/ImageGrid";
import { TagFilterPanel } from "./components/TagFilterPanel";
import { ImportButton } from "./components/ImportButton";
import { useFiles, useSearchFiles } from "./lib/hooks";
import "./App.css";

function App() {
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  // Listen for thumbnail regeneration events
  useEffect(() => {
    const unlisten = listen<number>("thumbnails_regenerated", (event) => {
      console.log(`${event.payload} thumbnails were regenerated, refreshing...`);
      // Invalidate all file queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["files"] });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [queryClient]);

  // Use search if tags are selected, otherwise get all files
  const { data: allFiles, isLoading: allLoading } = useFiles(0, 100);
  const { data: filteredFiles, isLoading: searchLoading } = useSearchFiles(selectedTagIds);

  const files = selectedTagIds.length > 0 ? filteredFiles : allFiles;
  const isLoading = selectedTagIds.length > 0 ? searchLoading : allLoading;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
      {/* Top toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Image Gallery</h1>
        <div className="flex items-center gap-4">
          <ImportButton />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tag filter sidebar */}
        <TagFilterPanel
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
        />

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto">
          <ImageGrid files={files} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default App;
