---
description: openmeteo-weather Fetch clima actual de Open-Meteo para polígonos
---

Implementar:

Service: openMeteoService.ts
Endpoint: https://api.open-meteo.com/v1/forecast
Params: latitude, longitude, current, hourly, timezone=auto
Variables: temperature_2m,precipitation,weather_code,wind_speed_10m,visibility
Cache: 300 seg (5 min)
Store tabla: polygon_weather_data
Detectar condiciones peligrosas: isDangerous()
WMO codes: 0=clear, 45=fog, 63=rain, 95=thunderstorm
NO API key requerida
Timeout: 5 seg

Condiciones críticas:

precipitation > 10mm/h
visibility < 1000m
wind_speed_10m > 60km/h
weather_code >= 71 (nieve/tormenta)

