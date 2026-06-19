# Registros de Procesos Operativos (RP)

Plantillas de registro para documentar la **evidencia de ejecución** de cada proceso operativo del Panel Ejecutivo Waze. Cada RP complementa un instructivo **IP-00X** y un proceso **PRO-OP-00X**.

**Código maestro:** SGC-PWY-RP-SERIE  
**Versión:** 1.0 (paquete SGC v1.5)  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 7.5.2, 8.5.1 — Información documentada y registros

---

## Definición

Un **registro de proceso (RP)** es un formulario que se completa al ejecutar un proceso y constituye evidencia auditable. Los registros **no se modifican** después de su cierre; las correcciones se documentan en un registro nuevo.

---

## Índice de registros

| Registro | Proceso | Instructivo | Indicador | Retención |
|----------|---------|-------------|-----------|-----------|
| [RP-001](./RP-001_Registro_Monitoreo.md) | PRO-OP-001 | IP-001 | IP-01 | 90 días |
| [RP-002](./RP-002_Registro_Alertas.md) | PRO-OP-002 | IP-002 | IP-02 | 90 días |
| [RP-003](./RP-003_Registro_Zonas_Peligrosas.md) | PRO-OP-003 | IP-003 | IP-03 | 1 año |
| [RP-004](./RP-004_Registro_Siniestros.md) | PRO-OP-004 | IP-004 | IP-04 | 5 años |
| [RP-005](./RP-005_Registro_Consulta_Incidentes.md) | PRO-OP-005 | IP-005 | — | 90 días |
| [RP-006](./RP-006_Informe_Estadistico.md) | PRO-OP-006 | IP-006 | — | 2 años |
| [RP-007](./RP-007_Registro_Cambios_Admin.md) | PRO-OP-007 | IP-007 | — | 2 años |
| [RP-008](./RP-008_Registro_Usuarios.md) | PRO-OP-008 | IP-008 | — | 5 años |
| [RP-009](./RP-009_Bitacora_Turno.md) | PRO-OP-009 | IP-009 | IP-05 | 90 días |
| [RP-010](./RP-010_Registro_No_Conformidades.md) | PRO-OP-010 | IP-010 | IP-06 | 5 años |

---

## Ubicación física de registros completados

| Tipo | Ubicación recomendada |
|------|----------------------|
| Bitácoras de turno (RP-009) | Carpeta sala de control / digital compartida CASISA |
| Alertas y monitoreo (RP-001, RP-002) | Adjunto a bitácora diaria |
| Siniestros (RP-004) | Sistema (`road_accidents`) + PDF exportado |
| NC operativas (RP-010) | Sistema de tickets + copia en carpeta calidad |
| Usuarios (RP-008) | BD del sistema + solicitud de alta/baja archivada |
| Informes estadísticos (RP-006) | Carpeta informes GED / supervisor |

---

## Generación de PDF

```powershell
npm run docs:iso-pdf-registros
```

Salida: `docs/iso9001/REGISTROS_PROCESOS.pdf`

Incluidos en `npm run docs:iso-pdf` (paquete completo). Publicación en G.E.D: `npm run docs:iso-publish`.

Cada plantilla incluye la sección **Uso del registro** con instrucciones de completado.
