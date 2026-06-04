import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { SectionErrorBoundary } from "./components/common/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ROUTE_PERMISSIONS } from "./config/routePermissions";

// Code-splitting por ruta — cada página es un chunk independiente
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RoadAccidentsPage = lazy(() =>
  import("./pages/RoadAccidentsPage").then((m) => ({
    default: m.RoadAccidentsPage,
  })),
);
const IncidentsModule = lazy(() =>
  import("./pages/IncidentsModule").then((m) => ({
    default: m.IncidentsModule,
  })),
);
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const StatsPage = lazy(() =>
  import("./pages/StatsPage").then((m) => ({ default: m.StatsPage })),
);
const IncidentsHistoryPage = lazy(() =>
  import("./pages/IncidentsHistoryPage").then((m) => ({
    default: m.IncidentsHistoryPage,
  })),
);

const PageFallback = () => (
  <div
    className="flex items-center justify-center min-h-[60vh]"
    role="status"
    aria-live="polite"
  >
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
    <span className="sr-only">Cargando…</span>
  </div>
);

const withSuspense = (el: React.ReactNode) => (
  <Suspense fallback={<PageFallback />}>{el}</Suspense>
);

export const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: (
        <SectionErrorBoundary sectionName="Login">
          {withSuspense(<LoginPage />)}
        </SectionErrorBoundary>
      ),
    },
    {
      path: "/",
      element: <Navigate to="/mapa" replace />,
    },
    {
      path: "/dashboard",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.mapa]}>
          <SectionErrorBoundary sectionName="Inicio">
            {withSuspense(<Dashboard />)}
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/mapa",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.mapa]}>
          <SectionErrorBoundary sectionName="Mapa">
            {withSuspense(<Dashboard />)}
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/siniestros",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.siniestros]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Siniestros">
              {withSuspense(<RoadAccidentsPage />)}
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/notificaciones",
      element: (
        <ProtectedRoute
          requiredPermissions={[ROUTE_PERMISSIONS.notificaciones]}
        >
          <AppLayout>
            <SectionErrorBoundary sectionName="Notificaciones">
              {withSuspense(<NotificationsPage />)}
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/zonas-peligrosas",
      element: (
        <ProtectedRoute
          requiredPermissions={[ROUTE_PERMISSIONS.zonasPeligrosas]}
        >
          <SectionErrorBoundary sectionName="Zonas peligrosas">
            {withSuspense(<Dashboard />)}
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/incidentes",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.incidentes]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Módulo de Incidentes">
              {withSuspense(<IncidentsModule />)}
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/incidentes/historico",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.incidentes]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Histórico de Incidentes">
              {withSuspense(<IncidentsHistoryPage />)}
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/estadisticas",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.incidentes]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Estadísticas">
              {withSuspense(<StatsPage />)}
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.admin]}>
          <SectionErrorBoundary sectionName="Administración">
            {withSuspense(<Dashboard />)}
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/perfil",
      element: (
        <ProtectedRoute>
          <SectionErrorBoundary sectionName="Perfil">
            {withSuspense(<ProfilePage />)}
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "*",
      element: <Navigate to="/mapa" replace />,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
) as ReturnType<typeof createBrowserRouter>;
