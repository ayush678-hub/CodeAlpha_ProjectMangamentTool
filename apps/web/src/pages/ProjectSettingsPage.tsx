import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Users, Tag, Trash2, UserPlus, Mail } from 'lucide-react';
import { projectsApi } from '../api/projects.api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useForm } from 'react-hook-form';
import { useMutation as useM } from '@tanstack/react-query';
import type { ProjectRole } from '@collabo/types';

type Tab = 'general' | 'members' | 'labels' | 'danger';

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.getMembers(projectId!),
    enabled: !!projectId,
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => projectsApi.getLabels(projectId!),
    enabled: !!projectId,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      toast.success('Member removed');
    },
  });

  const deleteLabel = useMutation({
    mutationFn: (labelId: string) => projectsApi.deleteLabel(projectId!, labelId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels', projectId] }),
  });

  const deleteProject = useMutation({
    mutationFn: () => projectsApi.delete(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      navigate('/dashboard');
    },
  });

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'labels', label: 'Labels', icon: Tag },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ];

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}/board`)}
          className="p-2 rounded-lg text-slate-400 hover:bg-white/8 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">Project Settings</h1>
          {project && (
            <p className="text-slate-500 text-sm mt-0.5">{project.name}</p>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
              } ${tab.id === 'danger' && activeTab !== 'danger' ? 'text-red-500 hover:bg-red-500/10' : ''}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 card p-6">
          {activeTab === 'general' && project && (
            <GeneralSettings project={project} projectId={projectId!} />
          )}

          {activeTab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Members ({members.length})</h2>
                <Button size="sm" icon={UserPlus} onClick={() => setShowInviteModal(true)}>
                  Invite
                </Button>
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-3 rounded-xl bg-white/4 hover:bg-white/8 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar user={member.user} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">{member.user.name}</p>
                        <p className="text-xs text-slate-500">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`tag text-xs ${member.role === 'OWNER' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                        {member.role}
                      </span>
                      {member.role !== 'OWNER' && member.userId !== currentUser?.id && (
                        <button
                          onClick={() => removeMember.mutate(member.userId)}
                          className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'labels' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Labels ({labels.length})</h2>
              <div className="space-y-2">
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center justify-between p-3 rounded-xl bg-white/4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="text-sm text-slate-200">{label.name}</span>
                    </div>
                    <button
                      onClick={() => deleteLabel.mutate(label.id)}
                      className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div>
              <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
              <div className="border border-red-500/20 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">Delete Project</p>
                  <p className="text-xs text-slate-500 mt-1">
                    This will permanently delete the project, all its tasks, comments, and attachments. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${project?.name}"? This cannot be undone.`)) {
                      deleteProject.mutate();
                    }
                  }}
                  isLoading={deleteProject.isPending}
                >
                  Delete Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={projectId!}
      />
    </div>
  );
}

function GeneralSettings({ project, projectId }: { project: any; projectId: string }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { name: project.name, description: project.description ?? '' },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => projectsApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">General Settings</h2>
      <Input {...register('name')} label="Project Name" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Description</label>
        <textarea {...register('description')} className="input-base resize-none min-h-24" rows={4} />
      </div>
      <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
    </form>
  );
}

function InviteModal({ isOpen, onClose, projectId }: { isOpen: boolean; onClose: () => void; projectId: string }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { email: '', role: 'MEMBER' } });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      projectsApi.inviteMember(projectId, data.email, data.role as ProjectRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      toast.success('Invitation sent!');
      reset();
      onClose();
    },
    onError: (e: any) => toast.error('Failed to invite', e?.response?.data?.message),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member" size="sm">
      <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <Input
            {...register('email', { required: true })}
            label="Email Address"
            type="email"
            placeholder="teammate@company.com"
            icon={Mail}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Role</label>
            <select {...register('role')} className="input-base">
              <option value="VIEWER">Viewer</option>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={Mail} isLoading={inviteMutation.isPending}>Send Invite</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
