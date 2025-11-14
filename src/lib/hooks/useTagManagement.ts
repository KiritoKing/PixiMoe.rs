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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

// Remove tag from file
export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileHash,
      tagId,
    }: {
      fileHash: string;
      tagId: number;
    }) => {
      return invoke<void>("remove_tag_from_file", {
        fileHash,
        tagId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

// Remove tag from multiple files (batch)
export function useBatchRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileHashes,
      tagId,
    }: {
      fileHashes: string[];
      tagId: number;
    }) => {
      return invoke<number>("remove_tag_from_files", {
        fileHashes,
        tagId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
