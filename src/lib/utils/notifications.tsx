import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Toast } from "react-hot-toast";
import { useNotifications } from "@/lib/stores/useNotifications";
import type { NotificationType } from "@/types";

const typeIcons = {
	success: CheckCircle2,
	error: AlertCircle,
	info: Info,
	warning: AlertTriangle,
};

// Track active toast IDs in FIFO queue to limit display
const activeToastQueue: string[] = [];
const MAX_TOASTS = 3;

/**
 * Helper function to add a notification to the notification center
 * and optionally show a toast with a "View Details" link
 */
export function addNotification(
	type: NotificationType,
	title: string,
	message: string,
	details?: string,
	pinned = false
) {
	const { addNotification: add } = useNotifications.getState();
	add({
		type,
		title,
		message,
		details,
		pinned,
	});
}

/**
 * Get computed styles from document to resolve CSS variables
 */
function getComputedStyleValue(property: string): string {
	if (typeof document !== "undefined") {
		const root = document.documentElement;
		const value = getComputedStyle(root).getPropertyValue(property).trim();
		return value || "";
	}
	return "";
}

/**
 * Create a toast with a "View Details" link that opens the notification center
 * Maintains a FIFO queue of MAX_TOASTS (3) toasts - new toasts dismiss the oldest
 */
export function createToastWithDetails(
	toast: typeof import("react-hot-toast").toast,
	type: NotificationType,
	title: string,
	message: string,
	details?: string,
	pinned = false
) {
	// Always add to notification center
	addNotification(type, title, message, details, pinned);

	// If we've reached the limit, dismiss the oldest toast (FIFO)
	if (activeToastQueue.length >= MAX_TOASTS) {
		const oldestToastId = activeToastQueue.shift();
		if (oldestToastId) {
			toast.dismiss(oldestToastId);
		}
	}

	// Show toast with "View Details" link
	const { setOpen } = useNotifications.getState();
	const Icon = typeIcons[type];

	// Get computed styles
	const radius = getComputedStyleValue("--radius") || "0.625rem";
	const isDark =
		typeof document !== "undefined" && document.documentElement.classList.contains("dark");
	const backgroundColor = isDark ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)";
	const textColor = isDark ? "rgb(250, 250, 250)" : "rgb(23, 23, 23)";
	const borderColorValue = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

	const toastContent = (t: Toast) => (
		<div
			style={{
				background: backgroundColor,
				backgroundColor: backgroundColor,
				color: textColor,
				border: `1px solid ${borderColorValue}`,
				borderRadius: radius ? `calc(${radius} - 2px)` : "6px",
				padding: "12px 16px",
				boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
				margin: "-8px -10px", // Offset default padding from react-hot-toast
			}}
			className="flex items-start gap-3"
		>
			<Icon
				className={`h-5 w-5 shrink-0 mt-0.5 ${
					type === "success"
						? "text-green-600 dark:text-green-400"
						: type === "error"
							? "text-red-600 dark:text-red-400"
							: type === "info"
								? "text-blue-600 dark:text-blue-400"
								: "text-yellow-600 dark:text-yellow-400"
				}`}
			/>
			<div className="flex flex-col gap-1 flex-1 min-w-0">
				<div className="font-semibold text-sm">{title}</div>
				<div className="text-sm text-muted-foreground line-clamp-2">{message}</div>
				{details && (
					<button
						type="button"
						onClick={() => {
							toast.dismiss(t.id);
							setOpen(true);
						}}
						className="text-xs text-primary hover:underline mt-1 text-left"
					>
						查看详情 →
					</button>
				)}
			</div>
			<button
				type="button"
				onClick={() => {
					toast.dismiss(t.id);
					// Remove from queue
					const index = activeToastQueue.indexOf(t.id);
					if (index > -1) {
						activeToastQueue.splice(index, 1);
					}
				}}
				className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
				aria-label="关闭"
			>
				<svg
					className="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					role="img"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	);

	const toastOptions = {
		duration: type === "error" ? 5000 : 4000,
		style: {
			background: "transparent", // Let the content div handle the background
			padding: "8px 10px", // Minimal padding, content div has its own padding
		},
		className: "toast-notification",
		onDismiss: (t: Toast) => {
			// Remove from queue when toast is dismissed
			const index = activeToastQueue.indexOf(t.id);
			if (index > -1) {
				activeToastQueue.splice(index, 1);
			}
		},
	};

	// Use toast() for all types to ensure consistent styling
	// The icon in the content will indicate the type
	// This avoids issues with toast.error/toast.success overriding our styles
	const toastId = toast(toastContent, toastOptions);

	// Add to queue (FIFO - newest at the end)
	// toast() returns a string ID
	const toastIdString = String(toastId);
	activeToastQueue.push(toastIdString);

	return toastId;
}
