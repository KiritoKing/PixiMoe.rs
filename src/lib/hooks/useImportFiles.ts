import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { ImportResult } from "@/types";

export function useImportFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      options?: {
        paths?: string[];
        tagNames?: string[];
        enableAITagging?: boolean;
      },
    ) => {
      // Paths must be provided (file picker is handled in ImportButton)
      const filePaths = options?.paths;
      if (!filePaths || filePaths.length === 0) {
        throw new Error("No files selected");
      }

      const tagNames = options?.tagNames;
      const enableAITagging = options?.enableAITagging ?? true; // Default to true for backward compatibility

      // Import each file
      const results: ImportResult[] = [];
      for (const path of filePaths) {
        const result = await invoke<ImportResult>("import_file", {
          path,
          tagNames: tagNames && tagNames.length > 0 ? tagNames : undefined,
          enableAITagging,
        });
        results.push(result);
      }

      return { results, tagNames: tagNames || [] };
    },
    onSuccess: () => {
      // Invalidate and refetch files and tags
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
