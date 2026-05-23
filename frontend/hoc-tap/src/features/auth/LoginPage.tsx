/**
 * LoginPage — Premium dark login with gradient accents
 */
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { ROUTES, ROLES } from '../../shared/utils/constants';
import { HiOutlineAcademicCap } from 'react-icons/hi2';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLoading3Quarters } from 'react-icons/ai';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to appropriate portal
  if (isAuthenticated && user) {
    switch (user.role) {
      case ROLES.ADMIN:
        return <Navigate to={ROUTES.ADMIN} replace />;
      case ROLES.TEACHER:
        return <Navigate to={ROUTES.TEACHER} replace />;
      case ROLES.STUDENT:
        return <Navigate to={ROUTES.STUDENT} replace />;
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success('Đăng nhập thành công!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Developer Grid Pattern */}
      <div className="login-bg" />

      <div className="login-card animate-slide-up">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <HiOutlineAcademicCap />
          </div>
          <h1 className="login-title">Hệ thống Quản lý Đào tạo</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="login-username">Tên đăng nhập</label>
            <input
              id="login-username"
              type="text"
              className="input"
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <AiOutlineLoading3Quarters className="spin-icon" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 TN Education Platform</p>
        </div>
      </div>
    </div>
  );
}
