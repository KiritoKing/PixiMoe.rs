import { AlertCircle, AlertTriangle, FileX, ImageOff } from "lucide-react";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	useHealthCheckProgress,
	useHealthStatusCounts,
	useThumbnailRegenerationProgress,
} from "@/lib/hooks/useImageHealth";
import type { ImageHealthStatus } from "@/types";

interface HealthStatusFilterProps {
	onFilterChange?: (filter: ImageHealthStatus | null) => void;
	currentFilter?: ImageHealthStatus | null;
}

export function HealthStatusFilter({ onFilterChange, currentFilter }: HealthStatusFilterProps) {
	const { counts, isLoading: countsLoading } = useHealthStatusCounts();
	const { isRunning: healthCheckRunning } = useHealthCheckProgress();
	const { isRunning: regenerationRunning } = useThumbnailRegenerationProgress();

	const handleFilterClick = useCallback(
		(filter: ImageHealthStatus) => {
			const newFilter = currentFilter === filter ? null : filter;
			onFilterChange?.(newFilter);
		},
		[currentFilter, onFilterChange]
	);

	// Don't show filter if no issues exist
	if (!countsLoading && counts.issues === 0) {
		return null;
	}

	const filterOptions = [
		{
			key: "original_missing" as ImageHealthStatus,
			label: "Missing Originals",
			icon: <FileX className="w-4 h-4" />,
			count: counts.originalMissing,
			color: "bg-red-500",
			variant: counts.originalMissing > 0 ? "default" : ("outline" as const),
		},
		{
			key: "thumbnail_missing" as ImageHealthStatus,
			label: "Missing Thumbnails",
			icon: <ImageOff className="w-4 h-4" />,
			count: counts.thumbnailMissing,
			color: "bg-yellow-500",
			variant: counts.thumbnailMissing > 0 ? "default" : ("outline" as const),
		},
		{
			key: "thumbnail_corrupted" as ImageHealthStatus,
			label: "Corrupted Thumbnails",
			icon: <AlertCircle className="w-4 h-4" />,
			count: counts.thumbnailCorrupted,
			color: "bg-orange-500",
			variant: counts.thumbnailCorrupted > 0 ? "default" : ("outline" as const),
		},
		{
			key: "both_missing" as ImageHealthStatus,
			label: "Both Missing",
			icon: <AlertTriangle className="w-4 h-4" />,
			count: counts.bothMissing,
			color: "bg-red-600",
			variant: counts.bothMissing > 0 ? "default" : ("outline" as const),
		},
	].filter((option) => option.count > 0); // Only show filters that have affected files

	const isAnyOperationRunning = healthCheckRunning || regenerationRunning;

	return (
		<div className="space-y-2">
			{/* Filter buttons */}
			<div className="flex flex-col gap-2">
				{filterOptions.map((option) => (
					<Button
						key={option.key}
						variant={currentFilter === option.key ? "default" : "outline"}
						size="sm"
						onClick={() => handleFilterClick(option.key)}
						className="flex items-center justify-between w-full h-auto py-2"
						disabled={isAnyOperationRunning}
					>
						<div className="flex items-center gap-2">
							{option.icon}
							<span className="text-xs">{option.label}</span>
						</div>
						{option.count > 0 && (
							<Badge variant="secondary" className="px-1.5 py-0 text-xs">
								{option.count}
							</Badge>
						)}
					</Button>
				))}
			</div>
		</div>
	);
}
