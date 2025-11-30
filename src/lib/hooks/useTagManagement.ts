import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Tag } from "@/types";

// Search tags by prefix (for autocomplete)
export function useSearchTags(prefix: string, limit?: number) {
	return useQuery({
		queryKey: ["tags", "search", prefix, limit],
		queryFn: async () => {
			if (!prefix) return [];
			return invoke<Tag[]>("search_tags", { prefix, limit: limit || 20 });
		},
		enabled: prefix.length > 0,
	});
}

// Add tag to file
export function useAddTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			fileHash,
			tagName,
			tagType,
		}: {
			fileHash: string;
			tagName: string;
			tagType?: string;
		}) => {
			return invoke<number>("add_tag_to_file", {
				fileHash,
				tagName,
				tagType,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({
				queryKey: ["file-tags", variables.fileHash],
			});
		},
	});
}

// Remove tag from file
export function useRemoveTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ fileHash, tagId }: { fileHash: string; tagId: number }) => {
			return invoke<void>("remove_tag_from_file", {
				fileHash,
				tagId,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({
				queryKey: ["file-tags", variables.fileHash],
			});
		},
	});
}

// Add tags to multiple files (batch)
export function useBatchAddTags() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			fileHashes,
			tagNames,
			tagType,
		}: {
			fileHashes: string[];
			tagNames: string[];
			tagType?: string;
		}) => {
			return invoke<number>("add_tags_to_files", {
				fileHashes,
				tagNames,
				tagType,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			// Invalidate file-tags queries for all affected files
			variables.fileHashes.forEach((fileHash) => {
				queryClient.invalidateQueries({ queryKey: ["file-tags", fileHash] });
			});
		},
	});
}

// Remove tag from multiple files (batch)
export function useBatchRemoveTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ fileHashes, tagId }: { fileHashes: string[]; tagId: number }) => {
			return invoke<number>("remove_tag_from_files", {
				fileHashes,
				tagId,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			// Invalidate file-tags queries for all affected files
			variables.fileHashes.forEach((fileHash) => {
				queryClient.invalidateQueries({ queryKey: ["file-tags", fileHash] });
			});
		},
	});
}

// Run AI tagging on a single file
export function useRunAITagging() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileHash: string) => {
			return invoke<number>("tag_file_with_ai", { fileHash });
		},
		onSuccess: (_, fileHash) => {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({ queryKey: ["file-tags", fileHash] });
		},
	});
}

// Run AI tagging on multiple files (batch)
export function useBatchAITagging() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileHashes: string[]) => {
			return invoke<number>("tag_files_batch", { fileHashes });
		},
		onSuccess: (_, fileHashes) => {
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			// Invalidate file-tags queries for all affected files
			fileHashes.forEach((fileHash) => {
				queryClient.invalidateQueries({ queryKey: ["file-tags", fileHash] });
			});
		},
	});
}

// Update tag (rename and/or move to different category)
export function useUpdateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			tagId,
			name,
			categoryId,
		}: {
			tagId: number;
			name: string;
			categoryId: number;
		}) => {
			return invoke<void>("update_tag", {
				tagId,
				name,
				categoryId,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["file-tags"] });
			queryClient.invalidateQueries({ queryKey: ["search-files"] });
		},
	});
}

// Delete tag
export function useDeleteTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (tagId: number) => {
			return invoke<void>("delete_tag", { tagId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({ queryKey: ["file-tags"] });
			queryClient.invalidateQueries({ queryKey: ["search-files"] });
			queryClient.invalidateQueries({ queryKey: ["files"] });
		},
	});
}
