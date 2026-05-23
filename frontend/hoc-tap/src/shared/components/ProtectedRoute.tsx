/**
 * ProtectedRoute — Role-based route guard
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/constants';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the user's own portal
    switch (user.role) {
      case 'admin':
        return <Navigate to={ROUTES.ADMIN} replace />;
      case 'teacher':
        return <Navigate to={ROUTES.TEACHER} replace />;
      case 'student':
        return <Navigate to={ROUTES.STUDENT} replace />;
      default:
        return <Navigate to={ROUTES.LOGIN} replace />;
    }
  }

  return <Outlet />;
}
