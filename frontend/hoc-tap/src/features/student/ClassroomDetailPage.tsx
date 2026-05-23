/**
 * ClassroomDetailPage — Student's classroom detail with tabs
 * Tabs: Tài liệu | Điểm môn học | Làm TN | Điểm TN | Trò chuyện
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineAcademicCap,
  HiOutlineChatBubbleLeftRight,
  HiOutlineBell,
  HiOutlineClipboardDocumentCheck,
} from 'react-icons/hi2';
import StudentDiemMonHocPage from './DiemMonHocPage';
import StudentDiemTracNghiemPage from './DiemTracNghiemPage';
import TaiLieuTab from '../../shared/components/TaiLieuTab';
import QuizTakeTab from '../../shared/components/QuizTakeTab';
import ChatTab from '../../shared/components/ChatTab';
import AnnouncementTab from '../../shared/components/AnnouncementTab';
import BaiTapTab from '../../shared/components/BaiTapTab';
import AIBubble from '../../shared/components/AIBubble';
import { chatApi } from '../../api/chatApi';
import { announcementApi } from '../../api/announcementApi';
import { lopMonHocApi } from '../../api/lopMonHocApi';
import '../teacher/ClassroomDetail.css';

const TABS = [
  { key: 'tailieu', label: 'Tài liệu', icon: <HiOutlineDocumentText /> },
  { key: 'thongbao', label: 'Thông báo', icon: <HiOutlineBell /> },
  { key: 'diemmonhoc', label: 'Điểm môn học', icon: <HiOutlineChartBar /> },
  { key: 'lamtracnghiem', label: 'Làm trắc nghiệm', icon: <HiOutlineClipboardDocumentList /> },
  { key: 'diemtracnghiem', label: 'Điểm trắc nghiệm', icon: <HiOutlineAcademicCap /> },
  { key: 'baitap', label: 'Bài tập', icon: <HiOutlineClipboardDocumentCheck /> },
  { key: 'trochuyen', label: 'Trò chuyện', icon: <HiOutlineChatBubbleLeftRight /> },
];

export default function ClassroomDetailPage() {
  const { maLopMon } = useParams<{ maLopMon: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tailieu');
  const [tenMH, setTenMH] = useState('');

  const [totalChat, setTotalChat] = useState(0);
  const [totalAnn, setTotalAnn] = useState(0);
  const [, setForceRender] = useState(0);

  // Fetch counts
  useEffect(() => {
    if (maLopMon) {
      chatApi.getCount(maLopMon).then(res => setTotalChat(res.count)).catch(() => { });
      announcementApi.getCount(maLopMon).then(res => setTotalAnn(res.count)).catch(() => { });
      lopMonHocApi.getAll().then(all => {
        const found = all.find(l => l.MaLopMon === maLopMon);
        if (found) setTenMH(found.TenLopMon || found.TenMH || found.MaMH || maLopMon);
      }).catch(() => { });
    }
  }, [maLopMon]);

  const getUnreadChat = () => {
    if (!user) return 0;
    const lastSeen = parseInt(localStorage.getItem(`lastRead_chat_${maLopMon}_${user.username}`) || '0', 10);
    return Math.max(0, totalChat - lastSeen);
  };

  const getUnreadAnn = () => {
    if (!user) return 0;
    const lastSeen = parseInt(localStorage.getItem(`lastRead_ann_${maLopMon}_${user.username}`) || '0', 10);
    return Math.max(0, totalAnn - lastSeen);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tailieu':
        return <TaiLieuTab maLopMon={maLopMon!} />;
      case 'diemmonhoc':
        return <StudentDiemMonHocPage maLopMon={maLopMon!} />;
      case 'lamtracnghiem':
        return <QuizTakeTab maLopMon={maLopMon!} />;
      case 'diemtracnghiem':
        return <StudentDiemTracNghiemPage maLopMon={maLopMon!} />;
      case 'trochuyen':
        return <ChatTab maLopMon={maLopMon!} />;
      case 'thongbao':
        return <AnnouncementTab maLopMon={maLopMon!} isTeacher={false} />;
      case 'baitap':
        return <BaiTapTab maLopMon={maLopMon!} isTeacher={false} />;
      default:
        return null;
    }
  };

  return (
    <div className="page animate-fade-in">
      <div className="detail-header">
        <button className="btn btn-ghost" onClick={() => navigate('/student')}>
          <HiOutlineArrowLeft /> Quay lại
        </button>
        <h1 className="page-title">{tenMH || 'Đang tải...'}</h1>
      </div>

      <div className="detail-tabs">
        {TABS.map((tab) => {
          const isChat = tab.key === 'trochuyen';
          const isAnn = tab.key === 'thongbao';
          const unreadCount = isChat ? getUnreadChat() : (isAnn ? getUnreadAnn() : 0);

          return (
            <button
              key={tab.key}
              className={`detail-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                if (user) {
                  if (isChat) {
                    localStorage.setItem(`lastRead_chat_${maLopMon}_${user.username}`, totalChat.toString());
                    setForceRender(prev => prev + 1);
                  }
                  if (isAnn) {
                    localStorage.setItem(`lastRead_ann_${maLopMon}_${user.username}`, totalAnn.toString());
                    setForceRender(prev => prev + 1);
                  }
                }
              }}
              style={{ position: 'relative' }}
            >
              <span className="detail-tab-icon">{tab.icon}</span>
              {tab.label}
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: -10, background: 'var(--danger-500)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="detail-content animate-fade-in" key={activeTab}>
        {renderTabContent()}
      </div>

      {activeTab !== 'lamtracnghiem' && <AIBubble maLopMon={maLopMon!} />}
    </div>
  );
}
