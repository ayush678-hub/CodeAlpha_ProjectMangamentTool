import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, CheckSquare, Calendar, TrendingUp, MoreHorizontal, Trash2, Settings } from 'lucide-react';
import { useState } from 'react';
import { projectsApi } from '../api/projects.api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import Avatar, { AvatarGroup } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import { format } from 'date-fns';
import type { Project } from '@collabo/types';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const statusColors: Record<string, string> = {
    PLANNING: 'bg-slate-500/15 text-slate-400',
    ACTIVE: 'bg-emerald-500/15 text-emerald-400',
    ON_HOLD: 'bg-amber-500/15 text-amber-400',
    COMPLETED: 'bg-blue-500/15 text-blue-400',
    ARCHIVED: 'bg-slate-600/15 text-slate-500',
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's an overview of your projects.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>
          New Project
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-primary-400' },
          { label: 'Active Projects', value: projects.filter(p => p.status === 'ACTIVE').length, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Total Tasks', value: projects.reduce((a, p) => a + (p._count?.tasks ?? 0), 0), icon: CheckSquare, color: 'text-violet-400' },
          { label: 'Team Members', value: [...new Set(projects.flatMap(p => []))].length || projects.length, icon: Users, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={clsx('p-2 rounded-lg bg-white/5', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects grid */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Your Projects</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
              <FolderKanban className="w-10 h-10 text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">No projects yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              Create your first project to start organizing tasks and collaborating with your team.
            </p>
            <Button icon={Plus} onClick={() => setShowCreate(true)}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                statusColors={statusColors}
                onDelete={() => {
                  if (window.confirm(`Delete "${project.name}"?`)) {
                    deleteMutation.mutate(project.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function ProjectCard({ project, statusColors, onDelete }: { project: Project; statusColors: Record<string, string>; onDelete: () => void }) {
  const completionPct = project._count
    ? Math.round(((project._count.tasks || 0) / Math.max(project._count.tasks || 1, 1)) * 100)
    : 0;

  return (
    <div className="card-hover p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: project.color }}
          >
            {project.name[0]}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{project.name}</h3>
            <span className={clsx('tag text-xs mt-0.5 inline-flex', statusColors[project.status] || statusColors.ACTIVE)}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/projects/${project.id}/settings`}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-white/8 hover:text-slate-100 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <CheckSquare className="w-3.5 h-3.5" />
          {project._count?.tasks ?? 0} tasks
        </span>
        {project.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(project.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      <Link
        to={`/projects/${project.id}/board`}
        className="block w-full btn btn-secondary btn-sm mt-3 justify-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        Open Board
      </Link>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
