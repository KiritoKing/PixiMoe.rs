import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTagCategoryColor } from "@/lib/utils";
import type { Tag, TagCategory } from "@/types";

interface TagEditDialogProps {
	tag: Tag;
	categories: TagCategory[];
	onSave: (name: string, categoryId: number) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function TagEditDialog({
	tag,
	categories,
	onSave,
	onCancel,
	isLoading = false,
}: TagEditDialogProps) {
	const [name, setName] = useState(tag.name);
	const [categoryId, setCategoryId] = useState<number>(tag.category_id);

	useEffect(() => {
		setName(tag.name);
		setCategoryId(tag.category_id);
	}, [tag]);

	const handleSave = () => {
		if (!name.trim()) {
			return;
		}
		onSave(name.trim(), categoryId);
	};

	const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);

	return (
		<Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>编辑标签</DialogTitle>
					<DialogDescription>修改标签名称和分类</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Tag Name */}
					<div className="space-y-2">
						<Label htmlFor="tag-name">标签名称</Label>
						<Input
							id="tag-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="输入标签名称"
							autoFocus
						/>
					</div>

					{/* Category Selection */}
					<div className="space-y-2">
						<Label>分类</Label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between"
									type="button"
								>
									<div className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{
												backgroundColor:
													sortedCategories.find(
														(cat) => cat.category_id === categoryId
													)?.color_code || "#6B7280",
											}}
										/>
										<span>
											{sortedCategories.find(
												(cat) => cat.category_id === categoryId
											)?.name || "选择分类"}
										</span>
									</div>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
								{sortedCategories.map((category) => (
									<DropdownMenuItem
										key={category.category_id}
										onClick={() => setCategoryId(category.category_id)}
										className="flex items-center gap-2"
									>
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: category.color_code }}
										/>
										<span className="flex-1">{category.name}</span>
										{category.category_id === categoryId && (
											<Check className="h-4 w-4" />
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Current Category Display */}
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>当前分类：</span>
						<div className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-full"
								style={{
									backgroundColor: getTagCategoryColor(tag, categories),
								}}
							/>
							<span>
								{categories.find((cat) => cat.category_id === tag.category_id)
									?.name || "未知"}
							</span>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onCancel} disabled={isLoading}>
						取消
					</Button>
					<Button onClick={handleSave} disabled={isLoading || !name.trim()}>
						{isLoading ? "保存中..." : "保存"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
