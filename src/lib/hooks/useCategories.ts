import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { TagCategory } from "@/types";

export interface CreateCategoryRequest {
	name: string;
	color_code?: string;
	sort_order?: number;
}

export interface UpdateCategoryRequest {
	name?: string;
	color_code?: string;
	sort_order?: number;
}

export function useCategories() {
	return useQuery({
		queryKey: ["categories"],
		queryFn: async () => {
			const categories = await invoke<TagCategory[]>("get_all_categories");
			return categories;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

export function useCategory(categoryId: number | null) {
	return useQuery({
		queryKey: ["category", categoryId],
		queryFn: async () => {
			if (!categoryId) return null;
			const category = await invoke<TagCategory | null>("get_category", {
				categoryId,
			});
			return category;
		},
		enabled: !!categoryId,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

export function useCreateCategory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: CreateCategoryRequest) => {
			const category = await invoke<TagCategory>("create_category", { request });
			return category;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}

export function useUpdateCategory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			categoryId,
			request,
		}: {
			categoryId: number;
			request: UpdateCategoryRequest;
		}) => {
			const category = await invoke<TagCategory>("update_category", {
				categoryId,
				request,
			});
			return category;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["category", variables.categoryId] });
			queryClient.invalidateQueries({ queryKey: ["tags"] }); // Tags may have changed categories
		},
	});
}

export function useDeleteCategory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (categoryId: number) => {
			await invoke<void>("delete_category", { categoryId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["tags"] });
		},
	});
}

export function useReorderCategories() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (categoryIds: number[]) => {
			await invoke<void>("reorder_categories", { categoryIds });
		},
		onSuccess: () => {
			// Immediately invalidate and refetch categories to get the updated order
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
		onMutate: async (categoryIds: number[]) => {
			// Cancel any outgoing refetches so they don't overwrite our optimistic update
			await queryClient.cancelQueries({ queryKey: ["categories"] });

			// Snapshot the previous value
			const previousCategories = queryClient.getQueryData(["categories"]);

			// Optimistically update to the new value
			queryClient.setQueryData(["categories"], (old: TagCategory[] | undefined) => {
				if (!old) return old;
				// Reorder the categories based on the new order
				const reorderedCategories = categoryIds
					.map((id) => old.find((cat) => cat.category_id === id))
					.filter(Boolean);
				return reorderedCategories;
			});

			// Return a context object with the snapshotted value
			return { previousCategories };
		},
		onError: (_err, _newTodo, context) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			if (context?.previousCategories) {
				queryClient.setQueryData(["categories"], context.previousCategories);
			}
		},
		onSettled: () => {
			// Always refetch after error or success to make sure the server state is in sync
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}

export function useAssignTagToCategory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ tagId, categoryId }: { tagId: number; categoryId: number }) => {
			await invoke<void>("assign_tag_to_category", { tagId, categoryId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}

export function useBulkAssignTagsToCategory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ tagIds, categoryId }: { tagIds: number[]; categoryId: number }) => {
			await invoke<number>("bulk_assign_tags_to_category", { tagIds, categoryId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}
