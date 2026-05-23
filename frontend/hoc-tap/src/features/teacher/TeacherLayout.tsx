/**
 * TeacherLayout — Teams-style layout with Icon Rail + Nav Panel
 */
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar, { TEACHER_MENU } from '../../shared/components/Sidebar';
import Header from '../../shared/components/Header';
import PageWrapper from '../../shared/components/PageWrapper';

export default function TeacherLayout() {
  const location = useLocation();

  return (
    <div className="teams-shell">
      <Sidebar items={TEACHER_MENU} title="Giáo viên" color="#10b981" />
      <div className="teams-content-area">
        <Header />
        <main className="teams-main">
          <AnimatePresence mode="wait" initial={false}>
            <PageWrapper key={location.pathname}>
              <Outlet />
            </PageWrapper>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
