import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RoleProvider } from '@/context/RoleContext';
import { ApplicationShell } from '@/components/layout/ApplicationShell';
import { UserOverviewPage } from '@/pages/user/UserOverviewPage';
import { UserComplaintsPage } from '@/pages/user/UserComplaintsPage';
import { UserTrackPage } from '@/pages/user/UserTrackPage';
import { UserNotificationsPage } from '@/pages/user/UserNotificationsPage';
import { ComplaintDetailPage } from '@/pages/shared/ComplaintDetailPage';
import { NewComplaintPage } from '@/pages/shared/NewComplaintPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminAllComplaintsPage } from '@/pages/admin/AdminAllComplaintsPage';
import { AdminAssignmentsPage } from '@/pages/admin/AdminAssignmentsPage';
import { AdminEscalationsPage } from '@/pages/admin/AdminEscalationsPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { RegisterPage } from '@/pages/auth/RegisterPage'

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ApplicationShell />}>
            {/* User routes */}
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<UserOverviewPage />} />
            <Route path="/complaints" element={<UserComplaintsPage />} />
            <Route path="/complaints/new" element={<NewComplaintPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/track" element={<UserTrackPage />} />
            <Route path="/notifications" element={<UserNotificationsPage />} />

            {/* Admin routes */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/complaints" element={<AdminAllComplaintsPage />} />
            <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
            <Route path="/admin/escalations" element={<AdminEscalationsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>
            <Route path="/register" element={<RegisterPage />} />  
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
