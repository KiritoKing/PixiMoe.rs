"use client";

import { ColorPicker } from "@/components/categories/ColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateCategoryRequest, UpdateCategoryRequest } from "@/lib/hooks/useCategories";
import type { TagCategory } from "@/types";

interface CategoryFormProps {
	category?: TagCategory | null;
	onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function CategoryForm({
	category,
	onSubmit,
	onCancel,
	isLoading = false,
}: CategoryFormProps) {
	const isEditing = !!category;

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const colorCode = formData.get("colorCode") as string;

		if (isEditing) {
			const updateData: UpdateCategoryRequest = {};
			if (name.trim() !== category.name) {
				updateData.name = name.trim();
			}
			if (colorCode !== category.color_code) {
				updateData.color_code = colorCode;
			}
			if (Object.keys(updateData).length > 0) {
				onSubmit(updateData);
			}
		} else {
			onSubmit({
				name: name.trim(),
				color_code: colorCode || undefined,
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="category-name">分类名称</Label>
				<Input
					id="category-name"
					name="name"
					defaultValue={category?.name ?? ""}
					placeholder="输入分类名称"
					required
					disabled={isLoading || (isEditing && category?.is_builtin)}
				/>
				{isEditing && category?.is_builtin && (
					<p className="text-xs text-muted-foreground">内置分类的名称无法修改</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="category-color">颜色</Label>
				<input type="hidden" name="colorCode" value={category?.color_code ?? "#6B7280"} />
				<ColorPicker
					value={category?.color_code ?? "#6B7280"}
					onChange={(color) => {
						const input = document.querySelector(
							'input[name="colorCode"]'
						) as HTMLInputElement;
						if (input) {
							input.value = color;
						}
					}}
					disabled={isLoading}
				/>
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
					取消
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "保存中..." : isEditing ? "保存" : "创建"}
				</Button>
			</div>
		</form>
	);
}
