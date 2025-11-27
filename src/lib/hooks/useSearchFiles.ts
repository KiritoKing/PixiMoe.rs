import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { FileRecord } from "@/types";

export function useSearchFiles(tagIds: number[]) {
	return useQuery({
		queryKey: ["search-files", tagIds],
		queryFn: async () => {
			const files = await invoke<FileRecord[]>("search_files_by_tags", {
				tagIds,
			});
			return files;
		},
		enabled: tagIds.length > 0,
	});
}
