import { clsx } from 'clsx';
import type { TaskPriority, TaskStatus } from '@collabo/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  size?: 'xs' | 'sm';
}

const variantMap = {
  default: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  primary: 'bg-primary-500/15 text-primary-400 border border-primary-500/20',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
  info: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
};

export default function Badge({ children, variant = 'default', className, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        variantMap[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Priority badge
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config: Record<TaskPriority, { label: string; className: string }> = {
    URGENT: { label: '🔴 Urgent', className: 'priority-urgent' },
    HIGH: { label: '🟠 High', className: 'priority-high' },
    MEDIUM: { label: '🟡 Medium', className: 'priority-medium' },
    LOW: { label: '🔵 Low', className: 'priority-low' },
  };

  const { label, className } = config[priority];
  return (
    <span className={clsx('tag text-xs', className)}>
      {label}
    </span>
  );
}

// Status badge
export function StatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { label: string; className: string }> = {
    TODO: { label: 'To Do', className: 'status-todo' },
    IN_PROGRESS: { label: 'In Progress', className: 'status-in-progress' },
    IN_REVIEW: { label: 'In Review', className: 'status-in-review' },
    DONE: { label: 'Done', className: 'status-done' },
    CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },
  };

  const { label, className } = config[status];
  return (
    <span className={clsx('tag text-xs', className)}>
      {label}
    </span>
  );
}

// Label badge with custom color
export function LabelBadge({ label }: { label: { name: string; color: string } }) {
  return (
    <span
      className="tag text-white text-xs"
      style={{ backgroundColor: `${label.color}30`, color: label.color, borderColor: `${label.color}40`, border: '1px solid' }}
    >
      {label.name}
    </span>
  );
}
