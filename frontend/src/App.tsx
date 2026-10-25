import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { AdminOnly, PublicOnly, RequireSession, RequireTenant } from '@/auth/guards'
import { Loading } from '@/components/common/States'
import { RouteError } from '@/components/layout/RouteError'

// cada pantalla se descarga cuando se visita (la agenda pesa mas por el calendario)
const LandingPage = lazy(() => import('@/features/public/LandingPage'))
const LegalPage = lazy(() => import('@/features/public/LegalPage'))
const NotFoundPage = lazy(() => import('@/features/public/NotFoundPage'))
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage'))
const SelectBusinessPage = lazy(() => import('@/features/auth/SelectBusinessPage'))
const InvitationsPage = lazy(() => import('@/features/auth/InvitationsPage'))
const AppLayout = lazy(() => import('@/components/layout/AppLayout'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const AgendaPage = lazy(() => import('@/features/agenda/AgendaPage'))
const ClientsPage = lazy(() => import('@/features/clients/ClientsPage'))
const ClientDetailPage = lazy(() => import('@/features/clients/ClientDetailPage'))
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'))
const TeamPage = lazy(() => import('@/features/team/TeamPage'))
const TeamMemberPage = lazy(() => import('@/features/team/TeamMemberPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))

const page = (element: ReactNode) => <Suspense fallback={<Loading />}>{element}</Suspense>

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: page(<LandingPage />) },
      { path: '/legal/:pagina', element: page(<LegalPage />) },
      // enlaces de los correos: funcionan con o sin sesion
      { path: '/reset-password', element: page(<ResetPasswordPage />) },
      { path: '/verify-email', element: page(<VerifyEmailPage />) },
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', element: page(<LoginPage />) },
          { path: '/register', element: page(<RegisterPage />) },
          { path: '/forgot-password', element: page(<ForgotPasswordPage />) },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          { path: '/select-business', element: page(<SelectBusinessPage />) },
          { path: '/invitations', element: page(<InvitationsPage />) },
          {
            element: <RequireTenant />,
            children: [
              {
                path: '/app',
                element: page(<AppLayout />),
                children: [
                  { index: true, element: page(<DashboardPage />) },
                  { path: 'agenda', element: page(<AgendaPage />) },
                  { path: 'clients', element: page(<ClientsPage />) },
                  { path: 'clients/:clientId', element: page(<ClientDetailPage />) },
                  { path: 'catalog', element: page(<CatalogPage />) },
                  { path: 'team', element: page(<TeamPage />) },
                  { path: 'team/:membershipId', element: page(<TeamMemberPage />) },
                  {
                    path: 'settings',
                    element: page(
                      <AdminOnly>
                        <SettingsPage />
                      </AdminOnly>,
                    ),
                  },
                  { path: 'profile', element: page(<ProfilePage />) },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
