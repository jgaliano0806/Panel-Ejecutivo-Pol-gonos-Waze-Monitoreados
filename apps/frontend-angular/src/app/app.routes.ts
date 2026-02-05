import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'mapa',
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'riesgos',
    loadComponent: () =>
      import('./features/risk/risk-dashboard.component').then((m) => m.RiskDashboardComponent),
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./features/alerts/alerts-dashboard.component').then(
        (m) => m.AlertsDashboardComponent,
      ),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
  {
    path: 'siniestros',
    loadComponent: () =>
      import('./features/accidents/accidents.component').then((m) => m.AccidentsComponent),
  },
  {
    path: 'incidentes',
    loadComponent: () =>
      import('./features/alerts/alerts-dashboard.component').then(
        (m) => m.AlertsDashboardComponent,
      ),
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./features/accidents/accidents.component').then((m) => m.AccidentsComponent),
  },
  {
    path: 'estadisticas',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
