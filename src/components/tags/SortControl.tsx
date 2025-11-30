import { ArrowDown, ArrowUp, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortMode = "alphabetical" | "count-asc" | "count-desc";

interface SortControlProps {
	sortMode: SortMode;
	onSortChange: (mode: SortMode) => void;
}

const sortModeLabels: Record<SortMode, string> = {
	alphabetical: "按字母顺序",
	"count-asc": "按数量升序",
	"count-desc": "按数量降序",
};

export function SortControl({ sortMode, onSortChange }: SortControlProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					{sortMode === "alphabetical" ? (
						<SortAsc className="h-4 w-4" />
					) : sortMode === "count-asc" ? (
						<ArrowUp className="h-4 w-4" />
					) : (
						<ArrowDown className="h-4 w-4" />
					)}
					{sortModeLabels[sortMode]}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onSortChange("alphabetical")}>
					<SortAsc className="h-4 w-4 mr-2" />
					{sortModeLabels.alphabetical}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onSortChange("count-asc")}>
					<ArrowUp className="h-4 w-4 mr-2" />
					{sortModeLabels["count-asc"]}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onSortChange("count-desc")}>
					<ArrowDown className="h-4 w-4 mr-2" />
					{sortModeLabels["count-desc"]}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
