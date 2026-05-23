/**
 * AdminLayout — Teams-style layout with Icon Rail + Nav Panel
 */
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar, { ADMIN_MENU } from '../../shared/components/Sidebar';
import Header from '../../shared/components/Header';
import PageWrapper from '../../shared/components/PageWrapper';
import './AdminLayout.css';

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="teams-shell">
      <Sidebar items={ADMIN_MENU} title="TN Admin" color="var(--gradient-primary)" />
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
