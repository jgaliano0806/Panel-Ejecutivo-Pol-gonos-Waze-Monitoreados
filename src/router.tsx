import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

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
    element: <Dashboard />, // Por ahora usa el mismo componente
  },
  {
    path: '/alertas',
    element: <Dashboard />, // Por ahora usa el mismo componente
  },
  {
    path: '*',
    element: <Dashboard />, // Redirige cualquier ruta no encontrada al dashboard
  },
]);




