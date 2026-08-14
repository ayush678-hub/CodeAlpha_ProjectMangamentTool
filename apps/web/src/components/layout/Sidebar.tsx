import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';
import Avatar from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { projectsApi } from '../../api/projects.api';
import { authApi } from '../../api/auth.api';
import { useState } from 'react';
import CreateProjectModal from '../projects/CreateProjectModal';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    enabled: !!user,
  });

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen z-30 flex flex-col',
          'bg-surface-900 border-r border-white/6',
          'transition-all duration-300',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/6 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-slate-100 text-lg tracking-tight truncate">
                Collabo
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-lg text-slate-500 hover:bg-white/8 hover:text-slate-100 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          <NavItem
            to="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={isActive('/dashboard')}
            collapsed={!sidebarOpen}
          />
          <NavItem
            to="/notifications"
            icon={Bell}
            label="Notifications"
            active={isActive('/notifications')}
            collapsed={!sidebarOpen}
          />

          {/* Projects section */}
          {sidebarOpen && (
            <div className="mt-4 mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Projects
              </span>
              <button
                onClick={() => setShowCreateProject(true)}
                className="p-1 rounded text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                title="New Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {projects.slice(0, 8).map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/board`}
              className={clsx(
                'sidebar-item',
                projectId === project.id && 'sidebar-item-active'
              )}
              title={project.name}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              {sidebarOpen && (
                <span className="truncate flex-1">{project.name}</span>
              )}
            </Link>
          ))}

          {/* Project actions when viewing a project */}
          {projectId && sidebarOpen && (
            <div className="mt-2 pt-2 border-t border-white/6 space-y-0.5">
              <NavItem
                to={`/projects/${projectId}/settings`}
                icon={Settings}
                label="Settings"
                active={isActive(`/projects/${projectId}/settings`)}
                collapsed={!sidebarOpen}
              />
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-white/6 p-2">
          <Link
            to="/profile"
            className={clsx(
              'sidebar-item',
              isActive('/profile') && 'sidebar-item-active'
            )}
          >
            <Avatar user={user ?? undefined} size="xs" />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="sidebar-item w-full mt-0.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
    </>
  );
}

function NavItem({ to, icon: Icon, label, active, collapsed }: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      to={to}
      className={clsx(active ? 'sidebar-item-active' : 'sidebar-item')}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
