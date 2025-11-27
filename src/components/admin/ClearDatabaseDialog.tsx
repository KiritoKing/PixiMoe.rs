import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Database, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useClearDatabase, useClearDatabaseProgress, useDatabaseStats } from "@/lib/hooks/useAdmin";

interface ClearDatabaseDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function ClearDatabaseDialog({ isOpen, onClose }: ClearDatabaseDialogProps) {
	const [confirmation, setConfirmation] = useState("");
	const [stage, setStage] = useState<"confirm" | "progress" | "complete">("confirm");

	const clearMutation = useClearDatabase();
	const { data: stats } = useDatabaseStats();
	const progress = useClearDatabaseProgress();
	const queryClient = useQueryClient();

	const requiredConfirmation = "CLEAR_ALL_DATA_PERMANENTLY_清空所有数据_永久删除";

	const handleConfirm = async () => {
		if (confirmation !== requiredConfirmation) return;

		setStage("progress");
		try {
			await clearMutation.mutateAsync(confirmation);

			// 清空所有缓存，触发页面刷新
			queryClient.invalidateQueries();

			setStage("complete");
		} catch (error) {
			console.error("Failed to clear database:", error);
			setStage("confirm");
		}
	};

	const handleClose = () => {
		// 如果清空操作已完成，触发数据刷新
		if (stage === "complete") {
			queryClient.invalidateQueries();
		}

		setConfirmation("");
		setStage("confirm");
		onClose();
	};

	const getProgressPercentage = () => {
		if (!progress || !progress.total || !progress.current) return 0;
		return (progress.current / progress.total) * 100;
	};

	const totalRecords = stats ? Object.values(stats).reduce((sum, count) => sum + count, 0) : 0;

	return (
		<AlertDialog open={isOpen} onOpenChange={handleClose}>
			<AlertDialogContent className="max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-destructive">
						<Database className="w-5 h-5" />
						清空整个数据库
					</AlertDialogTitle>
					<AlertDialogDescription>
						{stage === "confirm" && (
							<div className="space-y-4 mt-4">
								<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
										<div className="space-y-2">
											<p className="font-semibold text-destructive">
												⚠️ 极其危险的操作
											</p>
											<p className="text-sm text-muted-foreground">
												此操作将
												<strong className="text-destructive">
													永久删除
												</strong>
												数据库中的所有数据：
											</p>
											<ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
												<li>所有图片记录和元数据</li>
												<li>所有标签和分类</li>
												<li>所有人脸识别数据</li>
												<li>所有文件夹结构</li>
											</ul>
											<p className="text-xs text-destructive font-medium mt-2">
												此操作无法撤销！原始文件不会被删除，但所有索引和标签将丢失。
											</p>
										</div>
									</div>
								</div>

								{stats && totalRecords > 0 && (
									<div className="bg-muted/50 rounded-lg p-4">
										<p className="font-medium mb-2">当前数据库统计：</p>
										<div className="grid grid-cols-2 gap-2 text-sm">
											<div className="flex justify-between">
												<span>图片文件：</span>
												<Badge variant="secondary">
													{stats.files || 0}
												</Badge>
											</div>
											<div className="flex justify-between">
												<span>标签：</span>
												<Badge variant="secondary">{stats.tags || 0}</Badge>
											</div>
											<div className="flex justify-between">
												<span>文件夹：</span>
												<Badge variant="secondary">
													{stats.folders || 0}
												</Badge>
											</div>
											<div className="flex justify-between">
												<span>人物：</span>
												<Badge variant="secondary">
													{stats.persons || 0}
												</Badge>
											</div>
										</div>
										<p className="text-xs text-muted-foreground mt-2">
											总计 {totalRecords} 条记录将被删除
										</p>
									</div>
								)}

								<div className="space-y-2">
									<label
										htmlFor="confirmation-input"
										className="text-sm font-medium"
									>
										为了确认，请输入：
										<code className="bg-muted px-2 py-1 rounded text-xs font-mono">
											{requiredConfirmation}
										</code>
									</label>
									<Input
										id="confirmation-input"
										value={confirmation}
										onChange={(e) => setConfirmation(e.target.value)}
										placeholder={requiredConfirmation}
										className="font-mono text-sm"
									/>
								</div>
							</div>
						)}

						{stage === "progress" && (
							<div className="space-y-4 mt-4">
								<div className="text-center">
									<Database className="w-12 h-12 mx-auto text-primary mb-4 animate-pulse" />
									<p className="font-medium">正在清空数据库...</p>
									{progress && (
										<>
											<p className="text-sm text-muted-foreground mt-2">
												{progress.message}
											</p>
											<div className="mt-4">
												<Progress
													value={getProgressPercentage()}
													className="w-full"
												/>
												<p className="text-xs text-muted-foreground mt-2">
													{progress.current} / {progress.total} 步骤完成
												</p>
											</div>
										</>
									)}
								</div>
							</div>
						)}

						{stage === "complete" && (
							<div className="space-y-4 mt-4">
								<div className="text-center">
									<div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
										<Trash2 className="w-6 h-6 text-green-600 dark:text-green-400" />
									</div>
									<p className="font-medium text-green-600 dark:text-green-400">
										数据库已成功清空！
									</p>
									{clearMutation.data && (
										<div className="mt-4 text-left bg-muted/50 rounded-lg p-4">
											<p className="font-medium mb-2">操作摘要：</p>
											<ul className="text-sm space-y-1">
												<li>
													删除记录总数：
													{clearMutation.data.records_deleted}
												</li>
												<li>
													清空的表：
													{clearMutation.data.tables_cleared.length}
												</li>
												<li>
													自增序列重置：
													{clearMutation.data.sequences_reset
														? "是"
														: "否"}
												</li>
											</ul>
										</div>
									)}
								</div>
							</div>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel asChild disabled={stage === "progress"}>
						<Button variant="outline" onClick={handleClose}>
							{stage === "complete" ? "完成" : "取消"}
						</Button>
					</AlertDialogCancel>

					{stage === "confirm" && (
						<AlertDialogAction asChild>
							<Button
								variant="destructive"
								onClick={handleConfirm}
								disabled={
									confirmation !== requiredConfirmation || clearMutation.isPending
								}
								className="flex items-center gap-2"
							>
								<Trash2 className="w-4 h-4" />
								{clearMutation.isPending ? "处理中..." : "确认清空数据库"}
							</Button>
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
