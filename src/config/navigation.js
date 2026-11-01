import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  School,
  UserCog,
  Users,
  Wallet,
  FileText,
} from 'lucide-react';
import { ROLES } from '../utils/roles';

// One list per role drives the sidebar, the quick links and the "coming soon"
// pages. `ready: false` marks screens that are not built yet.
//
// This only controls what is *shown*. Hiding a link never protects data: the
// backend must authorise every request by the signed-in user's role.
export const NAVIGATION = {
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, ready: true },
    {
      to: '/admin/pupils',
      label: 'Pupil records',
      ready: true,
      icon: Users,
      description: 'Admissions, profiles, guardians and class lists for every pupil.',
    },
    {
      to: '/admin/classes',
      label: 'Classes',
      icon: School,
      description: 'Create classes, assign class teachers and manage class lists.',
    },
    {
      to: '/admin/staff',
      label: 'Staff',
      icon: UserCog,
      description: 'Staff accounts, roles and class assignments.',
    },
    {
      to: '/admin/fees',
      label: 'Fees',
      icon: Wallet,
      description: 'Fee schedules, payments received, balances and receipts.',
    },
    {
      to: '/admin/results',
      label: 'Results',
      icon: GraduationCap,
      ready: true,
      description: 'Review submitted scores, approve results and publish report cards.',
    },
    {
      to: '/admin/attendance',
      label: 'Attendance',
      icon: ClipboardCheck,
      ready: true,
      description: 'Take or correct the daily register for any class.',
    },
    {
      to: '/admin/announcements',
      label: 'Notices',
      icon: Megaphone,
      ready: true,
      description: 'Write notices and choose who sees them.',
    },
  ],
  [ROLES.TEACHER]: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true, ready: true },
    {
      to: '/teacher/classes',
      label: 'My classes',
      icon: School,
      description: 'Class lists and pupil profiles for the classes you teach.',
    },
    {
      to: '/teacher/attendance',
      label: 'Attendance',
      icon: ClipboardCheck,
      ready: true,
      description: 'Take the daily register and review attendance history.',
    },
    {
      to: '/teacher/results',
      label: 'Results',
      icon: GraduationCap,
      ready: true,
      description: 'Enter continuous assessment and exam scores for your subjects.',
    },
    {
      to: '/teacher/homework',
      label: 'Homework',
      icon: NotebookPen,
      description: 'Set homework, attach instructions and track submissions.',
    },
    {
      to: '/teacher/announcements',
      label: 'Announcements',
      icon: Megaphone,
      ready: true,
      description: 'Read school notices and post notices to your class.',
    },
  ],
  [ROLES.PARENT]: [
    { to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true, ready: true },
    {
      to: '/parent/results',
      label: 'Results',
      icon: GraduationCap,
      description: 'Full term results and downloadable report cards for each child.',
    },
    {
      to: '/parent/attendance',
      label: 'Attendance',
      icon: ClipboardCheck,
      description: 'Day-by-day attendance history for each child.',
    },
    {
      to: '/parent/fees',
      label: 'Fees',
      icon: Wallet,
      description: 'Fee invoices, payment history and receipts.',
    },
    {
      to: '/parent/homework',
      label: 'Homework',
      icon: NotebookPen,
      description: 'All homework set for your children, with due dates.',
    },
    {
      to: '/parent/timetable',
      label: 'Timetable',
      icon: CalendarDays,
      description: 'The full weekly timetable for each child.',
    },
  ],
  [ROLES.STUDENT]: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true, ready: true },
    {
      to: '/student/results',
      label: 'My results',
      icon: GraduationCap,
      description: 'Your scores and report cards for each term.',
    },
    {
      to: '/student/timetable',
      label: 'Timetable',
      icon: CalendarDays,
      description: 'Your lessons for the week.',
    },
    {
      to: '/student/homework',
      label: 'Homework',
      icon: BookOpen,
      description: 'Homework you need to do, with due dates.',
    },
    {
      to: '/student/attendance',
      label: 'Attendance',
      icon: FileText,
      description: 'Your attendance record.',
    },
  ],
};

export function navFor(role) {
  return NAVIGATION[role] ?? [];
}

export function findNavItem(role, pathname) {
  const clean = pathname.replace(/\/+$/, '');
  return navFor(role).find((item) => item.to === clean);
}
