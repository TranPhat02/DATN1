/**
 * ProfilePage — User profile with info display + change password
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineAcademicCap,
  HiOutlineCalendar,
  HiOutlineMapPin,
} from 'react-icons/hi2';

interface Profile {
  username: string;
  role: string;
  ten?: string;
  maSV?: string;
  maGV?: string;
  gioiTinh?: string;
  ngaySinh?: string;
  diaChi?: string;
  maLop?: string;
  gmail?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await axiosClient.get<Profile>('/auth/profile');
      setProfile(data);
    } catch {
      toast.error('Không thể tải thông tin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleChangePassword = async () => {
    if (!oldPw || !newPw) {
      toast.error('Vui lòng nhập đầy đủ');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPw.length < 6) {
      toast.error('Mật khẩu mới phải ít nhất 6 ký tự');
      return;
    }
    setChangingPw(true);
    try {
      await axiosClient.post('/auth/change-password', {
        old_password: oldPw,
        new_password: newPw,
      });
      toast.success('Đổi mật khẩu thành công!');
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return <div className="loading-overlay" style={{ minHeight: '60vh' }}><div className="spinner" /><span>Đang tải...</span></div>;
  }

  const roleLabel = profile?.role === 'teacher' ? 'Giáo viên' : profile?.role === 'student' ? 'Sinh viên' : 'Quản trị viên';

  const infoItems = [
    { icon: <HiOutlineUser />, label: 'Họ tên', value: profile?.ten || user?.username },
    { icon: <HiOutlineAcademicCap />, label: 'Mã', value: profile?.maSV || profile?.maGV || '—' },
    { icon: <HiOutlineEnvelope />, label: 'Email', value: profile?.gmail || profile?.username },
    { icon: <HiOutlineCalendar />, label: 'Ngày sinh', value: profile?.ngaySinh ? new Date(profile.ngaySinh).toLocaleDateString('vi-VN') : '—' },
    { icon: <HiOutlineMapPin />, label: 'Địa chỉ', value: profile?.diaChi || '—' },
  ];

  if (profile?.role === 'student' && profile?.maLop) {
    infoItems.push({ icon: <HiOutlineAcademicCap />, label: 'Lớp', value: profile.maLop });
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Hồ sơ cá nhân</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', maxWidth: 900 }}>
        {/* Profile Info */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto var(--space-3)',
              background: 'linear-gradient(135deg, var(--teams-accent), rgba(98,100,167,0.7))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', color: 'white', fontWeight: 700,
            }}>
              {(profile?.ten || user?.username || '?').charAt(0).toUpperCase()}
            </div>
            <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{profile?.ten || user?.username}</h3>
            <span className={`badge ${profile?.role === 'teacher' ? 'badge-primary' : 'badge-success'}`} style={{ marginTop: 'var(--space-2)', display: 'inline-block' }}>
              {roleLabel}
            </span>
          </div>

          {infoItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-3) 0',
              borderBottom: i < infoItems.length - 1 ? '1px solid var(--border-primary)' : 'none',
            }}>
              <span style={{ color: 'var(--teams-accent)', fontSize: '1.25rem' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{item.label}</div>
                <div style={{ color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Change Password */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <HiOutlineLockClosed /> Đổi mật khẩu
          </h3>
          <div className="input-group">
            <label>Mật khẩu hiện tại</label>
            <input className="input" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="Nhập mật khẩu cũ" />
          </div>
          <div className="input-group">
            <label>Mật khẩu mới</label>
            <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nhập mật khẩu mới" />
          </div>
          <div className="input-group">
            <label>Xác nhận mật khẩu mới</label>
            <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleChangePassword}
            disabled={changingPw}
            style={{ marginTop: 'var(--space-4)', width: '100%' }}
          >
            {changingPw ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </div>
    </div>
  );
}
