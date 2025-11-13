import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ImportResult } from "@/types";

export function useImportFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paths?: string[]) => {
      // If no paths provided, open file picker
      let filePaths = paths;
      if (!filePaths) {
        const selected = await open({
          multiple: true,
          filters: [
            {
              name: "Images",
              extensions: ["jpg", "jpeg", "png", "webp", "gif"],
            },
          ],
        });

        if (!selected) {
          throw new Error("No files selected");
        }

        filePaths = Array.isArray(selected) ? selected : [selected];
      }

      // Import each file
      const results: ImportResult[] = [];
      for (const path of filePaths) {
        const result = await invoke<ImportResult>("import_file", { path });
        results.push(result);
      }

      return results;
    },
    onSuccess: () => {
      // Invalidate and refetch files and tags
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
