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
      // Preserve the exact value passed - don't default to true
      // This ensures false values are correctly passed through
      const enableAITagging = options?.enableAITagging;

      // Debug log to verify the values
      console.log(
        "[Import] tagNames:",
        tagNames,
        "enableAITagging:",
        enableAITagging,
        "from options:",
        options,
      );

      // Import each file
      const results: ImportResult[] = [];
      for (const path of filePaths) {
        console.log(
          "[Import] Calling import_file with enableAITagging:",
          enableAITagging,
        );
        const tagsToPass = tagNames && tagNames.length > 0
          ? tagNames
          : undefined;
        console.log(
          "[Import] Calling import_file for",
          path,
          "with tagNames:",
          tagsToPass,
        );
        const result = await invoke<ImportResult>("import_file", {
          path,
          tagNames: tagsToPass,
          enableAITagging, // Don't pass enableAITagging to import_file - we'll handle it after all imports complete
        });
        results.push(result);
      }

      // Collect file hashes of successfully imported files (non-duplicates)
      const importedHashes = results
        .filter((r) => !r.is_duplicate)
        .map((r) => r.file_hash);

      return {
        results,
        tagNames: tagNames || [],
        importedHashes, // Return hashes for potential AI tagging
        enableAITagging, // Return the flag so caller can decide whether to start AI tagging
      };
    },
    onSuccess: (data) => {
      // Immediately invalidate and refetch files to show imported files in the list
      // Thumbnails and AI tagging will update individually as they complete
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      // Refresh tags for all imported files so they show up immediately
      // This ensures tags added during import are visible right away
      if (data.importedHashes && data.importedHashes.length > 0) {
        data.importedHashes.forEach((fileHash) => {
          queryClient.invalidateQueries({ queryKey: ["file-tags", fileHash] });
        });
      }
    },
  });
}
