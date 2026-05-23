/**
 * NotificationBadge — Red badge for unread count on icons
 */
import clsx from 'clsx';

interface NotificationBadgeProps {
  count?: number;
  dot?: boolean;
  className?: string;
}

export default function NotificationBadge({ count, dot, className }: NotificationBadgeProps) {
  if (!count && !dot) return null;

  if (dot || !count) {
    return (
      <span
        className={clsx(
          'absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-[var(--teams-rail-bg)]',
          className,
        )}
      />
    );
  }

  return (
    <span
      className={clsx(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
        'rounded-full bg-red-500 text-white text-[10px] font-bold',
        'flex items-center justify-center leading-none',
        'border border-[var(--teams-rail-bg)]',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
