import {
  TrendingUp,
  Users,
  Package,
  Award,
  FolderKanban,
  GraduationCap,
  Building2,
  Briefcase,
  FileText,
  MessageSquare,
  Megaphone,
  CalendarClock,
} from 'lucide-react';
import type { NavigationItem } from '../types/navigation';
import type { UserRole } from '../types/auth';

export const roleNavigationConfig: Record<UserRole, NavigationItem[]> = {
  admin: [
    {
      id: 'admin-revenue',
      label: 'Doanh thu',
      path: '/admin/revenue',
      icon: TrendingUp,
    },
    {
      id: 'admin-staff',
      label: 'Nhân viên',
      path: '/admin/staff',
      icon: Users,
    },
    {
      id: 'admin-service-packages',
      label: 'Gói dịch vụ',
      path: '/admin/service-packages',
      icon: Package,
    },
    {
      id: 'admin-skills',
      label: 'Kỹ năng',
      path: '/admin/skills',
      icon: Award,
    },
    {
      id: 'admin-projects',
      label: 'Dự án',
      path: '/admin/projects',
      icon: FolderKanban,
    },
  ],

  verificator: [
    {
      id: 'verificator-users-group',
      label: 'Người dùng',
      icon: Users,
      children: [
        {
          id: 'verificator-students',
          label: 'Sinh viên',
          path: '/verificator/students',
          icon: GraduationCap,
        },
        {
          id: 'verificator-companies',
          label: 'Công ty',
          path: '/verificator/companies',
          icon: Building2,
        },
      ],
    },
    {
      id: 'verificator-availability',
      label: 'Quản lý lịch trống',
      path: '/verificator/availability',
      icon: CalendarClock,
    },
    {
      id: 'verificator-projects',
      label: 'Dự án',
      path: '/verificator/projects',
      icon: FolderKanban,
    },
  ],

  moderator: [
    {
      id: 'moderator-projects',
      label: 'Dự án',
      path: '/moderator/projects',
      icon: FolderKanban,
    },
    {
      id: 'moderator-job-postings',
      label: 'Bài đăng tuyển dụng',
      path: '/moderator/job-postings',
      icon: Briefcase,
    },
    {
      id: 'moderator-career-profiles',
      label: 'Hồ sơ nghề nghiệp',
      path: '/moderator/career-profiles',
      icon: FileText,
    },
    {
      id: 'moderator-community-posts',
      label: 'Bài đăng cộng đồng',
      path: '/moderator/community-posts',
      icon: MessageSquare,
    },
    {
      id: 'moderator-advertisements',
      label: 'Quảng cáo',
      path: '/moderator/advertisements',
      icon: Megaphone,
    },
  ],
};

// Route mặc định khi đăng nhập theo vai trò
export const roleDefaultRoutes: Record<UserRole, string> = {
  admin: '/admin/revenue',
  verificator: '/verificator/availability',
  moderator: '/moderator/projects',
};

/**
 * Kiểm tra xem một đường dẫn có hợp lệ và người dùng thuộc vai trò này có quyền truy cập không.
 */
export const isPathAllowedForRole = (path: string, role: UserRole): boolean => {
  if (!path || path === '/' || path === '/login' || path === '/unauthorized') {
    return false;
  }
  // Tuyến đường phải bắt đầu bằng phân vùng tương ứng với role (vd: /moderator/...)
  return path === `/${role}` || path.startsWith(`/${role}/`);
};

/**
 * Phân giải đường dẫn điều hướng an toàn theo role:
 * Nếu đường dẫn yêu cầu (requestedPath) hợp lệ cho role đó thì ưu tiên giữ lại,
 * ngược lại luôn chuyển hướng về route mặc định của role đó.
 */
export const getRedirectPathForRole = (
  role: UserRole,
  requestedPath?: string | null
): string => {
  if (requestedPath && isPathAllowedForRole(requestedPath, role)) {
    return requestedPath;
  }
  return roleDefaultRoutes[role] || `/${role}`;
};
