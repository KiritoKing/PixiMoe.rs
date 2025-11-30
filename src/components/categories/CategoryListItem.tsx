"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { Edit2, GripVertical, Lock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TagCategory } from "@/types";

interface CategoryListItemProps {
	category: TagCategory;
	onEdit: (category: TagCategory) => void;
	onDelete: (category: TagCategory) => void;
	isDragging?: boolean;
	dragProps?: {
		attributes: React.HTMLAttributes<HTMLElement>;
		listeners: DraggableSyntheticListeners | undefined;
	};
}

export function CategoryListItem({
	category,
	onEdit,
	onDelete,
	isDragging = false,
	dragProps,
}: CategoryListItemProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors",
				isDragging && "opacity-50"
			)}
		>
			{/* Drag Handle */}
			<button
				type="button"
				className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
				aria-label="拖拽排序"
				{...(dragProps?.attributes || {})}
				{...(dragProps?.listeners || {})}
			>
				<GripVertical className="h-5 w-5" />
			</button>

			{/* Color Indicator */}
			<div
				className="w-4 h-4 rounded border border-border shrink-0"
				style={{ backgroundColor: category.color_code }}
			/>

			{/* Category Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium truncate">{category.name}</span>
					{category.is_builtin && (
						<Badge variant="secondary" className="text-xs shrink-0">
							<Lock className="h-3 w-3 mr-1" />
							内置
						</Badge>
					)}
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1 shrink-0">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={() => onEdit(category)}
				>
					<Edit2 className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-destructive hover:text-destructive"
					onClick={() => onDelete(category)}
					disabled={category.is_builtin}
					title={category.is_builtin ? "内置分类无法删除" : "删除分类"}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
