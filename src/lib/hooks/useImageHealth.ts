import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import type {
	FileWithHealthStatus,
	HealthCheckProgressEvent,
	HealthCheckResult,
	ImageHealthStatus,
	RecoveryResult,
} from "@/types";

// Hook for getting health status summary for the entire library
export function useImageHealth() {
	return useQuery({
		queryKey: ["image-health"],
		queryFn: async () => {
			const result = await invoke<HealthCheckResult>("get_health_summary");
			return result;
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
	});
}

// Hook for getting files filtered by health status
export function useHealthStatusFiles(healthStatus: ImageHealthStatus | string) {
	const queryKey = ["files-by-health", healthStatus];

	return useQuery({
		queryKey,
		queryFn: async () => {
			const files = await invoke<FileWithHealthStatus[]>("get_files_by_health_status", {
				healthStatus,
			});
			return files;
		},
		enabled: !!healthStatus,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

// Hook for running health check on all images
export function useCheckAllImagesHealth() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const result = await invoke<HealthCheckResult>("check_all_images_health");
			return result;
		},
		onSuccess: () => {
			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["image-health"] });
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["files-by-health"] });
		},
	});
}

// Hook for regenerating missing thumbnails
export function useRegenerateMissingThumbnails() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const result = await invoke<RecoveryResult>("regenerate_missing_thumbnails_health");
			return result;
		},
		onSuccess: () => {
			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["image-health"] });
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["files-by-health"] });
		},
	});
}

// Hook for checking health of a specific file
export function useCheckFileHealth() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileHash: string) => {
			const result = await invoke<FileWithHealthStatus>("check_file_health", {
				fileHash,
			});
			return result;
		},
		onSuccess: (_, fileHash) => {
			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["file", fileHash] });
			queryClient.invalidateQueries({ queryKey: ["files"] });
			queryClient.invalidateQueries({ queryKey: ["image-health"] });
		},
	});
}

// Hook for listening to health check progress events
export function useHealthCheckProgress() {
	const [progress, setProgress] = useState<HealthCheckProgressEvent | null>(null);
	const [isRunning, setIsRunning] = useState(false);

	useEffect(() => {
		let unlisten: (() => void) | null = null;

		const setupListener = async () => {
			try {
				unlisten = await listen<HealthCheckProgressEvent>(
					"health_check_progress",
					(event) => {
						setProgress(event.payload);
						setIsRunning(event.payload.stage !== "complete");
					}
				);
			} catch (error) {
				console.error("Failed to listen to health check progress:", error);
			}
		};

		setupListener();

		return () => {
			if (unlisten) {
				unlisten();
			}
		};
	}, []);

	return { progress, isRunning };
}

// Hook for listening to thumbnail regeneration progress
export function useThumbnailRegenerationProgress() {
	const [progress, setProgress] = useState<{
		regenerated_count: number;
		error_count: number;
		total_processed: number;
	} | null>(null);
	const [isRunning, setIsRunning] = useState(false);

	useEffect(() => {
		let unlisten: (() => void) | null = null;

		const setupListener = async () => {
			try {
				unlisten = await listen("thumbnail_regeneration_complete", (event) => {
					setProgress(
						event.payload as {
							regenerated_count: number;
							error_count: number;
							total_processed: number;
						}
					);
					setIsRunning(false);
				});

				// Also listen for health check progress which includes regeneration
				const healthProgressUnlisten = await listen("health_check_progress", (event) => {
					const payload = event.payload as HealthCheckProgressEvent;
					if (payload.stage === "regenerating_thumbnails") {
						setIsRunning(true);
					}
				});

				return () => {
					healthProgressUnlisten();
				};
			} catch (error) {
				console.error("Failed to listen to thumbnail regeneration progress:", error);
			}
		};

		const cleanup = setupListener();

		return () => {
			if (unlisten) {
				unlisten();
			}
			if (cleanup) {
				cleanup.then((fn) => fn?.());
			}
		};
	}, []);

	return { progress, isRunning };
}

// Hook for getting health status counts with automatic refresh
export function useHealthStatusCounts() {
	const { data: healthSummary, isLoading } = useImageHealth();

	const counts = useMemo(() => {
		if (!healthSummary) {
			return {
				healthy: 0,
				issues: 0,
				thumbnailMissing: 0,
				originalMissing: 0,
				thumbnailCorrupted: 0,
				bothMissing: 0,
				hasMissingOriginals: false,
			};
		}

		return {
			healthy: healthSummary.healthy_count,
			issues: healthSummary.issues_found,
			thumbnailMissing: healthSummary.thumbnail_missing_count,
			originalMissing: healthSummary.original_missing_count,
			thumbnailCorrupted: healthSummary.thumbnail_corrupted_count,
			bothMissing: healthSummary.both_missing_count,
			hasMissingOriginals: healthSummary.has_missing_originals,
		};
	}, [healthSummary]);

	return { counts, isLoading };
}
