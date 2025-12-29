# 📡 Documentación de API

Este documento detalla los endpoints disponibles en el backend del Panel Ejecutivo Waze.

## Base URL
El path base para la API es `/api`.
Ejemplo local: `http://localhost:3001/api`

## 🏥 Health Checks
Endpoints para monitoreo y orquestación (Kubernetes/Docker).

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado completo del sistema (DB + Servicios + Recursos) |
| GET | `/health/live` | Liveness probe (indica si el proceso está corriendo) |
| GET | `/health/ready` | Readiness probe (indica si está listo para recibir tráfico) |

## 🚦 Tráfico e Incidentes

### Obtener Incidentes (Alerts)
Obtiene todos los incidentes activos de Waze.
- **GET** `/api/incidents/all`
- **Respuesta**: Array de objetos de alerta de Waze.

### Obtener Embotellamientos (Jams)
Obtiene todos los embotellamientos activos de Waze.
- **GET** `/api/jams/all`
- **Respuesta**: Array de objetos de jam de Waze.

### Métricas de Tráfico
- **GET** `/api/traffic-metrics`: Métricas de tráfico de todos los polígonos.
- **GET** `/api/traffic-metrics/:polygonId`: Métricas específicas para un polígono.

### KPIs Globales
- **GET** `/api/kpis/global`: Resumen de KPIs globales del sistema.

## 🗺️ Polígonos
Gestión de áreas de monitoreo.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/polygons` | Listar todos los polígonos configurados |
| GET | `/api/polygons/:id` | Obtener detalle de un polígono |
| POST | `/api/polygons` | Crear nuevo polígono |
| PUT | `/api/polygons/:id` | Actualizar polígono existente |
| DELETE | `/api/polygons/:id` | Eliminar polígono |

## 📋 Catálogos
Gestión de tipos y subtipos de incidentes.

### Tipos de Incidentes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/catalogs` | Listar jerarquía completa de catálogos |
| GET | `/api/catalogs/stats` | Estadísticas de uso de catálogos |
| POST | `/api/catalogs/types` | Crear tipo |
| PUT | `/api/catalogs/types/:id` | Actualizar tipo |
| DELETE | `/api/catalogs/types/:id` | Eliminar tipo |

### Subtipos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/catalogs/subtypes` | Crear subtipo |
| PUT | `/api/catalogs/subtypes/:id` | Actualizar subtipo |
| DELETE | `/api/catalogs/subtypes/:id` | Eliminar subtipo |

### Sincronización
- **POST** `/api/catalogs/sync`: Fuerza la sincronización de catálogos desde los feeds de Waze.

## 🎨 Recursos

### Proxy de Iconos
- **GET** `/api/icons/:iconName`: Proxy autenticado para obtener iconos SVG de Waze.
  - Implementa caché y fallbacks automáticos.

## 🔐 Autenticación
(Documentación pendiente de implementación final de Auth)
Actualmente la API espera headers estándar o cookies de sesión para ciertas operaciones internas.
