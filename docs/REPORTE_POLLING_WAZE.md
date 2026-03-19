# Reporte: Polling de Waze

## Estado actual

### ✅ Funcionando
- **WazePollingService** se inicia correctamente al arrancar el backend
- **66 polígonos** configurados en `REAL_POLYGONS` (realPolygons.ts)
- **Intervalos:** Feeds cada 30s, TVT cada 60s
- **GeoReferenceService:** 994 hitos kilométricos cargados
- **Cache de polígonos:** 67 entradas
- **Primer ciclo:** Guardó datos (2+3+1+1+2+5+1 alerts, jams)

### ❌ Problema detectado
**Timeout de conexión a PostgreSQL** durante el polling:

```
timeout exceeded when trying to connect
```

- **Afecta:** `waze_tvt_metrics`, `polygon_weather_data`, `waze_alerts`, `waze_jams`
- **Consecuencia:** "Skipping poll cycle: previous cycle still running" (ciclo anterior bloqueado)
- **Causa probable:** Pool de conexiones agotado o PostgreSQL lento al aceptar conexiones bajo carga (66 feeds + clima + TVT en paralelo)

## Configuración actual

| Parámetro | Valor |
|-----------|-------|
| DB_POOL_MAX | 50 |
| connectionTimeoutMillis | 15000 (15s) |
| POLLING_INTERVAL_MS | 30000 (30s) |
| TVT_INTERVAL_MS | 60000 (60s) |

## Recomendaciones

1. ~~**Aumentar connectionTimeoutMillis**~~ ✅ Hecho: 30s en dbService
2. ~~**Verificar PostgreSQL**~~ ✅ `max_connections = 100` en postgresql.conf
3. ~~**DB_POOL_MAX**~~ ✅ Aumentado a 80 en .env
4. **Monitorizar:** Revisar `logs/backend-stderr.log` tras reiniciar

## Rutas actualizadas

- **AppDirectory:** `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\backend`
- **Logs:** `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\`
