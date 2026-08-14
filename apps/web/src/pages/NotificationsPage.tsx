import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2, UserPlus, MessageSquare, Tag, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi } from '../api/index';
import { toast } from '../stores/uiStore';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import type { Notification } from '@collabo/types';
import { clsx } from 'clsx';

const typeIcons: Record<string, React.ReactNode> = {
  TASK_ASSIGNED: <Tag className="w-3.5 h-3.5" />,
  COMMENT_MENTION: <MessageSquare className="w-3.5 h-3.5" />,
  TASK_STATUS_CHANGED: <Check className="w-3.5 h-3.5" />,
  MEMBER_JOINED: <UserPlus className="w-3.5 h-3.5" />,
  DEFAULT: <Bell className="w-3.5 h-3.5" />,
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-sm font-medium px-2 py-0.5 bg-primary-500/15 text-primary-400 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={CheckCheck}
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/8" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/8 rounded w-3/4" />
                <div className="h-3 bg-white/8 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-primary-400 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-1">All caught up!</h3>
            <p className="text-slate-500 text-sm">No new notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkRead={() => markReadMutation.mutate(notif.id)}
              onDelete={() => deleteMutation.mutate(notif.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        'card p-4 flex items-start gap-3 group transition-all duration-200',
        !notification.read && 'border-primary-500/20 bg-primary-500/5'
      )}
      onClick={() => !notification.read && onMarkRead()}
    >
      {/* Actor avatar or icon */}
      <div className="relative flex-shrink-0">
        <Avatar user={notification.actor ?? undefined} size="sm" />
        <span className={clsx(
          'absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white',
          'bg-primary-500'
        )}>
          {typeIcons[notification.type] ?? typeIcons.DEFAULT}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'text-sm leading-snug',
          notification.read ? 'text-slate-400' : 'text-slate-200 font-medium'
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!notification.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-white/8 hover:text-primary-400 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
      )}
    </div>
  );
}
