# Instructivo IP-005: Consulta de incidentes e histórico

**Código:** SGC-PWY-IP-005  
**Proceso:** PRO-OP-005  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador, Supervisor  
**Permiso:** `incidents.view`

---

## 1. Objetivo

Consultar incidentes Waze activos e históricos con filtros avanzados para análisis operativo.

## 2. Módulos

| Ruta | Función |
|------|---------|
| `/incidentes` | Listado activo con filtros |
| `/incidentes/historico` | Consulta histórica por fechas |

## 3. Instructivo — Incidentes activos

### Paso 1 — Acceder

1. Navegar a `/incidentes`
2. Verificar carga del listado paginado

### Paso 2 — Aplicar filtros

| Filtro | Uso |
|--------|-----|
| Tipo | Accidente, peligro, clima, etc. |
| Subtipo | Detalle del tipo |
| Fecha desde/hasta | Rango temporal |
| Polígono | Zona específica |
| Estado | Activo / inactivo |
| Búsqueda | Texto libre (calle, ciudad) |

### Paso 3 — Revisar resultados

1. Leer columnas: tipo, ubicación, fecha, polígono, confianza
2. Clic en fila para ver detalle expandido
3. Navegar páginas si hay más de 50 resultados

### Paso 4 — Exportar (si tiene `incidents.export`)

1. Aplicar filtros deseados
2. Presionar **Exportar**
3. Guardar archivo generado

## 4. Instructivo — Histórico

### Paso 1 — Acceder

1. Navegar a `/incidentes/historico`
2. Seleccionar rango de fechas amplio (ej. últimos 7 días)

### Paso 2 — Filtrar

1. Seleccionar polígono si se analiza zona específica
2. Filtrar por tipo si se busca patrón
3. Aplicar filtro

### Paso 3 — Analizar

1. Revisar tendencia de incidentes en el período
2. Identificar horarios pico
3. Comunicar hallazgos al supervisor

## 5. Registro

- Consultas quedan en logs de API (automático)
- Análisis relevante: anotar en bitácora o informe

## 6. Desviaciones

| Situación | Acción |
|-----------|--------|
| Listado vacío inesperado | Verificar filtros; revisar `/mapa` para datos en vivo |
| Exportación fallida | Verificar permiso `incidents.export` |
| Datos incoherentes con mapa | Reportar IP-010 |

---

**Aprobación:** _Pendiente_
