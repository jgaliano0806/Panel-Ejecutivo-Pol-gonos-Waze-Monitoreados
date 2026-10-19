# Instructivos de Procesos Operativos (IP)

Instrucciones de trabajo detalladas para ejecutar cada proceso operativo del Panel Ejecutivo Waze. Cada instructivo complementa un proceso **PRO-OP-00X** del [Manual de Procesos](../MANUAL_PROCESOS.md) y se vincula a un registro **RP-00X** de evidencia.

**Código maestro:** SGC-PWY-IP-SERIE  
**Versión:** 1.0 (paquete SGC v1.5)  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 8.5.1 — Producción y provisión del servicio

---

## Relación con el Manual de Procesos

| Instructivo | Proceso | Manual de Procesos |
|-------------|---------|------------------|
| [IP-001](./IP-001_Monitoreo_Tiempo_Real.md) | Monitoreo de tráfico en tiempo real | PRO-OP-001 |
| [IP-002](./IP-002_Gestion_Alertas.md) | Gestión de alertas y notificaciones | PRO-OP-002 |
| [IP-003](./IP-003_Zonas_Peligrosas.md) | Respuesta a zonas peligrosas | PRO-OP-003 |
| [IP-004](./IP-004_Registro_Siniestros.md) | Registro de siniestros viales | PRO-OP-004 |
| [IP-005](./IP-005_Consulta_Incidentes.md) | Consulta de incidentes e histórico | PRO-OP-005 |
| [IP-006](./IP-006_Analisis_Estadistico.md) | Análisis estadístico operativo | PRO-OP-006 |
| [IP-007](./IP-007_Administracion_Sistema.md) | Administración del sistema | PRO-OP-007 |
| [IP-008](./IP-008_Gestion_Usuarios.md) | Gestión de usuarios y accesos | PRO-OP-008 |
| [IP-009](./IP-009_Inicio_Cierre_Turno.md) | Inicio y cierre de turno | PRO-OP-009 |
| [IP-010](./IP-010_Incidencias_Operativas.md) | Gestión de incidencias operativas | PRO-OP-010 |

---

## Indicadores vinculados

| Instructivo | Indicador | Meta |
|-------------|-----------|------|
| IP-001 | IP-01 — Actualización de datos en mapa | ≤ 30 s |
| IP-002 | IP-02 — Alertas atendidas | ≥ 95% en < 2 min |
| IP-003 | IP-03 — Respuesta zona peligrosa | ≤ 5 s |
| IP-004 | IP-04 — Siniestros con clima histórico | ≥ 90% |
| IP-009 | IP-05 — Turnos con audio habilitado | 100% |
| IP-010 | IP-06 — NC críticas abiertas > 48 h | 0 |

---

## Generación de PDF

```powershell
npm run docs:iso-pdf-instructivos
```

Salida: `docs/iso9001/INSTRUCTIVOS_PROCESOS.pdf`

Incluidos en `npm run docs:iso-pdf` (paquete completo). Publicación en G.E.D: `npm run docs:iso-publish`.

## Registros de evidencia vinculados

Cada instructivo tiene un registro de proceso (RP) asociado para documentar la ejecución:

| Instructivo | Registro |
|-------------|----------|
| IP-001 … IP-010 | [RP-001 … RP-010](../registros/README.md) |

Ver [registros/](../registros/README.md) para las plantillas completas.
