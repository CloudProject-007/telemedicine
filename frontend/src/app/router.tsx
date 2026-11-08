import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { PublicShell } from '@/components/layout/public-shell';
import { GuestOnly, RequireAuth, RoleOnly } from './guards';
import { NotFoundPage } from './not-found';

/** Pages load on demand, so each role only downloads its own screens. */
const page =
  <T,>(load: () => Promise<T>, pick: (module: T) => ComponentType): RouteObject['lazy'] =>
  async () => ({ Component: pick(await load()) });

const patientRoutes: RouteObject[] = [
  {
    path: '/doctors',
    lazy: page(
      () => import('@/features/doctors/doctors-page'),
      (m) => m.DoctorsPage,
    ),
  },
  {
    path: '/doctors/:id',
    lazy: page(
      () => import('@/features/doctors/doctor-detail-page'),
      (m) => m.DoctorDetailPage,
    ),
  },
  {
    path: '/appointments',
    lazy: page(
      () => import('@/features/appointments/appointments-page'),
      (m) => m.AppointmentsPage,
    ),
  },
  {
    path: '/documents',
    lazy: page(
      () => import('@/features/documents/documents-page'),
      (m) => m.DocumentsPage,
    ),
  },
];

const doctorRoutes: RouteObject[] = [
  {
    path: '/doctor',
    lazy: page(
      () => import('@/features/doctor/schedule-page'),
      (m) => m.SchedulePage,
    ),
  },
  {
    path: '/doctor/slots',
    lazy: page(
      () => import('@/features/doctor/slots-page'),
      (m) => m.SlotsPage,
    ),
  },
  {
    path: '/doctor/profile',
    lazy: page(
      () => import('@/features/doctor/profile-page'),
      (m) => m.ProfilePage,
    ),
  },
];

/** The room is shared: only the appointment's patient and doctor can open it (the API enforces that). */
const sharedRoutes: RouteObject[] = [
  {
    path: '/consultations/:appointmentId',
    lazy: page(
      () => import('@/features/consultation/consultation-page'),
      (m) => m.ConsultationPage,
    ),
  },
  {
    path: '/settings/notifications',
    lazy: page(
      () => import('@/features/notifications/notification-settings-page'),
      (m) => m.NotificationSettingsPage,
    ),
  },
];

const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    lazy: page(
      () => import('@/features/admin/overview-page'),
      (m) => m.OverviewPage,
    ),
  },
  {
    path: '/admin/doctors',
    lazy: page(
      () => import('@/features/admin/doctors-admin-page'),
      (m) => m.DoctorsAdminPage,
    ),
  },
  {
    path: '/admin/doctors/new',
    lazy: page(
      () => import('@/features/admin/create-doctor-page'),
      (m) => m.CreateDoctorPage,
    ),
  },
  {
    path: '/admin/appointments',
    lazy: page(
      () => import('@/features/admin/appointments-admin-page'),
      (m) => m.AppointmentsAdminPage,
    ),
  },
];

export const router = createBrowserRouter([
  {
    element: <PublicShell />,
    children: [
      {
        path: '/',
        lazy: page(
          () => import('@/features/landing/landing-page'),
          (m) => m.LandingPage,
        ),
      },
    ],
  },
  {
    element: <GuestOnly />,
    children: [
      {
        path: '/login',
        lazy: page(
          () => import('@/features/auth/login-page'),
          (m) => m.LoginPage,
        ),
      },
      {
        path: '/register',
        lazy: page(
          () => import('@/features/auth/register-page'),
          (m) => m.RegisterPage,
        ),
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { element: <RoleOnly roles={['PATIENT']} />, children: patientRoutes },
          { element: <RoleOnly roles={['DOCTOR']} />, children: doctorRoutes },
          { element: <RoleOnly roles={['ADMIN']} />, children: adminRoutes },
          { element: <RoleOnly roles={['PATIENT', 'DOCTOR']} />, children: sharedRoutes },
        ],
      },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);
