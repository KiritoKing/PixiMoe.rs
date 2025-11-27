import { useMutation, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { ProgressEvent } from "@/types";

export function useClearDatabase() {
	return useMutation({
		mutationFn: async (confirmation: string) => {
			const result = await invoke<{
				tables_cleared: string[];
				records_deleted: number;
				sequences_reset: boolean;
			}>("clear_database", { confirmation });
			return result;
		},
	});
}

export function useDatabaseStats() {
	return useQuery({
		queryKey: ["database_stats"],
		queryFn: async () => {
			const stats = await invoke<Record<string, number>>("get_database_stats");
			return stats;
		},
		refetchInterval: 30000, // Refresh every 30 seconds
	});
}

export function useClearDatabaseProgress() {
	const [progress, setProgress] = useState<ProgressEvent | null>(null);

	useEffect(() => {
		let unlisten: (() => void) | null = null;

		const setupListener = async () => {
			unlisten = await listen<ProgressEvent>("clear_database_progress", (event) => {
				setProgress(event.payload);
			});
		};

		setupListener();

		return () => {
			if (unlisten) {
				unlisten();
			}
		};
	}, []);

	return progress;
}
