"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
	value: string;
	onChange: (color: string) => void;
	disabled?: boolean;
}

const PRESET_COLORS = [
	"#10B981", // Green (GENERAL)
	"#3B82F6", // Blue (CHARACTER)
	"#EF4444", // Red (RATING)
	"#F59E0B", // Orange (ARTIST)
	"#8B5CF6", // Purple
	"#EC4899", // Pink
	"#14B8A6", // Teal
	"#F97316", // Orange
	"#6366F1", // Indigo
	"#84CC16", // Lime
	"#06B6D4", // Cyan
	"#A855F7", // Violet
	"#6B7280", // Gray (default)
	"#DC2626", // Red
	"#059669", // Emerald
	"#0EA5E9", // Sky
];

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
	const [open, setOpen] = useState(false);

	const handleColorSelect = (color: string) => {
		onChange(color);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="w-full justify-start gap-2 h-10"
					disabled={disabled}
				>
					<div
						className="w-4 h-4 rounded border border-border"
						style={{ backgroundColor: value }}
					/>
					<span className="text-sm font-mono">{value.toUpperCase()}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-3" align="start">
				<div className="space-y-3">
					<fieldset>
						<legend className="text-xs font-medium text-muted-foreground mb-2 block">
							预设颜色
						</legend>
						<div className="grid grid-cols-8 gap-2">
							{PRESET_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									className={cn(
										"w-8 h-8 rounded border-2 transition-all hover:scale-110",
										value === color
											? "border-primary ring-2 ring-primary ring-offset-1"
											: "border-border hover:border-primary"
									)}
									style={{ backgroundColor: color }}
									onClick={() => handleColorSelect(color)}
									title={color}
								/>
							))}
						</div>
					</fieldset>
					<div>
						<label
							htmlFor="custom-color"
							className="text-xs font-medium text-muted-foreground mb-2 block"
						>
							自定义颜色
						</label>
						<input
							id="custom-color"
							type="color"
							value={value}
							onChange={(e) => onChange(e.target.value)}
							className="w-full h-10 rounded border border-border cursor-pointer"
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
