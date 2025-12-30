---
description:
---

Operaciones de Redis cache
typescriptimport cacheService from './cacheService';

// Get con fallback
async function getWeather(lat: number, lon: number) {
  const key = `weather:${lat},${lon}`;
  let data = await cacheService.get(key);

  if (!data) {
    data = await openMeteoAPI.fetch(lat, lon);
    await cacheService.set(key, data, 300); // 5 min TTL
  }

  return data;
}

// Invalidar pattern
await cacheService.invalidate('waze:alerts:*');

// Batch set
await Promise.all(
  polygons.map(p =>
    cacheService.set(`polygon:${p.id}`, p, 3600)
  )
);
TTLs:

Waze: 60s
Weather: 300s
Scores: 120s
Polygons: 3600s
