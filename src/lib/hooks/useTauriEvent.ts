import { type Event, listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

/**
 * Generic hook for listening to Tauri events with type safety and automatic cleanup.
 *
 * @template T - The type of the event payload
 * @param eventName - The name of the Tauri event to listen to
 * @param handler - Callback function that receives the event payload
 * @param deps - Optional dependency array for the effect (defaults to empty array)
 *
 * @example
 * ```tsx
 * useTauriEvent<ProgressEvent>("import_progress", (payload) => {
 *   setProgress(payload);
 * });
 * ```
 */
export function useTauriEvent<T = unknown>(
	eventName: string,
	handler: (payload: T) => void,
	deps: React.DependencyList = []
): void {
	// Use ref to store latest handler to avoid recreating listener on every handler change
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		let unlistenFn: (() => void) | null = null;

		const setupListener = async () => {
			unlistenFn = await listen<T>(eventName, (event: Event<T>) => {
				handlerRef.current(event.payload);
			});
		};

		setupListener();

		return () => {
			if (unlistenFn) {
				unlistenFn();
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [eventName, ...deps]);
}
