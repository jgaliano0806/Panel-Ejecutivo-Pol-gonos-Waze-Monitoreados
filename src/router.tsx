import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { IncidentsHistoryPage } from './pages/IncidentsHistoryPage';
import { StatsPage } from './pages/StatsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/mapa',
    element: <Dashboard />,
  },
  {
    path: '/alertas',
    element: <Dashboard />,
  },
  {
    path: '/historial',
    element: <IncidentsHistoryPage />,
  },
  {
    path: '/estadisticas',
    element: <StatsPage />,
  },
  {
    path: '*',
    element: <Dashboard />,
  },
]);




