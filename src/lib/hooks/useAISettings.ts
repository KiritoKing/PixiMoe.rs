import { invoke } from "@tauri-apps/api/core";

export interface AISettings {
	ai_enabled: boolean;
}

const DEFAULT_AI_SETTINGS: AISettings = {
	ai_enabled: true,
};

// Get AI settings from backend
export async function getAISettings(): Promise<AISettings> {
	try {
		return await invoke<AISettings>("get_ai_settings");
	} catch (error) {
		console.error("Failed to get AI settings from backend, using default:", error);
		return DEFAULT_AI_SETTINGS;
	}
}

// Set AI settings via backend
export async function setAISettings(settings: AISettings): Promise<void> {
	await invoke("set_ai_settings", { settings });
}

// Toggle AI enabled state via backend
export async function toggleAIEnabled(): Promise<boolean> {
	const current = await getAISettings();
	const newState = !current.ai_enabled;
	await setAISettings({ ai_enabled: newState });
	return newState;
}

// Get AI enabled status via backend (convenient helper)
export async function isAIEnabled(): Promise<boolean> {
	try {
		return await invoke<boolean>("is_ai_enabled");
	} catch (error) {
		console.error("Failed to get AI enabled status from backend, assuming enabled:", error);
		return true;
	}
}
