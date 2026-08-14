import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Camera, Save, Lock } from 'lucide-react';
import { usersApi } from '../api/index';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import Avatar from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

interface ProfileForm {
  name: string;
  bio: string;
  jobTitle: string;
  timezone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  const { register: registerProfile, handleSubmit: handleProfile } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? '',
      bio: user?.bio ?? '',
      jobTitle: user?.jobTitle ?? '',
      timezone: user?.timezone ?? 'UTC',
    },
  });

  const { register: registerPwd, handleSubmit: handlePwd, reset: resetPwd, watch } = useForm<PasswordForm>();

  const updateProfileMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: usersApi.uploadAvatar,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Avatar updated');
    },
    onError: () => toast.error('Failed to upload avatar'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      import('../api/auth.api').then(({ authApi }) => authApi.changePassword(currentPassword, newPassword, newPassword)),
    onSuccess: () => {
      toast.success('Password changed');
      resetPwd();
    },
    onError: (e: unknown) => toast.error('Failed', (e as { response?: { data?: { message?: string } } })?.response?.data?.message),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatarMutation.mutate(file);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="page-title mb-6">Profile Settings</h1>

      {/* Avatar */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar user={user ?? undefined} size="xl" />
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">{user?.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            {user?.jobTitle && <p className="text-slate-500 text-sm mt-1">{user.jobTitle}</p>}
            <p className="text-xs text-slate-600 mt-2">Click avatar to change photo</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/8">
        {[
          { id: 'profile', label: 'Profile Information' },
          { id: 'password', label: 'Change Password' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6">
          <form onSubmit={handleProfile((d) => updateProfileMutation.mutate(d))} className="space-y-4">
            <Input {...registerProfile('name')} label="Full Name" />
            <Input {...registerProfile('jobTitle')} label="Job Title" placeholder="e.g. Frontend Engineer" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Bio</label>
              <textarea
                {...registerProfile('bio')}
                placeholder="Tell your team about yourself..."
                className="input-base resize-none min-h-20"
                rows={4}
              />
            </div>
            <Input {...registerProfile('timezone')} label="Timezone" placeholder="e.g. America/New_York" />
            <Button type="submit" icon={Save} isLoading={updateProfileMutation.isPending}>
              Save Profile
            </Button>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card p-6">
          <form onSubmit={handlePwd((d) => changePasswordMutation.mutate(d))} className="space-y-4">
            <Input
              {...registerPwd('currentPassword', { required: 'Required' })}
              label="Current Password"
              type="password"
              icon={Lock}
            />
            <Input
              {...registerPwd('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
              label="New Password"
              type="password"
              icon={Lock}
            />
            <Input
              {...registerPwd('confirmPassword', {
                required: 'Required',
                validate: (v) => v === watch('newPassword') || 'Passwords do not match',
              })}
              label="Confirm New Password"
              type="password"
              icon={Lock}
            />
            <Button type="submit" isLoading={changePasswordMutation.isPending}>
              Change Password
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
