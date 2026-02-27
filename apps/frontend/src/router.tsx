import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { StatsPage } from "./pages/StatsPage";
import { RiskDashboard } from "./pages/RiskDashboard";
import { RoadAccidentsPage } from "./pages/RoadAccidentsPage";
import { IncidentsModule } from "./pages/IncidentsModule";
import { AppLayout } from "./components/layout/AppLayout";
import { SectionErrorBoundary } from "./components/common/ErrorBoundary";
import { NotificationsPage } from "./pages/NotificationsPage";
import { LoginPage } from "./pages/LoginPage";
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
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.home]}>
          <SectionErrorBoundary sectionName="Dashboard Principal">
            <Dashboard />
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.dashboard]}>
          <SectionErrorBoundary sectionName="Dashboard">
            <Dashboard />
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
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
      path: "/alertas",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.alertas]}>
          <SectionErrorBoundary sectionName="Alertas">
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
      path: "/estadisticas",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.estadisticas]}>
          <AppLayout>
            <SectionErrorBoundary sectionName="Estadísticas">
              <StatsPage />
            </SectionErrorBoundary>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/riesgos",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.riesgos]}>
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
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.notificaciones]}>
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
      path: "*",
      element: (
        <ProtectedRoute requiredPermissions={[ROUTE_PERMISSIONS.home]}>
          <SectionErrorBoundary sectionName="Página no encontrada">
            <Dashboard />
          </SectionErrorBoundary>
        </ProtectedRoute>
      ),
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
