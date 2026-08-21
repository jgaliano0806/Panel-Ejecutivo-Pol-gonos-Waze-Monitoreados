import type { Page, Route } from "@playwright/test";

/** PNG 1x1 transparente — evita errores de red al cargar tiles del mapa */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export const MOCK_TOKEN = "e2e-mock-token-abc123";

export const MOCK_USER = {
  id: 1,
  email: "admin@casisa.com",
  firstName: "Admin",
  lastName: "CASISA",
  phone: null,
  isActive: true,
  emailVerified: true,
  lastLogin: new Date().toISOString(),
  mustChangePassword: false,
  avatarUrl: null,
  roles: [{ id: 1, name: "Administrador", color: "#22c55e" }],
  permissions: ["admin"],
};

const MOCK_POLYGONS = [
  {
    id: "poly-apc",
    name: "APC",
    group: "Corredor",
    state: "low" as const,
    metrics: {
      alertCount: 2,
      jamCount: 1,
      totalDelay: 5,
      avgSpeed: 60,
      criticalAlerts: 0,
    },
  },
];

const MOCK_KPIS = {
  fluidityPercentage: 85,
  activeIncidents: 2,
  activeJams: 1,
  criticalPolygons: 0,
  activeConstructions: 0,
  trends: { fluidityChange: 0, incidentsChange: 0 },
};

const MOCK_ALERT_STATS = {
  total: 0,
  active: 0,
  acknowledged: 0,
  bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
  byType: {
    totalBlockage: 0,
    excessiveDelay: 0,
    significantDelay: 0,
    extensiveCongestion: 0,
    highUserImpact: 0,
  },
};

const MOCK_INCIDENTS = [
  {
    id: "inc-1",
    polygonId: "poly-apc",
    type: "accident",
    subtype: "ACCIDENT_MAJOR",
    severity: 3,
    description: "Accidente mayor",
    timestamp: new Date().toISOString(),
    location: { lat: -31.4135, lng: -64.1811 },
    street: "Colectora",
  },
];

export const MOCK_ACCIDENTS = [
  {
    id: "acc-grave-1",
    incident_id: "waze-1",
    type: "ACCIDENT",
    subtype: "ACCIDENT_MAJOR",
    severity: 5,
    street: "Av. Circunvalación",
    location_lat: -31.4201,
    location_lng: -64.1888,
    accident_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    polygon_id: "poly-apc",
    weather_data: {},
    waze_data: {},
  },
  {
    id: "acc-mod-1",
    incident_id: "waze-2",
    type: "ACCIDENT",
    subtype: "NO_SUBTYPE",
    severity: 3,
    street: "Ruta 9",
    location_lat: -31.4301,
    location_lng: -64.1988,
    accident_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    polygon_id: "poly-apc",
    weather_data: {},
    waze_data: {},
  },
  {
    id: "acc-leve-1",
    incident_id: "waze-3",
    type: "ACCIDENT",
    subtype: "ACCIDENT_MINOR",
    severity: 1,
    street: "Calle San Martín",
    location_lat: -31.4101,
    location_lng: -64.1788,
    accident_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    polygon_id: null,
    weather_data: {},
    waze_data: {},
  },
];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function apiWrapped(route: Route, data: unknown) {
  return json(route, { success: true, data });
}

/**
 * Mocks alineados con contratos reales del panel.
 * Playwright evalúa handlers en orden inverso al registro: los específicos van AL FINAL.
 */
export async function setupApiMocks(page: Page) {
  await page.route("**/api/**", (route) => json(route, []));

  await page.route("**/api/auth/login", (route) =>
    apiWrapped(route, { token: MOCK_TOKEN, user: MOCK_USER }),
  );

  await page.route("**/api/auth/me", (route) => apiWrapped(route, MOCK_USER));

  await page.route("**/api/auth/logout", (route) =>
    apiWrapped(route, { ok: true }),
  );

  await page.route("**/api/zonas-peligrosas**", (route) => apiWrapped(route, []));

  await page.route("**/api/polygons**", (route) => json(route, MOCK_POLYGONS));

  await page.route("**/api/kpis/global**", (route) => json(route, MOCK_KPIS));

  await page.route("**/api/incidents/all**", (route) => json(route, MOCK_INCIDENTS));

  await page.route("**/api/incidents?**", (route) => apiWrapped(route, []));

  await page.route("**/api/jams/all**", (route) => json(route, []));

  await page.route("**/api/traffic-metrics**", (route) => json(route, []));

  await page.route("**/api/tvt-metrics**", (route) => json(route, []));

  await page.route("**/api/alerts**", (route) => json(route, []));

  await page.route("**/api/alerts/stats**", (route) =>
    json(route, MOCK_ALERT_STATS),
  );

  await page.route("**/api/historical/**", (route) => json(route, []));

  await page.route("**/api/kilometers**", (route) => json(route, { data: [] }));

  await page.route("**/api/accidents?**", (route) =>
    json(route, {
      data: MOCK_ACCIDENTS,
      total: MOCK_ACCIDENTS.length,
    }),
  );

  await page.route("**/api/accidents/*", (route) => {
    const id = route.request().url().split("/").pop()?.split("?")[0];
    const found = MOCK_ACCIDENTS.find((a) => a.id === id) ?? MOCK_ACCIDENTS[0];
    return json(route, { ...found, media: [] });
  });

  await page.route("**/api/incidents/blocking-analysis**", (route) =>
    json(route, {
      count: 1,
      analyses: [
        {
          incident: {
            id: "inc-1",
            type: "accident",
            subtype: "ACCIDENT_MAJOR",
            street: "Colectora",
            location: { lat: -31.4135, lng: -64.1811 },
          },
          polygonName: "APC",
          reportCount: 5,
        },
      ],
      summary: {
        totalIncidents: 1,
        totalReports: 5,
        duplicatesRemoved: 0,
        totalDelayMinutes: 10,
        avgConfidence: 7,
      },
    }),
  );

  await page.route("**/tiles/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: TINY_PNG,
    }),
  );

  await page.route("**/socket.io/**", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
}

export async function seedAuthToken(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate((token) => {
    localStorage.setItem("panel_waze_auth_token", token);
  }, MOCK_TOKEN);
}
