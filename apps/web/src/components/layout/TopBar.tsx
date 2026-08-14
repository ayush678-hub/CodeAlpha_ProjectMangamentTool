import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { notificationsApi } from '../../api/index';
import Avatar from '../ui/Avatar';
import { useState } from 'react';
import { clsx } from 'clsx';

export default function TopBar() {
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const user = useAuthStore((s) => s.user);
  const { projectId } = useParams();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list(1),
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <header className="h-16 bg-surface-900 border-b border-white/6 flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb / title area */}
      <div className="flex items-center gap-2">
        {projectId && (
          <span className="text-sm text-slate-500">
            Project Board
          </span>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:bg-white/8 hover:text-slate-100 transition-colors text-sm"
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:block text-xs text-slate-500 bg-surface-700 rounded px-1.5 py-0.5">
            ⌘K
          </span>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-400 hover:bg-white/8 hover:text-slate-100 transition-colors"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:bg-white/8 hover:text-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className={clsx(
              'absolute -top-1 -right-1 min-w-4 h-4 px-0.5 flex items-center justify-center',
              'text-[10px] font-bold text-white bg-red-500 rounded-full'
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <Link to="/profile">
          <Avatar user={user ?? undefined} size="sm" className="cursor-pointer hover:ring-primary-500/50 transition-all" />
        </Link>
      </div>
    </header>
  );
}
