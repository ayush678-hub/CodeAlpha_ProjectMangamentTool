import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import type { Column, Task } from '@collabo/types';
import TaskCard from './TaskCard';

interface BoardColumnProps {
  column: Column;
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
}

export default function BoardColumn({ column, onAddTask, onTaskClick }: BoardColumnProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskIds = column.tasks.map((t) => t.id);

  const dotColor: Record<string, string> = {
    Backlog: 'bg-slate-500',
    'To Do': 'bg-blue-500',
    'In Progress': 'bg-amber-500',
    Review: 'bg-violet-500',
    Done: 'bg-emerald-500',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'kanban-column flex-shrink-0',
        isDragging && 'opacity-50'
      )}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-3 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', dotColor[column.name] ?? 'bg-slate-500')} />
          <span className="font-semibold text-sm text-slate-200">{column.name}</span>
          <span className="text-xs text-slate-500 bg-white/8 px-1.5 py-0.5 rounded-full font-medium">
            {column.tasks.length}
          </span>
        </div>
        <button className="p-1 rounded text-slate-600 hover:text-slate-400 hover:bg-white/8 transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-16">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-slate-600 border-2 border-dashed border-white/6 rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add task button */}
      <div className="px-2 pb-2">
        <button
          onClick={onAddTask}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add task
        </button>
      </div>
    </div>
  );
}
