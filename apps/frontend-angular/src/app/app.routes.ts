import { Routes } from '@angular/router';
import { authGuard, publicGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
    canActivate: [publicGuard],
  },

  // Protected routes
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'mapa',
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
    canActivate: [authGuard],
  },
  {
    path: 'riesgos',
    loadComponent: () =>
      import('./features/risk/risk-dashboard.component').then((m) => m.RiskDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./features/alerts/alerts-dashboard.component').then(
        (m) => m.AlertsDashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'siniestros',
    loadComponent: () =>
      import('./features/accidents/accidents.component').then((m) => m.AccidentsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'incidentes',
    loadComponent: () =>
      import('./features/incidents/incidents.component').then((m) => m.IncidentsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./features/history/history.component').then((m) => m.HistoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'estadisticas',
    loadComponent: () =>
      import('./features/statistics/statistics.component').then((m) => m.StatisticsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [authGuard, roleGuard(['admin', 'supervisor'])],
  },

  // Wildcard
  {
    path: '**',
    redirectTo: 'login',
  },
];
