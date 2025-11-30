import { Database, Trash2 } from "lucide-react";
import { useState } from "react";
import { ClearDatabaseDialog } from "@/components/admin/ClearDatabaseDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDatabaseStats } from "@/lib/hooks/useAdmin";

export function DatabaseSettingsPage() {
	const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
	const { data: stats } = useDatabaseStats();

	const totalRecords = stats ? Object.values(stats).reduce((sum, count) => sum + count, 0) : 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Database className="h-6 w-6" />
					<h2 className="text-2xl font-bold">数据库管理</h2>
				</div>
				<p className="text-muted-foreground">查看数据库统计信息和管理数据库数据</p>
			</div>

			{/* Database Statistics */}
			<Card>
				<CardHeader>
					<CardTitle>数据库统计</CardTitle>
					<CardDescription>当前数据库中的数据记录数量</CardDescription>
				</CardHeader>
				<CardContent>
					{stats ? (
						<div className="grid grid-cols-2 gap-4">
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground">图片文件：</span>
								<Badge variant="secondary">{stats.files || 0}</Badge>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground">标签：</span>
								<Badge variant="secondary">{stats.tags || 0}</Badge>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground">文件夹：</span>
								<Badge variant="secondary">{stats.folders || 0}</Badge>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground">人物：</span>
								<Badge variant="secondary">{stats.persons || 0}</Badge>
							</div>
							<div className="col-span-2 pt-2 border-t">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">总计：</span>
									<Badge variant="default">{totalRecords}</Badge>
								</div>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">加载中...</p>
					)}
				</CardContent>
			</Card>

			{/* Clear Database Section */}
			<Card className="border-destructive">
				<CardHeader>
					<CardTitle className="text-destructive">危险操作</CardTitle>
					<CardDescription>清空数据库将永久删除所有数据，此操作无法撤销</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							此操作将删除数据库中的所有记录，包括：
						</p>
						<ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
							<li>所有图片记录和元数据</li>
							<li>所有标签和分类</li>
							<li>所有人脸识别数据</li>
							<li>所有文件夹结构</li>
						</ul>
						<p className="text-xs text-destructive font-medium">
							注意：原始文件不会被删除，但所有索引和标签将丢失。
						</p>
						<Button
							variant="destructive"
							onClick={() => setIsClearDialogOpen(true)}
							disabled={!stats || totalRecords === 0}
							className="w-full sm:w-auto"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							清空数据库
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Clear Database Dialog */}
			<ClearDatabaseDialog
				isOpen={isClearDialogOpen}
				onClose={() => setIsClearDialogOpen(false)}
			/>
		</div>
	);
}
