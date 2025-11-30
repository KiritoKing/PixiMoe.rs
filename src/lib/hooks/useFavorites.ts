import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Favorite } from "@/types";

export function useToggleFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileHash: string) => {
			const isFavorite = await invoke<boolean>("toggle_favorite", { fileHash });
			return { fileHash, isFavorite };
		},
		onSuccess: (data) => {
			// Invalidate favorite-related queries
			queryClient.invalidateQueries({ queryKey: ["favorite-status", data.fileHash] });
			queryClient.invalidateQueries({ queryKey: ["favorite-statuses"] });
			queryClient.invalidateQueries({ queryKey: ["favorites"] });
			queryClient.invalidateQueries({ queryKey: ["favorite-count"] });
			// Also invalidate file queries as favorite status might affect filtering
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["search-files"] });
		},
	});
}

export function useFavoriteStatus(fileHash: string | null) {
	return useQuery({
		queryKey: ["favorite-status", fileHash],
		queryFn: async () => {
			if (!fileHash) return false;
			const isFavorite = await invoke<boolean>("get_favorite_status", { fileHash });
			return isFavorite;
		},
		enabled: !!fileHash,
		staleTime: 1 * 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useFavoriteStatuses(fileHashes: string[]) {
	return useQuery({
		queryKey: ["favorite-statuses", fileHashes.sort().join(",")],
		queryFn: async () => {
			if (fileHashes.length === 0) return new Map<string, boolean>();
			const statuses = await invoke<Record<string, boolean>>("get_favorite_statuses", {
				fileHashes,
			});
			return new Map(Object.entries(statuses));
		},
		enabled: fileHashes.length > 0,
		staleTime: 1 * 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useAllFavorites() {
	return useQuery({
		queryKey: ["favorites"],
		queryFn: async () => {
			const favorites = await invoke<Favorite[]>("get_all_favorites");
			return favorites;
		},
		staleTime: 1 * 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useAddFavorites() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileHashes: string[]) => {
			const addedCount = await invoke<number>("add_favorites", { fileHashes });
			return addedCount;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["favorites"] });
			queryClient.invalidateQueries({ queryKey: ["favorite-statuses"] });
			queryClient.invalidateQueries({ queryKey: ["favorite-count"] });
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["search-files"] });
		},
	});
}

export function useRemoveFavorites() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileHashes: string[]) => {
			const removedCount = await invoke<number>("remove_favorites", { fileHashes });
			return removedCount;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["favorites"] });
			queryClient.invalidateQueries({ queryKey: ["favorite-statuses"] });
			queryClient.invalidateQueries({ queryKey: ["favorite-count"] });
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["search-files"] });
		},
	});
}

export function useFavoriteCount() {
	return useQuery({
		queryKey: ["favorite-count"],
		queryFn: async () => {
			const count = await invoke<number>("get_favorite_count");
			return count;
		},
		staleTime: 1 * 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}
