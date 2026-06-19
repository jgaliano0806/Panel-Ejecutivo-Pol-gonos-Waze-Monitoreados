# Documentación del Panel Ejecutivo Waze

Índice de la documentación técnica, operativa y del Sistema de Gestión de la Calidad (SGC) del proyecto.

_Última actualización: Junio 2026 — Paquete ISO v1.5_

---

## Despliegue en producción

| Documento | Contenido |
|-----------|-----------|
| [**deploy/INSTRUCCIONES-DESPLIEGUE.md**](../deploy/INSTRUCCIONES-DESPLIEGUE.md) | **Referencia principal Windows Server**: nginx :80, NSSM, `manage-services.ps1`, CI/CD automático, rollback. |
| [**INSTRUCTIVO_DESPLIEGUE.md**](./INSTRUCTIVO_DESPLIEGUE.md) | Instructivo completo: Windows Server 2022, Red Hat (systemd, Nginx), PC productiva. |
| [**REQUISITOS_SISTEMA.md**](./REQUISITOS_SISTEMA.md) | Requisitos físicos/lógicos, cargas en BD, polling Waze/clima, hardware. |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Despliegue rápido: desarrollo local, Docker, build manual. |
| [**MANUAL_DESPLIEGUE_SERVIDOR.md**](./MANUAL_DESPLIEGUE_SERVIDOR.md) | Manual técnico de despliegue en servidor (PDF: `npm run docs:pdf`). |

---

## Para desarrolladores

| Documento | Contenido |
|-----------|-----------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Monorepo, capas, WebSocket, RBAC, mapa MapLibre, patrones hexagonal/CQRS. |
| [**API.md**](./API.md) | API REST completa: auth, siniestros, zonas peligrosas, clima, histórico, WebSocket. |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Branches (`main` / `preprod` / `feat/*`), commits, PRs, estándares. |

---

## Por dominio

| Documento | Contenido |
|-----------|-----------|
| [**TTS.md**](./TTS.md) | Edge TTS, cola, `red_zone_critical_alert`, zonas peligrosas. |
| [**CATALOGOS_INCIDENTES.md**](./CATALOGOS_INCIDENTES.md) | Tipos/subtipos de incidentes, sincronización Waze. |
| [**REPORTE_POLLING_WAZE.md**](./REPORTE_POLLING_WAZE.md) | Análisis del ciclo de polling Waze. |

---

## Sistema de Gestión de la Calidad (ISO 9001:2015)

Paquete completo en [**iso9001/**](./iso9001/README.md) — **versión 1.5**, 31 documentos controlados.

### Cadena documental operativa

```
PRO-OP-00X (proceso)  →  IP-00X (instructivo)  →  RP-00X (registro / evidencia)
```

| Nivel | Código | Documento | Cantidad |
|-------|--------|-----------|----------|
| Marco SGC | SGC-PWY-001 | [Manual del SGC](./iso9001/MANUAL_SGC_ISO9001.md) | 1 |
| Operación | SGC-PWY-MU-001 | [Manual de Usuario](./iso9001/MANUAL_USUARIO.md) | 1 |
| Procesos | SGC-PWY-MP-001 | [Manual de Procesos](./iso9001/MANUAL_PROCESOS.md) — PRO-OP-001…010 | 1 + 10 procesos |
| Instructivos | SGC-PWY-IP-001…010 | [Instructivos](./iso9001/instructivos/README.md) — paso a paso | 10 |
| Registros | SGC-PWY-RP-001…010 | [Registros](./iso9001/registros/README.md) — plantillas de evidencia | 10 |
| Procedimientos | SGC-PWY-PROC-001…006 | Control docs, desarrollo, cambios, pruebas, despliegue, NC | 6 |
| Registros maestros | SGC-PWY-REG-001…002 | [REG-001](./iso9001/REG-001_Registro_Documentos.md) documentación, [REG-002](./iso9001/REG-002_Registro_Riesgos.md) riesgos | 2 |

### Generación y publicación de PDF

```powershell
# Paquete ISO completo (31 documentos en un solo PDF)
npm run docs:iso-pdf

# PDFs individuales
npm run docs:iso-pdf-usuario       # Manual de Usuario
npm run docs:iso-pdf-procesos      # Manual de Procesos
npm run docs:iso-pdf-instructivos  # Instructivos IP-001 a IP-010
npm run docs:iso-pdf-registros     # Registros RP-001 a RP-010

# Todos los PDFs del proyecto (ISO + despliegue)
npm run docs:all-pdf

# Copiar PDFs ISO a carpeta G.E.D
npm run docs:iso-publish
```

| PDF generado | Contenido |
|--------------|-----------|
| `iso9001/MANUAL_SGC_ISO9001.pdf` | Paquete SGC completo |
| `iso9001/MANUAL_USUARIO.pdf` | Manual de Usuario |
| `iso9001/MANUAL_PROCESOS.pdf` | 10 procesos operativos + mapa de flujo |
| `iso9001/INSTRUCTIVOS_PROCESOS.pdf` | IP-001 a IP-010 |
| `iso9001/REGISTROS_PROCESOS.pdf` | RP-001 a RP-010 (formularios) |
| `MANUAL_DESPLIEGUE_SERVIDOR.pdf` | Despliegue técnico |

**Ubicación publicada (GED):** `Z:\G.E.D\Panel Waze\iso9001\`

El registro maestro de documentación está en [REG-001](./iso9001/REG-001_Registro_Documentos.md).

---

## Auditorías y reportes

| Ubicación | Contenido |
|-----------|-----------|
| [apps/frontend/docs/](../apps/frontend/docs/) | Auditoría de código frontend. |
| [apps/backend/docs/](../apps/backend/docs/) | Auditoría de código y base de datos backend. |

---

## Resumen rápido

| Área | Detalle |
|------|---------|
| **Stack** | React 18 + Vite 6, Fastify 5, Node 20, PostgreSQL 18, Socket.IO, Edge TTS |
| **Producción** | Windows Server 2022 — nginx :80 → backend :3002 — http://10.1.0.136/ |
| **CI/CD** | GitHub Actions: lint, security audit, build, E2E, deploy automático en `main` |
| **Auth** | JWT + RBAC granular por ruta y endpoint |
| **Módulos** | Mapa, siniestros (RAC), zonas peligrosas, incidentes, estadísticas, admin |
| **WebSocket** | `waze:data_updated`, `notification:new`, `red_zone_critical_alert` |
| **SGC ISO** | 31 docs en `docs/iso9001/` — paquete v1.5, PDFs publicables con `docs:iso-publish` |
| **Branches** | `main` (prod) → `preprod` (staging) → `feat/*` / `fix/*` |
| **Desarrollo** | `npm run dev:all` — frontend :5180, backend :3002 |
| **Migraciones** | `apps/backend/src/database/migrations/` |
