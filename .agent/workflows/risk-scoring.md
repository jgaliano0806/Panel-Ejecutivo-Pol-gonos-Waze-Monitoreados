---
description: risk-scoring Calcular score de riesgo 0-100 con factores ponderados
---

Factores:

Tráfico (25%): jams count, avg level, standstill traffic
Incidentes (30%): total alerts, critical types, road closures
Clima (20%): precipitation, visibility, dangerous codes
Velocidad (15%): avg speed, fluency
Demoras (10%): total delays, avg delay

Niveles:

0-20: LOW (verde)
21-40: MODERATE (amarillo)
41-60: HIGH (naranja)
61-80: CRITICAL (rojo)
81-100: SEVERE (rojo oscuro)

Store en: polygon_criticality_scores
Vista materializada: latest_polygon_risk_scores
