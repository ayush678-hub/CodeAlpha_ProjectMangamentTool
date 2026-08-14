import { clsx } from 'clsx';
import type { User } from '@collabo/types';

interface AvatarProps {
  user?: Partial<User> | null;
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

const sizeMap = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

// Generate consistent color from string
const colorPalette = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-orange-500',
  'bg-amber-500',
];

const getColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export default function Avatar({ user, name, src, size = 'md', className, showStatus, isOnline }: AvatarProps) {
  const displayName = user?.name ?? name ?? '?';
  const avatarSrc = user?.avatar ?? src;
  const initials = getInitials(displayName);
  const bgColor = getColor(displayName);

  return (
    <div className={clsx('relative inline-flex flex-shrink-0', className)}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={displayName}
          className={clsx('rounded-full object-cover ring-2 ring-white/10', sizeMap[size])}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center ring-2 ring-white/10',
            'font-semibold text-white select-none',
            bgColor,
            sizeMap[size]
          )}
          title={displayName}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-surface-800',
            isOnline ? 'bg-emerald-500' : 'bg-slate-500',
            size === 'xs' ? 'w-1.5 h-1.5' : size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
          )}
        />
      )}
    </div>
  );
}

// Avatar group for showing multiple users
export function AvatarGroup({ users, max = 3, size = 'sm' }: { users: Partial<User>[]; max?: number; size?: AvatarProps['size'] }) {
  const shown = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((user, i) => (
        <Avatar key={user.id ?? i} user={user} size={size} className="ring-2 ring-surface-800" />
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            'rounded-full bg-surface-600 ring-2 ring-surface-800 flex items-center justify-center text-slate-400 font-medium select-none',
            sizeMap[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
