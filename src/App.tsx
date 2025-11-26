import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ImageGrid } from "./components/gallery/ImageGrid";
import { TagFilterPanel } from "./components/tags/TagFilterPanel";
import { ImportButton } from "./components/import/ImportButton";
import { ThemeToggle } from "./components/theme-toggle";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
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
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
          success: {
            iconTheme: {
              primary: "hsl(var(--primary))",
              secondary: "hsl(var(--primary-foreground))",
            },
          },
          error: {
            duration: 5000,
            style: {
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            },
          },
        }}
      />
      <div className="flex flex-col h-screen bg-background">
        {/* Top toolbar */}
        <div className="border-b p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Image Gallery</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationCenter />
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
    </>
  );
}

export default App;
