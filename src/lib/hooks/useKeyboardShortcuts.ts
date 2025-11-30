import { useEffect } from "react";

interface KeyboardShortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean; // Cmd on Mac
	handler: () => void;
	description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			for (const shortcut of shortcuts) {
				const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

				// For ctrl shortcuts, allow both Ctrl (Windows/Linux) and Cmd (Mac)
				// If ctrl is required, check for either ctrlKey or metaKey
				// If ctrl is not required, neither should be pressed
				let ctrlMatch = true;
				if (shortcut.ctrl) {
					ctrlMatch = e.ctrlKey || e.metaKey; // Allow Ctrl or Cmd
				} else {
					ctrlMatch = !e.ctrlKey && !e.metaKey; // Neither should be pressed
				}

				const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
				const altMatch = shortcut.alt ? e.altKey : !e.altKey;
				// meta is separate from ctrl - if meta is explicitly required, only metaKey counts
				const metaMatch =
					shortcut.meta !== undefined ? (shortcut.meta ? e.metaKey : !e.metaKey) : true; // If not specified, don't check

				if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
					// Don't trigger if user is typing in an input/textarea
					const target = e.target as HTMLElement;
					if (
						target.tagName === "INPUT" ||
						target.tagName === "TEXTAREA" ||
						target.isContentEditable
					) {
						continue;
					}

					e.preventDefault();
					shortcut.handler();
					break;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [shortcuts]);
}

// Common keyboard shortcuts for the app
export const APP_SHORTCUTS = {
	CLEAR_FILTERS: { key: "Escape", description: "清除所有标签筛选" },
	TOGGLE_FAVORITES: { key: "f", ctrl: true, description: "切换收藏筛选" },
	FOCUS_SEARCH: { key: "k", ctrl: true, description: "聚焦搜索框" },
} as const;
