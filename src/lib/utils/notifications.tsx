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

/**
 * Helper function to add a notification to the notification center
 * and optionally show a toast with a "View Details" link
 */
export function addNotification(
	type: NotificationType,
	title: string,
	message: string,
	details?: string,
	pinned = false,
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
 * Create a toast with a "View Details" link that opens the notification center
 */
export function createToastWithDetails(
	toast: typeof import("react-hot-toast").toast,
	type: NotificationType,
	title: string,
	message: string,
	details?: string,
	pinned = false,
) {
	// Add to notification center
	addNotification(type, title, message, details, pinned);

	// Show toast with "View Details" link
	const { setOpen } = useNotifications.getState();
	const Icon = typeIcons[type];

	const toastContent = (t: Toast) => (
		<div
			style={{
				background: backgroundColor,
				backgroundColor: backgroundColor,
				color: textColor,
				border: `1px solid ${borderColorValue}`,
				borderRadius: radius ? `calc(${radius} - 2px)` : "6px",
				padding: "12px 16px",
				boxShadow:
					"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
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
			<div className="flex flex-col gap-1 flex-1">
				<div className="font-semibold">{title}</div>
				<div className="text-sm">{message}</div>
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
		</div>
	);

	// Get computed styles from document to resolve CSS variables
	const getComputedStyleValue = (property: string): string => {
		if (typeof document !== "undefined") {
			const root = document.documentElement;
			const value = getComputedStyle(root).getPropertyValue(property).trim();
			return value || "";
		}
		return "";
	};

	// Get radius value
	const radius = getComputedStyleValue("--radius") || "0.625rem";

	// Check if dark mode is active
	const isDark =
		typeof document !== "undefined" &&
		document.documentElement.classList.contains("dark");

	// Use solid background colors for better compatibility
	// For dark mode: use dark background, for light mode: use light background
	const backgroundColor = isDark ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)";
	const textColor = isDark ? "rgb(250, 250, 250)" : "rgb(23, 23, 23)";
	const borderColorValue = isDark
		? "rgba(255, 255, 255, 0.1)"
		: "rgba(0, 0, 0, 0.1)";

	const toastOptions = {
		duration: type === "error" ? 5000 : 4000,
		style: {
			background: "transparent", // Let the content div handle the background
			padding: "8px 10px", // Minimal padding, content div has its own padding
		},
		className: "toast-notification",
	};

	// Use toast() for all types to ensure consistent styling
	// The icon in the content will indicate the type
	// This avoids issues with toast.error/toast.success overriding our styles
	const toastId = toast(toastContent, toastOptions);

	return toastId;
}
