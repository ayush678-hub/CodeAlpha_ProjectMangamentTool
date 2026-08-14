import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { MessageSquare, Paperclip, Calendar, CheckSquare } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import type { Task } from '@collabo/types';
import Avatar, { AvatarGroup } from '../ui/Avatar';
import { LabelBadge, PriorityBadge } from '../ui/Badge';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

export default function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;
  const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isDueSoon = task.dueDate && (isToday(new Date(task.dueDate)) || isPast(new Date(task.dueDate)));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'task-card',
        (isSortableDragging || isDragging) && 'dnd-dragging'
      )}
      onClick={onClick}
    >
      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((tl) => (
            <LabelBadge key={tl.labelId} label={tl.label} />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-slate-100 line-clamp-2 mb-2 leading-snug">
        {task.title}
      </p>

      {/* Priority */}
      <div className="mb-2">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Subtasks progress */}
      {totalSubtasks > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedSubtasks}/{totalSubtasks}
            </span>
            <span>{Math.round(subtaskPct)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${subtaskPct}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-slate-500">
          {(task._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageSquare className="w-3 h-3" />
              {task._count!.comments}
            </span>
          )}
          {(task._count?.attachments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <Paperclip className="w-3 h-3" />
              {task._count!.attachments}
            </span>
          )}
          {task.dueDate && (
            <span className={clsx(
              'flex items-center gap-0.5 text-[11px]',
              isDueSoon ? 'text-red-400' : 'text-slate-500'
            )}>
              <Calendar className="w-3 h-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <AvatarGroup
            users={task.assignees.map((a) => a.user)}
            max={3}
            size="xs"
          />
        )}
      </div>
    </div>
  );
}
