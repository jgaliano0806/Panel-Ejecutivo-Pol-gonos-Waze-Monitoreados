---
description: waze-feed Poll Waze Traffic Feed cada 2 min y almacenar en DB
---

waze-feed
Poll Waze Traffic Feed cada 2 min y almacenar en DB
Implementar:

Service: wazePollingService.ts
Poll URL: https://www.waze.com/partnerhub-api/partners/11387019565/waze-feeds/{token}?format=1
Parsear: alerts, jams, irregularities
Filtrar por polígonos (point-in-polygon)
Store en tablas: waze_alerts, waze_jams, waze_irregularities
Emitir WebSocket: io.to('polygon:id').emit('waze:update', data)
Invalidar cache: waze:*:polygonId
Rate limit: máx 1 req/seg
Interval: 120000ms (2 min)
Error handling + retry logic

Tipos:
typescriptinterface WazeAlert {
  uuid: string;
  type: 'ACCIDENT'|'JAM'|'WEATHERHAZARD'|'HAZARD'|'ROAD_CLOSED';
  subtype: string;
  location: {x: number; y: number};
  street: string;
  pubMillis: number;
  reliability: number;  // 0-10
  confidence: number;   // 0-10
}
