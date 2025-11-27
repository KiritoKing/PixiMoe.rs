import {
	AlertCircle,
	AlertTriangle,
	Bell,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Database,
	Info,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ClearDatabaseDialog } from "@/components/admin/ClearDatabaseDialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDatabaseStats } from "@/lib/hooks/useAdmin";
import { useNotifications } from "@/lib/stores/useNotifications";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

const typeIcons = {
	success: CheckCircle2,
	error: AlertCircle,
	info: Info,
	warning: AlertTriangle,
};

const typeColors = {
	success: "text-green-600 dark:text-green-400",
	error: "text-red-600 dark:text-red-400",
	info: "text-blue-600 dark:text-blue-400",
	warning: "text-yellow-600 dark:text-yellow-400",
};

function NotificationItem({ notification }: { notification: Notification }) {
	const { markAsRead, removeNotification } = useNotifications();
	const [expanded, setExpanded] = useState(false);
	const Icon = typeIcons[notification.type];

	const handleClick = () => {
		if (!notification.read) {
			markAsRead(notification.id);
		}
		if (notification.details) {
			setExpanded(!expanded);
		}
	};

	const formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "刚刚";
		if (diffMins < 60) return `${diffMins} 分钟前`;
		if (diffHours < 24) return `${diffHours} 小时前`;
		if (diffDays < 7) return `${diffDays} 天前`;
		return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
	};

	return (
		<div
			className={cn(
				"relative border-b p-4 transition-colors",
				!notification.read && "bg-muted/50",
				notification.pinned && "border-l-4 border-l-primary"
			)}
		>
			<div className="flex items-start gap-3">
				<Icon
					className={cn("mt-0.5 h-5 w-5 flex-shrink-0", typeColors[notification.type])}
				/>
				<button
					type="button"
					className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0"
					onClick={handleClick}
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<p className="text-sm font-semibold">{notification.title}</p>
								{notification.pinned && (
									<Badge variant="outline" className="text-xs">
										置顶
									</Badge>
								)}
							</div>
							<p className="text-sm text-muted-foreground">{notification.message}</p>
							{notification.details && (
								<button
									type="button"
									className="mt-1 text-xs text-primary hover:underline flex items-center gap-1"
									onClick={(e) => {
										e.stopPropagation();
										setExpanded(!expanded);
									}}
								>
									{expanded ? (
										<>
											<ChevronUp className="h-3 w-3" />
											收起详情
										</>
									) : (
										<>
											<ChevronDown className="h-3 w-3" />
											查看详情
										</>
									)}
								</button>
							)}
							{expanded && notification.details && (
								<div className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
									{notification.details}
								</div>
							)}
						</div>
						<div className="flex flex-col items-end gap-1">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									removeNotification(notification.id);
								}}
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
							<span className="text-xs text-muted-foreground">
								{formatTime(notification.timestamp)}
							</span>
						</div>
					</div>
				</button>
			</div>
		</div>
	);
}

export function NotificationCenter() {
	const { notifications, isOpen, filter, setOpen, setFilter, clearAll, loadFromStore } =
		useNotifications();

	const [showClearDialog, setShowClearDialog] = useState(false);
	const [isClearDbDialogOpen, setIsClearDbDialogOpen] = useState(false);
	const { data: stats } = useDatabaseStats();

	useEffect(() => {
		loadFromStore();
	}, [loadFromStore]);

	const filteredNotifications = notifications.filter(
		(n) => filter === "all" || n.type === filter
	);

	const unreadCount = notifications.filter((n) => !n.read).length;

	const filterButtons: Array<{
		label: string;
		value: NotificationType | "all";
	}> = [
		{ label: "全部", value: "all" },
		{ label: "成功", value: "success" },
		{ label: "错误", value: "error" },
		{ label: "信息", value: "info" },
		{ label: "警告", value: "warning" },
	];

	return (
		<>
			<Sheet open={isOpen} onOpenChange={setOpen}>
				<SheetTrigger asChild>
					<Button variant="ghost" size="icon" className="relative">
						<Bell className="h-5 w-5" />
						{unreadCount > 0 && (
							<Badge
								variant="destructive"
								className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
							>
								{unreadCount > 99 ? "99+" : unreadCount}
							</Badge>
						)}
					</Button>
				</SheetTrigger>
				<SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
					<div className="flex flex-col h-full">
						<SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4 pr-12">
							<div className="flex items-center justify-between">
								<SheetTitle>通知中心</SheetTitle>
							</div>
							{/* Clear Database Button - Most prominent position */}
							{stats && Object.values(stats).some((count) => count > 0) && (
								<div className="mt-4">
									<Button
										variant="destructive"
										size="sm"
										onClick={() => setIsClearDbDialogOpen(true)}
										className="w-full flex items-center gap-2"
									>
										<Database className="w-4 h-4" />
										清空数据库
									</Button>
								</div>
							)}
							{notifications.length > 0 && (
								<div className="flex justify-end mt-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowClearDialog(true)}
										className="text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4 mr-1" />
										清除全部
									</Button>
								</div>
							)}
						</SheetHeader>

						{/* Filter buttons - scrollable */}
						<div className="flex-shrink-0 px-6 pb-4 border-b overflow-x-auto">
							<div className="flex gap-2 min-w-max">
								{filterButtons.map(({ label, value }) => (
									<Button
										key={value}
										variant={filter === value ? "default" : "outline"}
										size="sm"
										onClick={() => setFilter(value)}
										className="text-xs whitespace-nowrap"
									>
										{label}
									</Button>
								))}
							</div>
						</div>

						{/* Notifications list */}
						<ScrollArea className="flex-1 px-6 mt-4">
							{filteredNotifications.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-64 text-center">
									<Bell className="h-12 w-12 text-muted-foreground mb-4" />
									<p className="text-sm text-muted-foreground">
										{notifications.length === 0
											? "暂无通知"
											: "没有符合条件的通知"}
									</p>
								</div>
							) : (
								<div>
									{filteredNotifications.map((notification) => (
										<NotificationItem
											key={notification.id}
											notification={notification}
										/>
									))}
								</div>
							)}
						</ScrollArea>
					</div>
				</SheetContent>
			</Sheet>

			{/* Clear all confirmation dialog */}
			<AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>清除所有通知？</AlertDialogTitle>
						<AlertDialogDescription>
							此操作将删除所有通知，包括置顶通知。此操作无法撤销。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								clearAll();
								setShowClearDialog(false);
							}}
						>
							清除全部
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Clear Database Dialog */}
			<ClearDatabaseDialog
				isOpen={isClearDbDialogOpen}
				onClose={() => setIsClearDbDialogOpen(false)}
			/>
		</>
	);
}
