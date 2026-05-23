/**
 * NotificationBell — Bell icon with unread badge + dropdown panel.
 * Polls every 30s for new notifications. Click to view, mark as read.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineBell } from 'react-icons/hi2';
import { notificationApi } from '../../api/notificationApi';
import type { Notification } from '../../api/notificationApi';
import './NotificationBell.css';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await notificationApi.getCount();
      setCount(res.count);
    } catch {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getUnread();
      setNotifications(data);
      setCount(data.length);
    } catch {
      // silent
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Fetch full list when panel opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications([]);
      setCount(0);
    } catch {
      // silent
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={panelRef}>
      <button
        className="th-icon-btn th-notif-btn"
        title="Thông báo"
        aria-label="Thông báo"
        onClick={() => setOpen((v) => !v)}
      >
        <HiOutlineBell />
        {count > 0 && (
          <span className="th-notif-badge th-notif-badge--animated">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-panel"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="notif-panel-header">
              <h3>Thông báo ({count})</h3>
              {count > 0 && (
                <button onClick={handleMarkAllRead}>Đọc tất cả</button>
              )}
            </div>

            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <HiOutlineBell />
                  <p>Không có thông báo mới</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    className="notif-item"
                    onClick={() => handleMarkRead(n.id)}
                    title="Click để đánh dấu đã đọc"
                  >
                    <span className="notif-item-dot" />
                    <div className="notif-item-body">
                      {n.sourceName && (
                        <span className={`notif-item-source ${n.maLopMon === 'global' ? 'source-system' : 'source-class'}`}>
                          {n.sourceName}
                        </span>
                      )}
                      <p className="notif-item-title">{n.title}</p>
                      <p className="notif-item-content">{n.content}</p>
                      <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
