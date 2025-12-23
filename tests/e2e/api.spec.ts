import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

test.describe('Backend API Tests', () => {
  test.describe('Health Check', () => {
    test('GET /health should return status ok', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('memory');
    });
  });

  test.describe('Polygons API', () => {
    test('GET /api/polygons should return array', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/polygons`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('GET /api/polygons should have correct structure', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE}/api/polygons`);
      const data = await response.json();

      if (data.length > 0) {
        const polygon = data[0];
        expect(polygon).toHaveProperty('id');
        expect(polygon).toHaveProperty('name');
        expect(polygon).toHaveProperty('group');
      }
    });
  });

  test.describe('Incidents API', () => {
    test('GET /api/incidents/all should return array', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/incidents/all`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Jams API', () => {
    test('GET /api/jams/all should return array', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/jams/all`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Alerts API', () => {
    test('GET /api/alerts/active should return array', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/alerts/active`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('GET /api/alerts/stats should return stats object', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE}/api/alerts/stats`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('bySeverity');
    });
  });

  test.describe('KPIs API', () => {
    test('GET /api/kpis/global should return KPIs', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/kpis/global`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('fluidityPercentage');
      expect(data).toHaveProperty('activeIncidents');
    });
  });

  test.describe('Historical API', () => {
    test('GET /api/historical/global should return data', async ({
      request,
    }) => {
      const response = await request.get(
        `${API_BASE}/api/historical/global?hours=24`
      );

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('Invalid endpoint should return 404', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/nonexistent`);

      expect(response.status()).toBe(404);
    });

    test('Invalid polygon ID should handle gracefully', async ({ request }) => {
      const response = await request.get(
        `${API_BASE}/api/polygons/invalid-id-12345`
      );

      // Should return 404 or empty data, not 500
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Performance', () => {
    test('API should respond within 5 seconds', async ({ request }) => {
      const start = Date.now();

      await request.get(`${API_BASE}/api/polygons`);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    test('Multiple concurrent requests should succeed', async ({ request }) => {
      const requests = [
        request.get(`${API_BASE}/api/polygons`),
        request.get(`${API_BASE}/api/incidents/all`),
        request.get(`${API_BASE}/api/jams/all`),
        request.get(`${API_BASE}/api/alerts/active`),
        request.get(`${API_BASE}/api/kpis/global`),
      ];

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.ok()).toBeTruthy();
      });
    });
  });
});




