/**
 * Header — MS Teams-style top bar
 * Search bar (center) + Notification bell + Theme toggle + Avatar dropdown
 */
import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getRoleLabel } from '../utils/helpers';
import AvatarCircle from './AvatarCircle';
import NotificationBell from './NotificationBell';
import {
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();


  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    if (!user) return;
    const role = user.role;
    if (role === 'admin') navigate('/admin/profile');
    else if (role === 'teacher') navigate('/teacher/profile');
    else navigate('/student/profile');
  };

  return (
    <header className="teams-header">
      {/* Left: page context / breadcrumb */}
      <div className="th-left">
        <span className="th-app-name">EduPlatform</span>
      </div>



      {/* Right: actions */}
      <div className="th-right">
        {/* Theme toggle */}
        <button
          className="th-icon-btn"
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex' }}
            >
              {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* Avatar + dropdown */}
        <div ref={dropdownRef} className="th-avatar-wrapper">
          <button
            id="header-avatar-btn"
            className={clsx('th-avatar-btn', dropdownOpen && 'th-avatar-btn--open')}
            onClick={() => setDropdownOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="Tài khoản"
          >
            <AvatarCircle name={user?.username} size="sm" online />
            <HiOutlineChevronDown
              className={clsx('th-avatar-chevron', dropdownOpen && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                className="th-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                role="menu"
              >
                {/* User info */}
                <div className="th-dropdown-header">
                  <AvatarCircle name={user?.username} size="md" online />
                  <div className="th-dropdown-user">
                    <span className="th-dropdown-name">{user?.username}</span>
                    <span className="th-dropdown-role">{getRoleLabel(user?.role || '')}</span>
                  </div>
                </div>
                <div className="th-dropdown-divider" />

                {/* Actions */}
                <button className="th-dropdown-item" onClick={handleProfileClick} role="menuitem">
                  <HiOutlineUserCircle />
                  <span>Hồ sơ cá nhân</span>
                </button>
                <button
                  className="th-dropdown-item"
                  onClick={toggleTheme}
                  role="menuitem"
                >
                  {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <div className="th-dropdown-divider" />
                <button
                  className="th-dropdown-item th-dropdown-item--danger"
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  role="menuitem"
                >
                  <HiOutlineArrowRightOnRectangle />
                  <span>Đăng xuất</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
