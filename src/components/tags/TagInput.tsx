import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/lib/hooks/useCategories";
import { useSearchTags } from "@/lib/hooks/useTagManagement";
import { useTags } from "@/lib/hooks/useTags";
import { getTagCategoryColor } from "@/lib/utils";

interface TagInputProps {
	value: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = "Add tags..." }: TagInputProps) {
	const [input, setInput] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [showSuggestionsAbove, setShowSuggestionsAbove] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { data: suggestions = [] } = useSearchTags(input);
	const { data: allTags = [] } = useTags();
	const { data: categories } = useCategories();

	useEffect(() => {
		setShowSuggestions(input.length > 0 && suggestions.length > 0);
	}, [input, suggestions]);

	// 检测输入框位置，决定suggestions向上还是向下展开
	useEffect(() => {
		if (!showSuggestions || !containerRef.current) return;

		const checkPosition = () => {
			const container = containerRef.current;
			if (!container) return;

			const rect = container.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const spaceBelow = viewportHeight - rect.bottom;
			const spaceAbove = rect.top;
			const suggestionsHeight = 200; // max-h-[200px]

			// 如果下方空间不足，且上方空间足够，则向上展开
			if (spaceBelow < suggestionsHeight && spaceAbove > suggestionsHeight) {
				setShowSuggestionsAbove(true);
			} else {
				setShowSuggestionsAbove(false);
			}
		};

		checkPosition();

		// 监听滚动和窗口大小变化
		const handleScroll = () => checkPosition();
		const handleResize = () => checkPosition();

		window.addEventListener("scroll", handleScroll, true);
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleResize);
		};
	}, [showSuggestions]);

	const handleAddTag = (tagName: string) => {
		const trimmed = tagName.trim();
		if (trimmed && !value.includes(trimmed)) {
			onChange([...value, trimmed]);
		}
		setInput("");
		setShowSuggestions(false);
	};

	const handleRemoveTag = (tagToRemove: string) => {
		onChange(value.filter((tag) => tag !== tagToRemove));
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (input.trim()) {
				handleAddTag(input);
			}
		} else if (e.key === "Backspace" && !input && value.length > 0) {
			// Remove last tag on backspace when input is empty
			onChange(value.slice(0, -1));
		} else if (e.key === "Escape") {
			setShowSuggestions(false);
		}
	};

	return (
		<div ref={containerRef} className="relative w-full">
			<div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
				{value.map((tagName) => {
					const tag = allTags.find((t) => t.name === tagName);
					return (
						<Badge
							key={tagName}
							variant="secondary"
							className="gap-1"
							style={
								tag
									? {
											borderLeftColor: getTagCategoryColor(tag, categories),
											borderLeftWidth: "3px",
										}
									: undefined
							}
						>
							{tagName}
							<button
								type="button"
								onClick={() => handleRemoveTag(tagName)}
								className="hover:text-blue-600"
							>
								<X className="w-3 h-3" />
							</button>
						</Badge>
					);
				})}
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => input && setShowSuggestions(true)}
					onBlur={() => {
						setTimeout(() => setShowSuggestions(false), 200);
					}}
					placeholder={value.length === 0 ? placeholder : ""}
					className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
				/>
			</div>

			{/* Autocomplete suggestions */}
			{showSuggestions && (
				<div
					className={`absolute z-50 w-full bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto ${
						showSuggestionsAbove ? "bottom-full mb-1" : "top-full mt-1"
					}`}
				>
					{suggestions.map((tag) => (
						<button
							key={tag.tag_id}
							type="button"
							onClick={() => handleAddTag(tag.name)}
							className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
						>
							<span>{tag.name}</span>
							{tag.file_count !== undefined && (
								<span className="text-xs text-muted-foreground">
									{tag.file_count} files
								</span>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
