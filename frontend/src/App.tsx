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
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { LogoutPage } from '@/pages/auth/LogoutPage'; // SCMS-04
import { AuthProvider } from '@/pages/auth/AuthProvider'; // SCMS-04
import { RequireAuth } from '@/pages/auth/RequireAuth'; // SCMS-04
import { RoleSync } from '@/pages/auth/RoleSync'; // SCMS-04
import { RequireAdmin } from '@/pages/auth/RequireAdmin';

export default function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <RoleSync />
        <BrowserRouter>
          <Routes>
            {/* Auth routes (public, no sidebar/header) */}
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/logout" element={<LogoutPage />} />

            {/* Everything below requires login (SCMS-04) */}
            <Route element={<RequireAuth />}>
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
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/complaints" element={<AdminAllComplaintsPage />} />
                  <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
                  <Route path="/admin/escalations" element={<AdminEscalationsPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </AuthProvider>
  );
}
