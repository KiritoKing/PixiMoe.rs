"use client";

import { DragAndDropList } from "@/components/categories/DragAndDropList";
import type { TagCategory } from "@/types";

interface CategoryListProps {
	categories: TagCategory[];
	onReorder: (categoryIds: number[]) => void;
	onEdit: (category: TagCategory) => void;
	onDelete: (category: TagCategory) => void;
	isLoading?: boolean;
}

export function CategoryList({
	categories,
	onReorder,
	onEdit,
	onDelete,
	isLoading = false,
}: CategoryListProps) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />
				))}
			</div>
		);
	}

	if (categories.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>暂无分类</p>
				<p className="text-sm mt-2">点击"创建分类"按钮添加新分类</p>
			</div>
		);
	}

	return (
		<DragAndDropList
			categories={categories}
			onReorder={onReorder}
			onEdit={onEdit}
			onDelete={onDelete}
		/>
	);
}
