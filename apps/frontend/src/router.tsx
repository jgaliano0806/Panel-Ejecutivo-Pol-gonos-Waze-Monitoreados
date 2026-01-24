import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { IncidentsHistoryPage } from "./pages/IncidentsHistoryPage";
import { StatsPage } from "./pages/StatsPage";
import { RiskDashboard } from "./pages/RiskDashboard";
import { RoadAccidentsPage } from "./pages/RoadAccidentsPage";
import { AppLayout } from "./components/layout/AppLayout";
import { SectionErrorBoundary } from "./components/common/ErrorBoundary";
import { NotificationsPage } from "./pages/NotificationsPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <SectionErrorBoundary sectionName="Dashboard Principal">
          <Dashboard />
        </SectionErrorBoundary>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <SectionErrorBoundary sectionName="Dashboard">
          <Dashboard />
        </SectionErrorBoundary>
      ),
    },
    {
      path: "/mapa",
      element: (
        <SectionErrorBoundary sectionName="Mapa">
          <Dashboard />
        </SectionErrorBoundary>
      ),
    },
    {
      path: "/alertas",
      element: (
        <SectionErrorBoundary sectionName="Alertas">
          <Dashboard />
        </SectionErrorBoundary>
      ),
    },
    {
      path: "/siniestros",
      element: (
        <AppLayout>
          <SectionErrorBoundary sectionName="Siniestros">
            <RoadAccidentsPage />
          </SectionErrorBoundary>
        </AppLayout>
      ),
    },
    {
      path: "/historial",
      element: (
        <AppLayout>
          <SectionErrorBoundary sectionName="Historial de Incidentes">
            <IncidentsHistoryPage />
          </SectionErrorBoundary>
        </AppLayout>
      ),
    },
    {
      path: "/estadisticas",
      element: (
        <AppLayout>
          <SectionErrorBoundary sectionName="Estadísticas">
            <StatsPage />
          </SectionErrorBoundary>
        </AppLayout>
      ),
    },
    {
      path: "/riesgos",
      element: (
        <AppLayout>
          <SectionErrorBoundary sectionName="Dashboard de Riesgos">
            <RiskDashboard />
          </SectionErrorBoundary>
        </AppLayout>
      ),
    },

    {
      path: "/notificaciones",
      element: (
        <AppLayout>
          <SectionErrorBoundary sectionName="Notificaciones">
            <NotificationsPage />
          </SectionErrorBoundary>
        </AppLayout>
      ),
    },
    {
      path: "*",
      element: (
        <SectionErrorBoundary sectionName="Página no encontrada">
          <Dashboard />
        </SectionErrorBoundary>
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
