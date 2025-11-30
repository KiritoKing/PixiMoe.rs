import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { FileRecord } from "@/types";

export function useSearchFiles(tagIds: number[], favoritesOnly?: boolean) {
	return useQuery({
		queryKey: ["search-files", tagIds, favoritesOnly],
		queryFn: async () => {
			const files = await invoke<FileRecord[]>("search_files_by_tags", {
				tagIds,
				favoritesOnly: favoritesOnly ?? false,
			});
			return files;
		},
		enabled: tagIds.length > 0 || favoritesOnly === true,
	});
}
