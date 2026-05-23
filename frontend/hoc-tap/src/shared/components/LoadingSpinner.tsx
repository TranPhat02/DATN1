/**
 * LoadingSpinner — Reusable loading indicator
 */

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ message = 'Đang tải...', fullPage = false }: LoadingSpinnerProps) {
  return (
    <div className="loading-overlay" style={fullPage ? { minHeight: '100vh' } : {}}>
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}
