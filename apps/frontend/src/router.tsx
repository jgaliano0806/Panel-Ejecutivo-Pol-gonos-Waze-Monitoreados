import { createBrowserRouter, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { RiskDashboard } from "./pages/RiskDashboard";
import { RoadAccidentsPage } from "./pages/RoadAccidentsPage";
import { IncidentsModule } from "./pages/IncidentsModule";
import { AppLayout } from "./components/layout/AppLayout";
import { SectionErrorBoundary } from "./components/common/ErrorBoundary";
import { NotificationsPage } from "./pages/NotificationsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ROUTE_PERMISSIONS } from "./config/routePermissions";

export const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: (
        <SectionErrorBoundary sectionName="Login">
          <LoginPage />
        </SectionErrorBoundary>
      ),
    },
    {
      path: "/",
      element: <Navigate to="/mapa" replace />,
    },
    {
      path: "/dashboard",
      element: <Navigate to="/mapa" replace />,
    },
    {
      path: "/mapa",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.mapa]}>
          <SectionErrorBoundary sectionName="Mapa">
            <Dashboard />
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
              <RoadAccidentsPage />
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/riesgos",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.mapa]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Dashboard de Riesgos">
              <RiskDashboard />
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
              <NotificationsPage />
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/incidentes",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.incidentes]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Módulo de Incidentes">
              <IncidentsModule />
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
            <Dashboard />
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/perfil",
      element: (
        <ProtectedRoute>
          <SectionErrorBoundary sectionName="Perfil">
            <ProfilePage />
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
