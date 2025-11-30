import { Button } from "@/components/ui/button";
import { useFavoriteStatus, useToggleFavorite } from "@/lib/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { HeartIcon } from "./HeartIcon";

interface FavoriteButtonProps {
	fileHash: string;
	variant?: "default" | "ghost" | "outline";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
	showLabel?: boolean;
}

export function FavoriteButton({
	fileHash,
	variant = "ghost",
	size = "icon",
	className,
	showLabel = false,
}: FavoriteButtonProps) {
	const { data: isFavorite = false, isLoading } = useFavoriteStatus(fileHash);
	const toggleFavorite = useToggleFavorite();

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering parent click handlers
		toggleFavorite.mutate(fileHash);
	};

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleClick}
			disabled={isLoading || toggleFavorite.isPending}
			className={cn("transition-all", className)}
			aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
		>
			<HeartIcon isFilled={isFavorite} />
			{showLabel && <span className="ml-2">{isFavorite ? "已收藏" : "收藏"}</span>}
		</Button>
	);
}
