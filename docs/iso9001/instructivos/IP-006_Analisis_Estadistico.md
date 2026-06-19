# Instructivo IP-006: Análisis estadístico operativo

**Código:** SGC-PWY-IP-006  
**Proceso:** PRO-OP-006  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Supervisor  
**Permiso:** `incidents.view`

---

## 1. Objetivo

Realizar análisis periódico de tendencias, hotspots y disponibilidad de datos para la toma de decisiones operativas.

## 2. Frecuencia

| Análisis | Frecuencia |
|----------|------------|
| Revisión rápida | Diaria (5 min) |
| Informe de tendencias | Semanal |
| Revisión para dirección | Trimestral (input cláusula 9.3 ISO) |

## 3. Instructivo paso a paso

### Paso 1 — Acceder a estadísticas

1. Iniciar sesión con rol Supervisor
2. Navegar a `/estadisticas`
3. Esperar carga del dashboard analítico

### Paso 2 — Revisar tendencias

1. Seleccionar período: diario / semanal / mensual
2. Observar gráfico de evolución de incidentes
3. Identificar:
   - Picos anómalos
   - Tendencia creciente o decreciente
   - Correlación con eventos externos (clima, obras)

### Paso 3 — Analizar hotspots

1. Revisar sección de zonas de alta concentración
2. Anotar polígonos con mayor densidad de incidentes
3. Evaluar si requiere:
   - Nueva zona peligrosa (IP-007 + IP-003)
   - Ajuste de polígonos de monitoreo
   - Comunicación a operación vial

### Paso 4 — Verificar disponibilidad de datos

1. Revisar indicador de disponibilidad Waze
2. Si < 95%: investigar causa (feed caído, polígono mal configurado)
3. Escalar a GED si es falla técnica (IP-010)

### Paso 5 — Comparar grupos de polígonos

1. Seleccionar grupos de polígonos en filtros
2. Comparar métricas entre corredores
3. Identificar corredor con mayor criticidad

### Paso 6 — Elaborar informe

1. Documentar hallazgos en formato CASISA:

```
INFORME ESTADÍSTICO — Panel Waze
Período: ____/____/____ al ____/____/____
Elaborado por: ______________

1. Resumen ejecutivo (3 líneas)
2. Tendencia general: ▲ / ▼ / →
3. Hotspots identificados: [lista]
4. Disponibilidad datos: ___%
5. Recomendaciones: [acciones propuestas]
6. Próxima revisión: ____/____/____
```

2. Enviar a gerencia según calendario de revisión

## 4. Registro

- Informe guardado en carpeta de documentos CASISA
- Datos fuente: `/api/stats/daily|weekly|monthly`, `/api/historical/trends`

## 5. Desviaciones

| Situación | Acción |
|-----------|--------|
| Dashboard sin datos | Verificar `/health`; reportar IP-010 |
| Hotspot en zona sin polígono | Proponer nuevo polígono vía IP-007 |

---

**Aprobación:** _Pendiente_
