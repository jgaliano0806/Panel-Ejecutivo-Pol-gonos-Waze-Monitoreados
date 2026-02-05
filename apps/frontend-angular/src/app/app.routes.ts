import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'mapa',
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
