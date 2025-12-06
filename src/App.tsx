import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { ImageGrid } from "./components/gallery/ImageGrid";
import { ImportButton } from "./components/import/ImportButton";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { TagFilterPanel } from "./components/tags/TagFilterPanel";
import { ThemeToggle } from "./components/theme-toggle";
import { useFiles } from "./lib/hooks/useFiles";
import { useHealthStatusFiles } from "./lib/hooks/useImageHealth";
import { useKeyboardShortcuts } from "./lib/hooks/useKeyboardShortcuts";
import { useSearchFiles } from "./lib/hooks/useSearchFiles";
import { useTauriEvent } from "./lib/hooks/useTauriEvent";
import type { ImageHealthStatus } from "./types";
import "./App.css";

function App() {
	const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const [healthFilter, setHealthFilter] = useState<ImageHealthStatus | null>(null);
	const queryClient = useQueryClient();
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Keyboard shortcuts
	useKeyboardShortcuts([
		{
			key: "Escape",
			handler: () => {
				if (selectedTagIds.length > 0) {
					setSelectedTagIds([]);
				}
			},
		},
		{
			key: "f",
			ctrl: true,
			handler: () => {
				setFavoritesOnly(!favoritesOnly);
			},
		},
		{
			key: "k",
			ctrl: true,
			handler: () => {
				searchInputRef.current?.focus();
			},
		},
	]);

	// Listen for thumbnail regeneration events
	useTauriEvent<number>(
		"thumbnails_regenerated",
		(count) => {
			console.log(`${count} thumbnails were regenerated, refreshing...`);
			// Invalidate all file queries to trigger refetch
			queryClient.invalidateQueries({ queryKey: ["files"] });
		},
		[queryClient]
	);

	// Listen for database clearing completion events
	useTauriEvent<{ stage: string }>(
		"clear_database_progress",
		(progress) => {
			if (progress.stage === "completed") {
				console.log("Database cleared, refreshing all queries...");
				// Invalidate all queries to trigger a complete refresh
				queryClient.invalidateQueries();
			}
		},
		[queryClient]
	);

	// Listen for health check completion events to refresh file list with updated health status
	useTauriEvent<{ total_checked: number; issues_found: number }>(
		"health_check_complete",
		(result) => {
			console.log(
				`Health check complete: ${result.total_checked} files checked, ${result.issues_found} issues found`
			);
			// Invalidate file queries to refresh with updated health status
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["image-health"] });
		},
		[queryClient]
	);

	// Use search if tags are selected or favorites filter is active, otherwise get all files
	const { data: allFiles, isLoading: allLoading } = useFiles();
	const { data: filteredFiles, isLoading: searchLoading } = useSearchFiles(
		selectedTagIds,
		favoritesOnly
	);

	// Get health status filtered files if health filter is active
	const { data: healthFilteredFiles, isLoading: healthLoading } = useHealthStatusFiles(
		healthFilter || ""
	);

	// Determine which files to show based on active filters
	const hasTagOrFavoriteFilters = selectedTagIds.length > 0 || favoritesOnly;
	const hasHealthFilter = !!healthFilter;

	let files: any[] | undefined;
	let isLoading: boolean;

	if (hasHealthFilter) {
		// Health filter takes precedence
		files = healthFilteredFiles;
		isLoading = healthLoading;
	} else if (hasTagOrFavoriteFilters) {
		// Tag/favorite filters
		files = filteredFiles;
		isLoading = searchLoading;
	} else {
		// All files
		files = allFiles;
		isLoading = allLoading;
	}

	// Get file hashes for FavoriteCheckbox
	const fileHashes = files?.map((f) => f.file_hash) ?? [];

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
						<SettingsPanel />
					</div>
				</div>

				{/* Main content area */}
				<div className="flex flex-1 overflow-hidden">
					{/* Tag filter sidebar */}
					<div
						className="w-80 border-r flex flex-col h-full shrink-0"
						style={{ width: "320px", maxWidth: "320px", minWidth: "320px" }}
					>
						<TagFilterPanel
							selectedTagIds={selectedTagIds}
							onTagsChange={setSelectedTagIds}
							searchInputRef={searchInputRef}
							favoritesOnly={favoritesOnly}
							onFavoritesOnlyChange={setFavoritesOnly}
							fileHashes={fileHashes}
							healthFilter={healthFilter}
							onHealthFilterChange={setHealthFilter}
						/>
					</div>

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
