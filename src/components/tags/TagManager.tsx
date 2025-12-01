"use client";

import { Folder, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { TagDeleteDialog } from "@/components/tags/TagDeleteDialog";
import { TagEditDialog } from "@/components/tags/TagEditDialog";
import { TagList } from "@/components/tags/TagList";
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
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/hooks/useCategories";
import { useDeleteTag, useUpdateTag } from "@/lib/hooks/useTagManagement";
import { useTags } from "@/lib/hooks/useTags";
import type { Tag } from "@/types";

export function TagManager() {
	const [searchQuery, setSearchQuery] = useState("");
	const [editingTag, setEditingTag] = useState<Tag | null>(null);
	const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
	const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
	const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
	const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
	const [targetCategoryId, setTargetCategoryId] = useState<number | null>(null);

	const { data: tags = [], isLoading: tagsLoading } = useTags();
	const { data: categories = [], isLoading: categoriesLoading } = useCategories();
	const updateMutation = useUpdateTag();
	const deleteMutation = useDeleteTag();

	const isLoading = tagsLoading || categoriesLoading;

	// Filter tags by search query and category
	// Supports searching by both name and alias
	const filteredTags = useMemo(() => {
		let filtered = tags;

		// Filter by category
		if (selectedCategoryId !== null) {
			filtered = filtered.filter((tag) => tag.category_id === selectedCategoryId);
		}

		// Filter by search query (supports both name and alias)
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(tag) =>
					tag.name.toLowerCase().includes(query) ||
					(tag.alias && tag.alias.toLowerCase().includes(query))
			);
		}

		return filtered;
	}, [tags, searchQuery, selectedCategoryId]);

	const handleEdit = (tag: Tag) => {
		setEditingTag(tag);
	};

	const handleDelete = (tag: Tag) => {
		setDeletingTag(tag);
	};

	const handleUpdate = async (tagId: number, name: string, categoryId: number) => {
		try {
			await updateMutation.mutateAsync({ tagId, name, categoryId });
			toast.success("标签更新成功");
			setEditingTag(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "更新标签失败");
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingTag) return;

		try {
			await deleteMutation.mutateAsync(deletingTag.tag_id);
			toast.success("标签删除成功");
			setDeletingTag(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "删除标签失败");
		}
	};

	// Selection handlers
	const handleSelectTag = (tagId: number, selected: boolean) => {
		if (selected) {
			setSelectedTagIds([...selectedTagIds, tagId]);
		} else {
			setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
		}
	};

	const handleSelectAll = (selected: boolean) => {
		if (selected) {
			setSelectedTagIds(filteredTags.map((tag) => tag.tag_id));
		} else {
			setSelectedTagIds([]);
		}
	};

	// Bulk operations
	const handleBulkMove = async () => {
		if (!targetCategoryId || selectedTagIds.length === 0) return;

		try {
			let successCount = 0;
			let failCount = 0;

			for (const tagId of selectedTagIds) {
				const tag = tags.find((t) => t.tag_id === tagId);
				if (tag) {
					try {
						await updateMutation.mutateAsync({
							tagId,
							name: tag.name,
							categoryId: targetCategoryId,
						});
						successCount++;
					} catch {
						failCount++;
					}
				}
			}

			if (failCount === 0) {
				toast.success(`成功移动 ${successCount} 个标签`);
			} else {
				toast.error(`成功移动 ${successCount} 个，失败 ${failCount} 个`);
			}

			setSelectedTagIds([]);
			setShowBulkMoveDialog(false);
			setTargetCategoryId(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "批量移动失败");
		}
	};

	const handleBulkDelete = async () => {
		if (selectedTagIds.length === 0) return;

		try {
			let successCount = 0;
			let failCount = 0;

			for (const tagId of selectedTagIds) {
				try {
					await deleteMutation.mutateAsync(tagId);
					successCount++;
				} catch {
					failCount++;
				}
			}

			if (failCount === 0) {
				toast.success(`成功删除 ${successCount} 个标签`);
			} else {
				toast.error(`成功删除 ${successCount} 个，失败 ${failCount} 个`);
			}

			setSelectedTagIds([]);
			setShowBulkDeleteDialog(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "批量删除失败");
		}
	};

	const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.tag_id));
	const totalFileCount = selectedTags.reduce((sum, tag) => sum + (tag.file_count ?? 0), 0);
	const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b shrink-0">
				<div>
					<h2 className="text-lg font-semibold">标签管理</h2>
					<p className="text-sm text-muted-foreground">
						编辑、移动和删除标签，管理标签分类
					</p>
				</div>
			</div>

			{/* Bulk Actions Bar */}
			{selectedTagIds.length > 0 && (
				<div className="p-4 border-b bg-muted/30 shrink-0">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							已选择 {selectedTagIds.length} 个标签
							{totalFileCount > 0 && ` (共 ${totalFileCount} 个文件)`}
						</span>
						<div className="flex items-center gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="gap-2">
										<Folder className="h-4 w-4" />
										移动到分类
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{sortedCategories.map((category) => (
										<DropdownMenuItem
											key={category.category_id}
											onClick={() => {
												setTargetCategoryId(category.category_id);
												setShowBulkMoveDialog(true);
											}}
											className="flex items-center gap-2"
										>
											<div
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: category.color_code }}
											/>
											{category.name}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								variant="outline"
								size="sm"
								className="gap-2 text-destructive hover:text-destructive"
								onClick={() => setShowBulkDeleteDialog(true)}
							>
								<Trash2 className="h-4 w-4" />
								删除
							</Button>
							<Button variant="ghost" size="sm" onClick={() => setSelectedTagIds([])}>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Search and Filter */}
			<div className="p-4 border-b shrink-0 space-y-3">
				<div className="flex items-center">
					<Search className="h-4 w-4 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="搜索标签..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1"
					/>
				</div>

				{/* Category Filter */}
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setSelectedCategoryId(null)}
						className={`px-3 py-1 text-sm rounded-md transition-colors ${
							selectedCategoryId === null
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						}`}
					>
						全部
					</button>
					{categories.map((category) => (
						<button
							key={category.category_id}
							type="button"
							onClick={() => setSelectedCategoryId(category.category_id)}
							className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${
								selectedCategoryId === category.category_id
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:bg-muted/80"
							}`}
						>
							<div
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: category.color_code }}
							/>
							{category.name}
						</button>
					))}
				</div>
			</div>

			{/* Tag List */}
			<ScrollArea className="flex-1">
				<div className="p-4">
					{isLoading ? (
						<div className="space-y-2">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={`skeleton-tag-${i}`} className="h-16 w-full" />
							))}
						</div>
					) : (
						<TagList
							tags={filteredTags}
							categories={categories}
							selectedTagIds={selectedTagIds}
							onSelect={handleSelectTag}
							onSelectAll={handleSelectAll}
							onEdit={handleEdit}
							onDelete={handleDelete}
						/>
					)}
				</div>
			</ScrollArea>

			{/* Edit Dialog */}
			{editingTag && (
				<TagEditDialog
					tag={editingTag}
					categories={categories}
					onSave={(name, categoryId) => handleUpdate(editingTag.tag_id, name, categoryId)}
					onCancel={() => setEditingTag(null)}
					isLoading={updateMutation.isPending}
				/>
			)}

			{/* Delete Dialog */}
			{deletingTag && (
				<TagDeleteDialog
					tag={deletingTag}
					onConfirm={handleDeleteConfirm}
					onCancel={() => setDeletingTag(null)}
					isLoading={deleteMutation.isPending}
				/>
			)}

			{/* Bulk Move Dialog */}
			<AlertDialog open={showBulkMoveDialog} onOpenChange={setShowBulkMoveDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>批量移动标签</AlertDialogTitle>
						<AlertDialogDescription>
							确定要将 {selectedTagIds.length} 个标签移动到{" "}
							{sortedCategories.find((cat) => cat.category_id === targetCategoryId)
								?.name || "所选分类"}
							吗？
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBulkMove}
							disabled={updateMutation.isPending || !targetCategoryId}
						>
							{updateMutation.isPending ? "移动中..." : "确认移动"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk Delete Dialog */}
			<AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>批量删除标签</AlertDialogTitle>
						<AlertDialogDescription>
							<div className="space-y-2 mt-2">
								<p>确定要删除 {selectedTagIds.length} 个标签吗？</p>
								{totalFileCount > 0 && (
									<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
										<p className="text-sm font-medium text-destructive">
											警告：这些标签正在被 {totalFileCount} 个文件使用
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											删除这些标签将从所有关联的文件中移除，此操作无法撤销。
										</p>
									</div>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBulkDelete}
							disabled={deleteMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "删除中..." : "确认删除"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
