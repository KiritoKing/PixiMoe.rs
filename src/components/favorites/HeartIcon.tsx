import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeartIconProps {
	isFilled: boolean;
	className?: string;
	size?: number;
}

export function HeartIcon({ isFilled, className, size = 16 }: HeartIconProps) {
	return (
		<Heart
			className={cn(
				"transition-all duration-200",
				isFilled
					? "fill-red-500 text-red-500"
					: "fill-none text-muted-foreground hover:text-red-500",
				className
			)}
			size={size}
		/>
	);
}
