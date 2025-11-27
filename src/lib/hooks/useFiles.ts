import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { FileRecord } from "@/types";

export function useFiles() {
  return useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const files = await invoke<FileRecord[]>("get_all_files", {
        offset: 0,
        limit: undefined, // No limit - get all files
      });
      return files;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

export function useFileByHash(fileHash: string | null) {
  return useQuery({
    queryKey: ["file", fileHash],
    queryFn: async () => {
      if (!fileHash) return null;
      const file = await invoke<FileRecord | null>("get_file_by_hash", {
        fileHash,
      });
      return file;
    },
    enabled: !!fileHash,
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileHash, deleteFromDisk = false }: { fileHash: string; deleteFromDisk?: boolean }) => {
      await invoke("delete_file", {
        fileHash,
        deleteFromDisk
      });
    },
    onSuccess: () => {
      // Invalidate files query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDeleteFilesBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileHashes, deleteFromDisk = false }: {
      fileHashes: string[];
      deleteFromDisk?: boolean
    }) => {
      const deletedCount = await invoke<number>("delete_files_batch", {
        fileHashes,
        deleteFromDisk
      });
      return deletedCount;
    },
    onSuccess: () => {
      // Invalidate files query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}
