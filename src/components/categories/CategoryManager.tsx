"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { CategoryList } from "@/components/categories/CategoryList";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type CreateCategoryRequest,
	type UpdateCategoryRequest,
	useCategories,
	useCreateCategory,
	useDeleteCategory,
	useReorderCategories,
	useUpdateCategory,
} from "@/lib/hooks/useCategories";
import type { TagCategory } from "@/types";

export function CategoryManager() {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<TagCategory | null>(null);

	const { data: categories = [], isLoading } = useCategories();
	const createMutation = useCreateCategory();
	const updateMutation = useUpdateCategory();
	const deleteMutation = useDeleteCategory();
	const reorderMutation = useReorderCategories();

	const handleCreate = async (data: CreateCategoryRequest) => {
		try {
			await createMutation.mutateAsync(data);
			toast.success("分类创建成功");
			setIsCreateDialogOpen(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "创建分类失败");
		}
	};

	const handleUpdate = async (categoryId: number, data: UpdateCategoryRequest) => {
		try {
			await updateMutation.mutateAsync({ categoryId, request: data });
			toast.success("分类更新成功");
			setEditingCategory(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "更新分类失败");
		}
	};

	const handleDelete = async () => {
		if (!deletingCategory) return;

		try {
			await deleteMutation.mutateAsync(deletingCategory.category_id);
			toast.success("分类删除成功");
			setDeletingCategory(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "删除分类失败");
		}
	};

	const handleReorder = async (categoryIds: number[]) => {
		try {
			await reorderMutation.mutateAsync(categoryIds);
			toast.success("分类顺序已更新");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "更新顺序失败");
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b shrink-0">
				<div>
					<h2 className="text-lg font-semibold">分类管理</h2>
					<p className="text-sm text-muted-foreground">
						创建和管理标签分类，拖拽可调整顺序
					</p>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					<Plus className="h-4 w-4 mr-2" />
					创建分类
				</Button>
			</div>

			{/* Category List */}
			<ScrollArea className="flex-1">
				<div className="p-4">
					<CategoryList
						categories={categories}
						onReorder={handleReorder}
						onEdit={setEditingCategory}
						onDelete={setDeletingCategory}
						isLoading={isLoading}
					/>
				</div>
			</ScrollArea>

			{/* Create Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>创建新分类</DialogTitle>
						<DialogDescription>
							创建一个新的标签分类，用于组织和管理标签
						</DialogDescription>
					</DialogHeader>
					<CategoryForm
						onSubmit={(data) => {
							// Type assertion to ensure correct type
							if ("name" in data && "color_code" in data) {
								handleCreate(data as CreateCategoryRequest);
							}
						}}
						onCancel={() => setIsCreateDialogOpen(false)}
						isLoading={createMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog
				open={!!editingCategory}
				onOpenChange={(open) => !open && setEditingCategory(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>编辑分类</DialogTitle>
						<DialogDescription>修改分类的名称和颜色</DialogDescription>
					</DialogHeader>
					{editingCategory && (
						<CategoryForm
							category={editingCategory}
							onSubmit={(data) => handleUpdate(editingCategory.category_id, data)}
							onCancel={() => setEditingCategory(null)}
							isLoading={updateMutation.isPending}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<AlertDialog
				open={!!deletingCategory}
				onOpenChange={(open) => !open && setDeletingCategory(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除分类</AlertDialogTitle>
						<AlertDialogDescription>
							{deletingCategory?.is_builtin
								? "内置分类无法删除"
								: `确定要删除分类"${deletingCategory?.name}"吗？此操作无法撤销。如果该分类下有标签，请先重新分配标签。`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						{!deletingCategory?.is_builtin && (
							<AlertDialogAction
								onClick={handleDelete}
								disabled={deleteMutation.isPending}
							>
								{deleteMutation.isPending ? "删除中..." : "删除"}
							</AlertDialogAction>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
