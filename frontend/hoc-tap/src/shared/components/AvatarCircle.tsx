/**
 * AvatarCircle — Avatar with initials fallback + optional online status dot
 */
import clsx from 'clsx';

interface AvatarCircleProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-6 h-6 text-[10px]', dot: 'w-2 h-2 -bottom-0.5 -right-0.5' },
  sm: { container: 'w-8 h-8 text-xs', dot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5' },
  md: { container: 'w-9 h-9 text-sm', dot: 'w-3 h-3 -bottom-0.5 -right-0.5' },
  lg: { container: 'w-11 h-11 text-base', dot: 'w-3 h-3 bottom-0 right-0' },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name?: string): string {
  if (!name) return '#6264a7';
  const colors = [
    '#6264a7', '#0078d4', '#038387', '#e8a838',
    '#c4314b', '#00a280', '#d87093', '#8764b8',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function AvatarCircle({ name, src, size = 'md', online, className }: AvatarCircleProps) {
  const { container, dot } = sizeMap[size];

  return (
    <span className={clsx('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx('rounded-full object-cover', container)}
        />
      ) : (
        <span
          className={clsx(
            'rounded-full flex items-center justify-center font-semibold text-white select-none',
            container,
          )}
          style={{ background: getAvatarColor(name) }}
        >
          {getInitials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            'absolute rounded-full border-2 border-[var(--teams-rail-bg)]',
            dot,
            online ? 'bg-green-500' : 'bg-gray-400',
          )}
        />
      )}
    </span>
  );
}
