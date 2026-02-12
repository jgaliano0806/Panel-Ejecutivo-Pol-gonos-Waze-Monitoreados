# 📚 Documentación del Panel Ejecutivo Waze

Índice de la documentación técnica y operativa del proyecto.

---

## Despliegue en producción

| Documento | Contenido |
|-----------|-----------|
| [**INSTRUCTIVO_DESPLIEGUE.md**](./INSTRUCTIVO_DESPLIEGUE.md) | Instructivo completo: servidor Red Hat (systemd, Nginx, PostgreSQL, Redis, SSL) y PC productiva (Windows/Linux). Pasos, variables de entorno, verificación y resolución de problemas. |
| [**REQUISITOS_SISTEMA.md**](./REQUISITOS_SISTEMA.md) | Requisitos físicos y lógicos, cargas en BD, consumos (polling Waze/clima), hardware recomendado para servidor y PC. |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Despliegue rápido: prerrequisitos, desarrollo local, Docker (dev/prod), build manual y variables de entorno. |

---

## Para desarrolladores

| Documento | Contenido |
|-----------|-----------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Arquitectura del sistema: monorepo, capas (frontend/backend), mapa (MapLibre GL JS, markers HTML, basemap raster), flujos de datos, patrones (hexagonal, CQRS), estado, seguridad, testing y despliegue. |
| [**API.md**](./API.md) | Documentación de la API REST: health checks, incidentes, jams, polígonos, catálogos, TTS, WebSocket y notificaciones. |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Guía de contribución: estrategia de branches (`main` / `preprod` / `feature/*`), flujo de desarrollo, convenciones de commits, gestión de paquetes y estándares de código. |

---

## Por dominio

| Documento | Contenido |
|-----------|-----------|
| [**TTS.md**](./TTS.md) | Text-to-Speech: Edge TTS, cola de reproducción, estado (`getTTSQueueStatus`), configuración de voz y límites/cuotas. |
| [**CATALOGOS_INCIDENTES.md**](./CATALOGOS_INCIDENTES.md) | Catálogos de tipos y subtipos de incidentes, sincronización con Waze y panel de administración. |

---

## Auditorías y reportes

| Ubicación | Contenido |
|-----------|-----------|
| [apps/frontend/docs/](../apps/frontend/docs/) | Informes de auditoría de código del frontend. |
| [apps/backend/docs/](../apps/backend/docs/) | Informes de auditoría de código y base de datos del backend. |

---

## Resumen rápido

- **Arquitectura**: Monorepo (apps: frontend React/Vite, backend Fastify), packages (types, config, shared). PostgreSQL, Socket.IO, Edge TTS.
- **Mapa**: MapLibre GL JS + react-map-gl/maplibre, basemap raster, incidentes como markers HTML con accesibilidad.
- **Branches**: `main` (prod) → `preprod` (staging) → `feature/*` / `fix/*`.
- **API base**: `/api` (ej. `http://localhost:3002/api`).
- **Desarrollo**: `npm run dev:all` (frontend en 5180, backend en 3002).
- **Producción**: Ver [INSTRUCTIVO_DESPLIEGUE.md](./INSTRUCTIVO_DESPLIEGUE.md) (Red Hat o PC productiva) y [REQUISITOS_SISTEMA.md](./REQUISITOS_SISTEMA.md).
- **Documentación de API**: Ver [API.md](./API.md) para todos los endpoints.
