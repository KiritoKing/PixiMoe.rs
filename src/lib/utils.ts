import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tag, TagCategory } from "@/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Get category color for a tag
 * @param tag - Tag object with category_id
 * @param categories - Array of all categories
 * @returns Color code string or default gray color
 */
export function getTagCategoryColor(tag: Tag, categories: TagCategory[] | undefined): string {
	if (!categories || !tag.category_id) return "#6B7280"; // Default gray
	const category = categories.find((cat) => cat.category_id === tag.category_id);
	return category?.color_code ?? "#6B7280";
}
