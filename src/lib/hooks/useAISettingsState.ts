import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AISettings, getAISettings, setAISettings } from "./useAISettings";

// Query key for AI settings
export const AI_SETTINGS_QUERY_KEY = ["ai_settings"];

// Hook to get current AI settings
export function useAISettings() {
	return useQuery({
		queryKey: AI_SETTINGS_QUERY_KEY,
		queryFn: getAISettings,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

// Hook to set AI settings
export function useSetAISettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (settings: AISettings) => {
			await setAISettings(settings);
			return settings;
		},
		onSuccess: (newSettings) => {
			queryClient.setQueryData(AI_SETTINGS_QUERY_KEY, newSettings);
		},
	});
}

// Hook to toggle AI enabled state
export function useToggleAIEnabled() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (checked: boolean): Promise<boolean> => {
			await setAISettings({ ai_enabled: checked });
			return checked;
		},
		onSuccess: (newState) => {
			queryClient.setQueryData(AI_SETTINGS_QUERY_KEY, (_old: AISettings | undefined) => ({
				ai_enabled: newState,
			}));
		},
	});
}

// Hook to get just the AI enabled boolean
export function useIsAIEnabled() {
	const { data: settings, ...rest } = useAISettings();
	return {
		...rest,
		isEnabled: settings?.ai_enabled ?? true, // Default to enabled
		settings,
	};
}
