import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavoriteCount } from "@/lib/hooks/useFavorites";

interface FavoriteBadgeProps {
	className?: string;
}

export function FavoriteBadge({ className }: FavoriteBadgeProps) {
	const { data: count, isLoading } = useFavoriteCount();

	if (isLoading) {
		return <Skeleton className="h-5 w-12" />;
	}

	return (
		<Badge variant="outline" className={className}>
			<Heart className="mr-1 h-3 w-3 fill-red-500 text-red-500" />
			{count ?? 0}
		</Badge>
	);
}
