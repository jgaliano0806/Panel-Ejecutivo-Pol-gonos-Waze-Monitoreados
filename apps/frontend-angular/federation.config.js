const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'shell',

  // Exponer módulos para Federation
  exposes: {
    './MapComponent': './src/app/features/map/map.component.ts',
    './DashboardComponent': './src/app/features/dashboard/dashboard.component.ts',
    './AdminComponent': './src/app/features/admin/admin.component.ts',
    './NotificationsComponent': './src/app/features/notifications/notifications.component.ts',
  },

  // Módulos compartidos - singleton para evitar duplicación
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
    }),
  },

  // Omitir dependencias que causan problemas
  skip: [
    'zone.js', // Zone.js maneja su propio loading
  ],
});
