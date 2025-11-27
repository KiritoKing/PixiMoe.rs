import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { ImageGrid } from "./components/gallery/ImageGrid";
import { ImportButton } from "./components/import/ImportButton";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { TagFilterPanel } from "./components/tags/TagFilterPanel";
import { ThemeToggle } from "./components/theme-toggle";
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

	// Listen for database clearing completion events
	useEffect(() => {
		const unlisten = listen("clear_database_progress", (event) => {
			const progress = event.payload;
			if (progress.stage === "completed") {
				console.log("Database cleared, refreshing all queries...");
				// Invalidate all queries to trigger a complete refresh
				queryClient.invalidateQueries();
			}
		});

		return () => {
			unlisten.then((fn) => fn());
		};
	}, [queryClient]);

	// Use search if tags are selected, otherwise get all files
	const { data: allFiles, isLoading: allLoading } = useFiles();
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
					<div className="flex-1 overflow-hidden">
						<ImageGrid files={files} isLoading={isLoading} />
					</div>
				</div>
			</div>
		</>
	);
}

export default App;
