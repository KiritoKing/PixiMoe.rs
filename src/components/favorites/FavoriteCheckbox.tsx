import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavoriteStatuses } from "@/lib/hooks/useFavorites";

interface FavoriteCheckboxProps {
	fileHashes: string[];
	onChange: (favoritesOnly: boolean) => void;
	checked: boolean;
}

export function FavoriteCheckbox({ fileHashes, onChange, checked }: FavoriteCheckboxProps) {
	const { data: favoriteStatuses, isLoading } = useFavoriteStatuses(fileHashes);

	if (isLoading) {
		return (
			<div className="flex items-center gap-2">
				<Skeleton className="h-4 w-4" />
				<Skeleton className="h-4 w-20" />
			</div>
		);
	}

	const favoriteCount =
		favoriteStatuses?.size ?? fileHashes.filter((hash) => favoriteStatuses?.get(hash)).length;

	return (
		<div className="flex items-center gap-2">
			<Checkbox
				id="favorites-only"
				checked={checked}
				onCheckedChange={(isChecked) => onChange(isChecked === true)}
			/>
			<Label htmlFor="favorites-only" className="text-sm cursor-pointer">
				仅显示收藏 ({favoriteCount})
			</Label>
		</div>
	);
}
