import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { FileRecord } from "@/types";

export function useFiles(offset = 0, limit = 100) {
  return useQuery({
    queryKey: ["files", offset, limit],
    queryFn: async () => {
      const files = await invoke<FileRecord[]>("get_all_files", {
        offset,
        limit,
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
