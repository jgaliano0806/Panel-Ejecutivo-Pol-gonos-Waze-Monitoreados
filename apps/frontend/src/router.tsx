import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { IncidentsHistoryPage } from "./pages/IncidentsHistoryPage";
import { StatsPage } from "./pages/StatsPage";
import { RiskDashboard } from "./pages/RiskDashboard";
import { RoadAccidentsPage } from "./pages/RoadAccidentsPage";
import { AppLayout } from "./components/layout/AppLayout";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Dashboard />,
    },
    {
      path: "/dashboard",
      element: <Dashboard />,
    },
    {
      path: "/mapa",
      element: <Dashboard />,
    },
    {
      path: "/alertas",
      element: <Dashboard />,
    },
    {
      path: "/siniestros",
      element: (
        <AppLayout>
          <RoadAccidentsPage />
        </AppLayout>
      ),
    },
    {
      path: "/historial",
      element: (
        <AppLayout>
          <IncidentsHistoryPage />
        </AppLayout>
      ),
    },
    {
      path: "/estadisticas",
      element: (
        <AppLayout>
          <StatsPage />
        </AppLayout>
      ),
    },
    {
      path: "/riesgos",
      element: (
        <AppLayout>
          <RiskDashboard />
        </AppLayout>
      ),
    },

    {
      path: "*",
      element: <Dashboard />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
) as any;
