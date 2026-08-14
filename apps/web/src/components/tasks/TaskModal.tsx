import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  X, Edit3, Trash2, Calendar, Clock, User, Tag, CheckSquare,
  MessageSquare, Paperclip, MoreHorizontal, Plus, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { tasksApi, commentsApi } from '../../api/index';
import { toast } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import { PriorityBadge, StatusBadge, LabelBadge } from '../ui/Badge';
import Button from '../components/ui/Button';
import CommentThread from './CommentThread';
import type { Task } from '@collabo/types';

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskModal({ taskId, onClose }: TaskModalProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'subtasks' | 'attachments' | 'activity'>('comments');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.update>[1]) => tasksApi.update(taskId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['task', taskId], updated);
      queryClient.invalidateQueries({ queryKey: ['board'] });
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      toast.success('Task deleted');
      onClose();
    },
  });

  const toggleSubtask = useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) =>
      tasksApi.updateSubtask(taskId, subtaskId, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  });

  if (isLoading || !task) {
    return (
      <Modal isOpen onClose={onClose} size="xl">
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-8 bg-white/8 rounded w-3/4" />
          <div className="h-4 bg-white/8 rounded w-1/2" />
          <div className="h-32 bg-white/8 rounded" />
        </div>
      </Modal>
    );
  }

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <div className="flex-1 min-w-0 pr-4">
            {editingTitle ? (
              <div className="flex gap-2">
                <input
                  className="input-base text-lg font-semibold flex-1"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateMutation.mutate({ title: titleInput });
                      setEditingTitle(false);
                    }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    updateMutation.mutate({ title: titleInput });
                    setEditingTitle(false);
                  }}
                  className="btn btn-primary btn-sm px-3"
                >
                  Save
                </button>
              </div>
            ) : (
              <h2
                className="text-xl font-bold text-slate-100 cursor-text hover:text-primary-300 transition-colors"
                onClick={() => {
                  setTitleInput(task.title);
                  setEditingTitle(true);
                }}
                title="Click to edit"
              >
                {task.title}
              </h2>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.labels?.map((tl) => (
                <LabelBadge key={tl.labelId} label={tl.label} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => deleteMutation.mutate()}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-white/8 hover:text-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
              {task.description ? (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-slate-600 italic">No description yet. Click to add one.</p>
              )}
            </div>

            {/* Subtasks */}
            {totalSubtasks > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Subtasks ({completedSubtasks}/{totalSubtasks})
                  </h3>
                  <div className="text-xs text-slate-500">
                    {Math.round((completedSubtasks / totalSubtasks) * 100)}%
                  </div>
                </div>
                <div className="progress-bar mb-3">
                  <div
                    className="progress-fill"
                    style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {task.subtasks?.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleSubtask.mutate({ subtaskId: subtask.id, completed: !subtask.completed })}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${subtask.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-400'}`}>
                        {subtask.completed && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${subtask.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs: Comments / Attachments / Activity */}
            <div>
              <div className="flex gap-1 mb-4 border-b border-white/8">
                {(['comments', 'subtasks', 'attachments', 'activity'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
                      activeTab === tab
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'comments' && (
                <CommentThread taskId={taskId} currentUser={currentUser} />
              )}

              {activeTab === 'subtasks' && (
                <div className="text-sm text-slate-500">
                  <p>Manage subtasks here.</p>
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="text-sm text-slate-500">
                  <p>Attachments: {task._count?.attachments ?? 0} files</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar info */}
          <div className="w-64 border-l border-white/8 p-4 space-y-5 flex-shrink-0 overflow-y-auto">
            <InfoRow label="Reporter" icon={User}>
              {task.reporter && (
                <div className="flex items-center gap-2">
                  <Avatar user={task.reporter} size="xs" />
                  <span className="text-sm text-slate-300">{task.reporter.name}</span>
                </div>
              )}
            </InfoRow>

            <InfoRow label="Assignees" icon={User}>
              {task.assignees && task.assignees.length > 0 ? (
                <div className="space-y-1">
                  {task.assignees.map((a) => (
                    <div key={a.userId} className="flex items-center gap-2">
                      <Avatar user={a.user} size="xs" />
                      <span className="text-sm text-slate-300">{a.user.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-500">Unassigned</span>
              )}
            </InfoRow>

            {task.dueDate && (
              <InfoRow label="Due Date" icon={Calendar}>
                <span className="text-sm text-slate-300">
                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                </span>
              </InfoRow>
            )}

            {task.estimatedHours && (
              <InfoRow label="Estimate" icon={Clock}>
                <span className="text-sm text-slate-300">{task.estimatedHours}h</span>
              </InfoRow>
            )}

            <InfoRow label="Created" icon={Calendar}>
              <span className="text-sm text-slate-400">
                {format(new Date(task.createdAt), 'MMM d, yyyy')}
              </span>
            </InfoRow>

            {/* Status selector */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</p>
              <select
                value={task.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as Task['status'] })}
                className="input-base text-xs"
              >
                {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Priority selector */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority</p>
              <select
                value={task.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value as Task['priority'] })}
                className="input-base text-xs"
              >
                {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}
