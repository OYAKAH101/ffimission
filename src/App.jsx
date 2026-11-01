import { Route, Routes } from 'react-router-dom';
import { ROLES } from './utils/roles';
import { HomeRedirect, RequireAuth, RequireRole } from './routes/guards';
import ScrollToTop from './routes/ScrollToTop';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AdminPupilsPage from './pages/admin/AdminPupilsPage';
import AdminNoticesPage from './pages/admin/AdminNoticesPage';
import ResultsEntryPage from './pages/records/ResultsEntryPage';
import AttendancePage from './pages/records/AttendancePage';
import ClassNoticesPage from './pages/records/ClassNoticesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import StudentDashboard from './pages/student/StudentDashboard';

const DASHBOARDS = [
  { role: ROLES.ADMIN, path: '/admin', element: <AdminDashboard />, extra: [
    { path: 'pupils', element: <AdminPupilsPage /> },
    { path: 'announcements', element: <AdminNoticesPage /> },
    { path: 'results', element: <ResultsEntryPage isAdmin /> },
    { path: 'attendance', element: <AttendancePage /> },
  ] },
  { role: ROLES.TEACHER, path: '/teacher', element: <TeacherDashboard />, extra: [
    { path: 'results', element: <ResultsEntryPage /> },
    { path: 'attendance', element: <AttendancePage /> },
    { path: 'announcements', element: <ClassNoticesPage /> },
  ] },
  { role: ROLES.PARENT, path: '/parent', element: <ParentDashboard /> },
  { role: ROLES.STUDENT, path: '/student', element: <StudentDashboard /> },
];

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          {DASHBOARDS.map(({ role, path, element, extra = [] }) => (
            <Route key={role} element={<RequireRole role={role} />}>
              <Route path={path} element={<DashboardLayout />}>
                <Route index element={element} />
                {extra.map((item) => (
                  <Route key={item.path} path={item.path} element={item.element} />
                ))}
                <Route path="*" element={<ComingSoonPage />} />
              </Route>
            </Route>
          ))}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
