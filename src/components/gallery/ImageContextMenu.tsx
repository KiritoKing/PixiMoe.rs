import { Edit, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import type { FileRecord } from "@/types";

interface ImageContextMenuProps {
	file: FileRecord;
	isOpen: boolean;
	position: { x: number; y: number };
	onClose: () => void;
	onDelete: (fileHash: string) => void;
	onEditTags: (fileHash: string) => void;
}

export function ImageContextMenu({
	file,
	isOpen,
	position,
	onClose,
	onDelete,
	onEditTags,
}: ImageContextMenuProps) {
	// Handle escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	// Calculate adjusted position to prevent menu from going off-screen
	const getAdjustedPosition = () => {
		const menuWidth = 192; // w-48 = 12rem = 192px
		const menuHeight = 200; // Estimated height
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		const adjustedX =
			position.x + menuWidth > windowWidth ? windowWidth - menuWidth - 8 : position.x;
		const adjustedY =
			position.y + menuHeight > windowHeight ? windowHeight - menuHeight - 8 : position.y;

		return { x: adjustedX, y: adjustedY };
	};

	if (!isOpen) return null;

	const adjustedPosition = getAdjustedPosition();

	return (
		<Popover open={isOpen} onOpenChange={onClose}>
			<PopoverContent
				className="w-48 p-0"
				style={{
					position: "fixed",
					left: adjustedPosition.x,
					top: adjustedPosition.y,
					transform: "translate(0, 0)",
					margin: 0,
				}}
				align="start"
				side="bottom"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<div className="py-1">
					<Button
						variant="ghost"
						className="w-full justify-start px-3 py-2 text-sm h-auto"
						onClick={() => {
							onEditTags(file.file_hash);
							onClose();
						}}
					>
						<Edit className="mr-2 h-4 w-4" />
						编辑标签
					</Button>
					<div className="border-t my-1" />
					<Button
						variant="ghost"
						className="w-full justify-start px-3 py-2 text-sm h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => {
							onDelete(file.file_hash);
							onClose();
						}}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						删除图片
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
