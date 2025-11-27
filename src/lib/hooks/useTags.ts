import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Tag } from "@/types";

export function useTags() {
	return useQuery({
		queryKey: ["tags"],
		queryFn: async () => {
			const tags = await invoke<Tag[]>("get_all_tags");
			return tags;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

export function useFileTags(fileHash: string | null) {
	return useQuery({
		queryKey: ["file-tags", fileHash],
		queryFn: async () => {
			if (!fileHash) return [];
			const tags = await invoke<Tag[]>("get_file_tags", { fileHash });
			return tags;
		},
		enabled: !!fileHash,
	});
}
