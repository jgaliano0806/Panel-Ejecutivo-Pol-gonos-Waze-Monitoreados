# 📋 Gestión de Catálogos de Incidentes

El sistema incluye un módulo para administrar los tipos y subtipos de incidentes que se reportan desde Waze u otras fuentes.

## 🗄️ Esquema de Datos

### Tipos (`incident_types`)

Categorías principales de incidentes.

- **code**: Identificador único (ej: `ACCIDENT`, `JAM`)
- **icon**: Nombre del icono SVG (ej: `car`, `alert-triangle`)
- **icon_url**: URL opcional para iconos personalizados

### Subtipos (`incident_subtypes`)

Clasificaciones específicas dentro de un tipo.

- **type_id**: Relación con `incident_types`
- **code**: Identificador único (ej: `ACCIDENT_MAJOR`, `JAM_HEAVY`)
- **severity**: Nivel de severidad para mapas (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)

## 🔄 Sincronización con Waze

El sistema puede sincronizar automáticamente nuevos tipos y subtipos detectados en el feed de Waze.

1.  **Detección**: El `CatalogSyncService` analiza los incidentes activos.
2.  **Registro**: Si encuentra un tipo/subtipo desconocido, lo crea con valores por defecto.
3.  **Reactivación**: Si un tipo estaba inactivo, se reactiva automáticamente al detectar uso.

Los tipos sincronizados aparecen inicialmente con valores genéricos y deben ser editados en el panel de administración para ajustar nombres y descripciones.

## 🛠️ Panel de Administración

Ubicado en `/admin/catalogs`, permite:

- **Ver** lista jerárquica de tipos y subtipos.
- **Editar** nombres, descripciones y colores.
- **Asignar Iconos** SVG oficiales de Waze.
- **Activar/Desactivar** elementos del catálogo.
- **Sincronizar Manualmente** forzando una lectura del feed actual.

## 🚀 Comandos Útiles

```bash
# Cargar datos por defecto (recomendado en instalación inicial)
npm run db:seed

# Reparar estructura (si faltan columnas)
npx ts-node apps/backend/src/scripts/fixSchema.ts
```

## 🎨 Iconos de Waze

El frontend utiliza una librería de iconos SVG para representar cada tipo.

- **Mapa principal** (`MapLibreMap`): Incidentes renderizados como `maplibregl.Marker` (HTML DOM) con iconos SVG. Click nativo, accesibilidad (ARIA) y hover animado.
- **Minimapa** (`MiniMapLibre`): Mismo patron de markers HTML con la propiedad `type` para el icono.
- **Listas**: Se utilizan iconos de Lucide React como fallback visual.
