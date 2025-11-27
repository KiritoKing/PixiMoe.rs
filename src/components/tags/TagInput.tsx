import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useSearchTags } from "@/lib/hooks";

interface TagInputProps {
	value: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
}

export function TagInput({
	value,
	onChange,
	placeholder = "Add tags...",
}: TagInputProps) {
	const [input, setInput] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const { data: suggestions = [] } = useSearchTags(input);

	useEffect(() => {
		setShowSuggestions(input.length > 0 && suggestions.length > 0);
	}, [input, suggestions]);

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
		<div className="relative w-full">
			<div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
				{value.map((tag) => (
					<Badge key={tag} variant="secondary" className="gap-1">
						{tag}
						<button
							type="button"
							onClick={() => handleRemoveTag(tag)}
							className="hover:text-blue-600"
						>
							<X className="w-3 h-3" />
						</button>
					</Badge>
				))}
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => input && setShowSuggestions(true)}
					onBlur={() => {
						setTimeout(() => setShowSuggestions(false), 200);
						if (input.trim()) {
							handleAddTag(input);
						}
					}}
					placeholder={value.length === 0 ? placeholder : ""}
					className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
				/>
			</div>

			{/* Autocomplete suggestions */}
			{showSuggestions && (
				<div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
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
