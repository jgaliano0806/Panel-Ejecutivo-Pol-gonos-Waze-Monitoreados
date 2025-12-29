// Environment configurations
export const environments = {
  development: {
    port: 5173,
    apiUrl: 'http://localhost:3001',
    database: {
      host: 'localhost',
      port: 5432,
      name: 'panel_waze',
      user: 'postgres',
      password: 'postgres',
    },
    redis: {
      host: 'localhost',
      port: 6379,
    },
    external: {
      waze: {
        baseUrl: 'https://www.waze.com',
        partnerHub: 'https://web-assets.waze.com/webapps/partnerhub-web',
        sessionCookie: process.env.WAZE_SESSION_COOKIE,
      },
      accuweather: {
        baseUrl: 'http://dataservice.accuweather.com',
        apiKey: process.env.ACCUWEATHER_API_KEY,
      },
      openMeteo: {
        baseUrl: 'https://api.open-meteo.com',
      },
    },
    cache: {
      ttl: 300, // 5 minutes
      weatherTtl: 1800, // 30 minutes
    },
  },
  staging: {
    port: 5173,
    apiUrl: 'https://api-staging.panel-waze.com',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'panel_waze_staging',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    external: {
      waze: {
        baseUrl: 'https://www.waze.com',
        partnerHub: 'https://web-assets.waze.com/webapps/partnerhub-web',
        sessionCookie: process.env.WAZE_SESSION_COOKIE,
      },
      accuweather: {
        baseUrl: 'http://dataservice.accuweather.com',
        apiKey: process.env.ACCUWEATHER_API_KEY,
      },
      openMeteo: {
        baseUrl: 'https://api.open-meteo.com',
      },
    },
    cache: {
      ttl: 600, // 10 minutes
      weatherTtl: 3600, // 1 hour
    },
  },
  production: {
    port: 80,
    apiUrl: process.env.API_URL || 'https://api.panel-waze.com',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'panel_waze_prod',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    external: {
      waze: {
        baseUrl: 'https://www.waze.com',
        partnerHub: 'https://web-assets.waze.com/webapps/partnerhub-web',
        sessionCookie: process.env.WAZE_SESSION_COOKIE,
      },
      accuweather: {
        baseUrl: 'http://dataservice.accuweather.com',
        apiKey: process.env.ACCUWEATHER_API_KEY,
      },
      openMeteo: {
        baseUrl: 'https://api.open-meteo.com',
      },
    },
    cache: {
      ttl: 1800, // 30 minutes
      weatherTtl: 7200, // 2 hours
    },
  },
};

// Get current environment
export const getCurrentEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  return environments[env as keyof typeof environments] || environments.development;
};

// Application constants
export const constants = {
  app: {
    name: 'Panel Ejecutivo Waze',
    version: '2.0.0',
    description: 'Panel de monitoreo de tráfico en tiempo real',
  },
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
  database: {
    connectionTimeout: 10000,
    queryTimeout: 30000,
    poolSize: 10,
  },
  cache: {
    defaultTtl: 300,
    weatherTtl: 1800,
  },
  waze: {
    feedRefreshInterval: 120000, // 2 minutes
    autoCaptureEnabled: true,
    maxRetries: 3,
  },
  ui: {
    map: {
      defaultZoom: 12,
      maxZoom: 18,
      minZoom: 8,
    },
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
    },
  },
};

// Validation rules
export const validation = {
  coordinates: {
    lat: { min: -90, max: 90 },
    lng: { min: -180, max: 180 },
  },
  polygon: {
    minVertices: 3,
    maxVertices: 1000,
  },
  weather: {
    temperatureRange: { min: -50, max: 60 },
    precipitationRange: { min: 0, max: 500 },
  },
};

