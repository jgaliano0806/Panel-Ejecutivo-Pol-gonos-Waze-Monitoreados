# 📚 Documentación del Panel Ejecutivo Waze

Índice de la documentación técnica y operativa del proyecto.

---

## Para desarrolladores

| Documento | Contenido |
|-----------|-----------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Arquitectura del sistema: monorepo, capas (frontend/backend), flujos de datos, patrones (hexagonal, CQRS), estado, seguridad, testing y despliegue. |
| [**API.md**](./API.md) | Documentación de la API REST: health checks, incidentes, jams, polígonos, catálogos, TTS, WebSocket y notificaciones. |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Guía de contribución: estructura del monorepo, flujo de desarrollo, convenciones de commits, gestión de paquetes y estándares de código. |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Despliegue: prerrequisitos, desarrollo local, Docker (dev/prod), build manual y variables de entorno. |

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
- **API base**: `/api` (ej. `http://localhost:3001/api`).
- **Desarrollo**: `npm run dev:all` (frontend en 5173, backend en 3001).
- **Documentación de API**: Ver [API.md](./API.md) para todos los endpoints.
