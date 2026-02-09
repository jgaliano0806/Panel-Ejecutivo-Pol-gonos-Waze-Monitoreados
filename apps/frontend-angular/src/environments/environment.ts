export const environment = {
  production: false,
  apiUrl: 'http://localhost:3002/api',
  socketUrl: 'http://localhost:3002',
  mapStyle: 'https://tiles.openfreemap.org/styles/liberty',
  refreshIntervals: {
    realTimeData: 30000, // 30 segundos
    globalKpis: 60000, // 1 minuto
    trafficMetrics: 45000, // 45 segundos
    alertStats: 30000, // 30 segundos
    historicalData: 300000, // 5 minutos
    trends: 120000, // 2 minutos
  },
  // SSO Configuration (set values in production environment)
  sso: {
    microsoft: {
      clientId: '', // Azure AD Application (client) ID
      tenantId: '', // Azure AD Directory (tenant) ID
    },
    google: {
      clientId: '', // Google OAuth Client ID
    },
  },
};
