"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TagCategory } from "@/types";
import { CategoryListItem } from "./CategoryListItem";

interface DragAndDropListProps {
	categories: TagCategory[];
	onReorder: (categoryIds: number[]) => void;
	onEdit: (category: TagCategory) => void;
	onDelete: (category: TagCategory) => void;
}

function SortableCategoryItem({
	category,
	onEdit,
	onDelete,
}: {
	category: TagCategory;
	onEdit: (category: TagCategory) => void;
	onDelete: (category: TagCategory) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: category.category_id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} className="relative">
			<CategoryListItem
				category={category}
				onEdit={onEdit}
				onDelete={onDelete}
				isDragging={isDragging}
				dragProps={{
					attributes,
					listeners,
				}}
			/>
		</div>
	);
}

export function DragAndDropList({ categories, onReorder, onEdit, onDelete }: DragAndDropListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const activeId = active.id as number;
			const overId = over.id as number;

			const oldIndex = categories.findIndex((cat) => cat.category_id === activeId);
			const newIndex = categories.findIndex((cat) => cat.category_id === overId);

			const newCategories = arrayMove(categories, oldIndex, newIndex);
			const categoryIds = newCategories.map((cat) => cat.category_id);
			onReorder(categoryIds);
		}
	};

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext
				items={categories.map((cat) => cat.category_id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="space-y-2">
					{categories.map((category) => (
						<div key={category.category_id} className="relative">
							<SortableCategoryItem
								category={category}
								onEdit={onEdit}
								onDelete={onDelete}
							/>
						</div>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
