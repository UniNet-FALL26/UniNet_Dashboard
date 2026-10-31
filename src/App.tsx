import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { roleDefaultRoutes } from './data/navigation';

// Pages
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

// Admin Pages
import { RevenuePage } from './pages/admin/RevenuePage';
import { StaffPage } from './pages/admin/StaffPage';
import { ServicePackagesPage } from './pages/admin/ServicePackagesPage';
import { SkillsPage } from './pages/admin/SkillsPage';
import { AdminProjectsPage } from './pages/admin/ProjectsPage';

// Verificator Pages
import { StudentsPage } from './pages/verificator/StudentsPage';
import { CompaniesPage } from './pages/verificator/CompaniesPage';
import { VerificatorProjectsPage } from './pages/verificator/ProjectsPage';
import { VerificatorAvailabilityPage } from './pages/verificator/VerificatorAvailabilityPage';

// Moderator Pages
import { ModeratorProjectsPage } from './pages/moderator/ProjectsPage';
import { JobPostingsPage } from './pages/moderator/JobPostingsPage';
import { CareerProfilesPage } from './pages/moderator/CareerProfilesPage';
import { CommunityPostsPage } from './pages/moderator/CommunityPostsPage';
import { AdvertisementsPage } from './pages/moderator/AdvertisementsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationBroadcastsPage } from './pages/admin/NotificationBroadcastsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { UserDetailPage } from './pages/admin/UserDetailPage';
import { AccountVerificationsPage } from './pages/admin/AccountVerificationsPage';
import { AccountVerificationDetailPage } from './pages/admin/AccountVerificationDetailPage';

// Component điều hướng thông minh tại trang gốc "/"
const RootRedirect: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Đang khởi tạo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleDefaultRoutes[currentUser.role]} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Trang chủ & Xác thực */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Phân vùng Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/revenue" replace />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="service-packages" element={<ServicePackagesPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="projects" element={<AdminProjectsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="notification-broadcasts" element={<NotificationBroadcastsPage />} />
            <Route path="student-verifications" element={<AccountVerificationsPage kind="student" />} />
            <Route path="student-verifications/:id" element={<AccountVerificationDetailPage kind="student" />} />
            <Route path="partner-verifications" element={<AccountVerificationsPage kind="partner" />} />
            <Route path="partner-verifications/:id" element={<AccountVerificationDetailPage kind="partner" />} />
            <Route path="job-postings" element={<JobPostingsPage />} />
            <Route path="community-posts" element={<CommunityPostsPage />} />
          </Route>

          {/* Phân vùng Verificator */}
          <Route
            path="/verificator"
            element={
              <ProtectedRoute allowedRoles={['verificator']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/verificator/availability" replace />} />
            <Route path="availability" element={<VerificatorAvailabilityPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="student-verifications" element={<AccountVerificationsPage kind="student" />} />
            <Route path="student-verifications/:id" element={<AccountVerificationDetailPage kind="student" />} />
            <Route path="partner-verifications" element={<AccountVerificationsPage kind="partner" />} />
            <Route path="partner-verifications/:id" element={<AccountVerificationDetailPage kind="partner" />} />
            <Route path="projects" element={<VerificatorProjectsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Phân vùng Moderator */}
          <Route
            path="/moderator"
            element={
              <ProtectedRoute allowedRoles={['moderator']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/moderator/projects" replace />} />
            <Route path="projects" element={<ModeratorProjectsPage />} />
            <Route path="job-postings" element={<JobPostingsPage />} />
            <Route path="career-profiles" element={<CareerProfilesPage />} />
            <Route path="community-posts" element={<CommunityPostsPage />} />
            <Route path="advertisements" element={<AdvertisementsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="student-verifications" element={<AccountVerificationsPage kind="student" />} />
            <Route path="student-verifications/:id" element={<AccountVerificationDetailPage kind="student" />} />
            <Route path="partner-verifications" element={<AccountVerificationsPage kind="partner" />} />
            <Route path="partner-verifications/:id" element={<AccountVerificationDetailPage kind="partner" />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Fallback 404 cho mọi route không xác định */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
