import { Heart, Tag, Wand2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useCategories } from "@/lib/hooks/useCategories";
import { useAddFavorites, useRemoveFavorites } from "@/lib/hooks/useFavorites";
import {
	useBatchAddTags,
	useBatchAITagging,
	useBatchRemoveTag,
} from "@/lib/hooks/useTagManagement";
import { useTags } from "@/lib/hooks/useTags";
import { getTagCategoryColor } from "@/lib/utils";
import { TagInput } from "./TagInput";

interface BatchTagEditorProps {
	selectedHashes: string[];
	commonTags: Array<{ tag_id: number; name: string }>;
	onClearSelection: () => void;
}

export function BatchTagEditor({
	selectedHashes,
	commonTags,
	onClearSelection,
}: BatchTagEditorProps) {
	const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState<number | null>(null);
	const [showAIConfirm, setShowAIConfirm] = useState(false);

	const { data: allTags = [] } = useTags();
	const { data: categories } = useCategories();
	const batchAddMutation = useBatchAddTags();
	const batchRemoveMutation = useBatchRemoveTag();
	const batchAIMutation = useBatchAITagging();
	const addFavoritesMutation = useAddFavorites();
	const removeFavoritesMutation = useRemoveFavorites();

	const handleAddTags = async () => {
		if (tagsToAdd.length === 0) return;

		try {
			await batchAddMutation.mutateAsync({
				fileHashes: selectedHashes,
				tagNames: tagsToAdd,
			});
			toast.success(`Added ${tagsToAdd.length} tag(s) to ${selectedHashes.length} file(s)`);
			setTagsToAdd([]);
		} catch (error) {
			toast.error(`Failed to add tags: ${error}`);
		}
	};

	const handleRemoveTag = async (tagId: number) => {
		try {
			await batchRemoveMutation.mutateAsync({
				fileHashes: selectedHashes,
				tagId,
			});
			toast.success(`Removed tag from ${selectedHashes.length} file(s)`);
			setShowRemoveConfirm(null);
		} catch (error) {
			toast.error(`Failed to remove tag: ${error}`);
		}
	};

	const handleRunAI = async () => {
		try {
			await batchAIMutation.mutateAsync(selectedHashes);
			// Don't show toast here - it will be shown by the event listener
			// when batch_complete event is received (handled in ImportButton or App)
			setShowAIConfirm(false);
			// Clear selection to close the batch editor panel after task is submitted
			onClearSelection();
		} catch (error) {
			// Only show error toast for immediate errors (not progress events)
			toast.error(`AI tagging failed: ${error}`);
		}
	};

	const handleAddFavorites = async () => {
		try {
			const count = await addFavoritesMutation.mutateAsync(selectedHashes);
			toast.success(`Added ${count} file(s) to favorites`);
		} catch (error) {
			toast.error(`Failed to add favorites: ${error}`);
		}
	};

	const handleRemoveFavorites = async () => {
		try {
			const count = await removeFavoritesMutation.mutateAsync(selectedHashes);
			toast.success(`Removed ${count} file(s) from favorites`);
		} catch (error) {
			toast.error(`Failed to remove favorites: ${error}`);
		}
	};

	if (selectedHashes.length === 0) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg p-4 z-40">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Tag className="w-5 h-5 text-blue-600" />
							<span className="font-semibold">
								{selectedHashes.length} file(s) selected
							</span>
						</div>
						<button
							type="button"
							onClick={onClearSelection}
							className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
						>
							Clear Selection
						</button>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleAddFavorites}
							disabled={addFavoritesMutation.isPending}
							className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded disabled:opacity-50"
						>
							<Heart className="w-4 h-4" />
							{addFavoritesMutation.isPending ? "Adding..." : "Add to Favorites"}
						</button>
						<button
							type="button"
							onClick={handleRemoveFavorites}
							disabled={removeFavoritesMutation.isPending}
							className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
						>
							<Heart className="w-4 h-4" />
							{removeFavoritesMutation.isPending
								? "Removing..."
								: "Remove from Favorites"}
						</button>
						<button
							type="button"
							onClick={() => setShowAIConfirm(true)}
							disabled={batchAIMutation.isPending}
							className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
						>
							<Wand2 className="w-4 h-4" />
							{batchAIMutation.isPending ? "Running AI..." : "Run AI Tagging"}
						</button>
					</div>
				</div>

				{/* Common tags - optimized for performance */}
				{commonTags.length > 0 && (
					<div className="mb-4">
						<h4 className="text-sm font-semibold mb-2">
							Common Tags ({commonTags.length} total)
						</h4>
						<div className="flex flex-wrap gap-2 mb-2">
							{/* Show first 30 common tags */}
							{commonTags.slice(0, 30).map((tag) => {
								const fullTag = allTags.find((t) => t.tag_id === tag.tag_id);
								return (
									<span
										key={tag.tag_id}
										className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm"
										style={
											fullTag
												? {
														borderLeftColor: getTagCategoryColor(
															fullTag,
															categories
														),
														borderLeftWidth: "3px",
													}
												: undefined
										}
									>
										{tag.name}
										<button
											type="button"
											onClick={() => setShowRemoveConfirm(tag.tag_id)}
											className="hover:text-red-600 dark:hover:text-red-400"
										>
											<X className="w-3 h-3" />
										</button>
									</span>
								);
							})}
						</div>
						{commonTags.length > 30 && (
							<div className="text-xs text-muted-foreground">
								Showing first 30 of {commonTags.length} common tags
							</div>
						)}
					</div>
				)}

				{/* Add new tags */}
				<div className="flex gap-2">
					<div className="flex-1">
						<TagInput
							value={tagsToAdd}
							onChange={setTagsToAdd}
							placeholder="Add tags to selected files..."
						/>
					</div>
					{tagsToAdd.length > 0 && (
						<button
							type="button"
							onClick={handleAddTags}
							disabled={batchAddMutation.isPending}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
						>
							{batchAddMutation.isPending
								? "Adding..."
								: `Add ${tagsToAdd.length} tag(s)`}
						</button>
					)}
				</div>
			</div>

			{/* Remove confirmation dialog */}
			{showRemoveConfirm !== null && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md">
						<h3 className="text-lg font-semibold mb-2">Remove Tag?</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							This will remove the tag from {selectedHashes.length} selected file(s).
							This action cannot be undone.
						</p>
						<div className="flex gap-2 justify-end">
							<button
								type="button"
								onClick={() => setShowRemoveConfirm(null)}
								className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => handleRemoveTag(showRemoveConfirm)}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}

			{/* AI tagging confirmation dialog */}
			{showAIConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md">
						<h3 className="text-lg font-semibold mb-2">Run AI Tagging?</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							This will run AI tagging on {selectedHashes.length} selected file(s).
							This may take some time depending on the number of files.
						</p>
						<div className="flex gap-2 justify-end">
							<button
								type="button"
								onClick={() => setShowAIConfirm(false)}
								className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleRunAI}
								className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
							>
								Run AI Tagging
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
