import { Store } from "@tauri-apps/plugin-store";

let store: Store | null = null;

async function getStore() {
	if (!store) {
		store = await Store.load("ui-preferences.dat");
	}
	return store;
}

export async function getUIPreference<T>(key: string, defaultValue: T): Promise<T> {
	try {
		const s = await getStore();
		const value = await s.get<T>(key);
		return value ?? defaultValue;
	} catch (error) {
		console.error(`Failed to get UI preference ${key}:`, error);
		return defaultValue;
	}
}

export async function setUIPreference<T>(key: string, value: T): Promise<void> {
	try {
		const s = await getStore();
		await s.set(key, value);
		await s.save();
	} catch (error) {
		console.error(`Failed to set UI preference ${key}:`, error);
	}
}

// Specific preference keys
export const UI_PREFERENCE_KEYS = {
	TAG_FILTER_SORT_MODE: "tag-filter-sort-mode",
	TAG_FILTER_SHOW_EMPTY_TAGS: "tag-filter-show-empty-tags",
	CATEGORY_COLLAPSED_STATES: "category-collapsed-states",
} as const;
