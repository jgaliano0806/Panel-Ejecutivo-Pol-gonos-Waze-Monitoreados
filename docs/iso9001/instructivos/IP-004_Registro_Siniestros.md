# Instructivo IP-004: Registro de siniestros viales

**Código:** SGC-PWY-IP-004  
**Proceso:** PRO-OP-004  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador (registro), Supervisor (validación)  
**Indicador:** IP-04 — ≥ 90% siniestros con clima histórico completo

---

## 1. Objetivo

Registrar siniestros viales en el módulo RAC con datos completos, clima histórico y multimedia.

## 2. Permisos requeridos

| Acción | Permiso |
|--------|---------|
| Consultar | `accidents.view` |
| Crear | `accidents.create` |
| Exportar PDF | `accidents.export` |

## 3. Precondiciones

- [ ] Sesión activa con permisos correspondientes
- [ ] Datos del siniestro disponibles (ubicación, fecha, tipo)

## 4. Instructivo — Consulta de siniestros

### Paso 1 — Acceder al módulo

1. Navegar a `/siniestros`
2. Verificar carga del listado

### Paso 2 — Filtrar y buscar

1. Aplicar filtros: fecha, ruta, tipo, estado
2. Seleccionar siniestro de la lista
3. Revisar panel de detalle:
   - Mini-mapa con ubicación
   - Datos del siniestro
   - Clima histórico (temperatura, viento, visibilidad, precipitación)
   - Resumen meteorológico interpretado
   - Multimedia adjunta
   - Mojón kilométrico de referencia

## 5. Instructivo — Registro de nuevo siniestro

### Paso 1 — Iniciar registro

1. Presionar botón **Nuevo siniestro**
2. Completar campos obligatorios:

| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| Fecha y hora | Sí | Hora del siniestro, no de registro |
| Tipo | Sí | Seleccionar de catálogo |
| Descripción | Sí | Texto claro y objetivo |
| Ubicación | Sí | Clic en mini-mapa o coordenadas |

### Paso 2 — Ubicación

1. Hacer clic en mini-mapa para marcar punto exacto
2. Verificar que coordenadas son correctas
3. Confirmar que mojón kilométrico aparece (si hay datos cargados)

### Paso 3 — Multimedia (opcional)

1. Presionar **Adjuntar** foto o video
2. Seleccionar archivo (formatos soportados: JPG, PNG, MP4)
3. Esperar confirmación de carga

### Paso 4 — Guardar

1. Presionar **Guardar**
2. El sistema consulta clima histórico automáticamente (Open-Meteo)
3. Esperar carga del panel de clima (puede tardar unos segundos)

### Paso 5 — Verificar clima histórico

1. Revisar sección clima en detalle del siniestro
2. Verificar campos: temperatura, viento, visibilidad, precipitación
3. Leer resumen meteorológico interpretado
4. Si clima vacío:
   - Presionar **Actualizar clima**
   - Verificar que fecha del siniestro no supere 92 días
   - Si persiste: anotar y reportar IP-010

### Paso 6 — Exportar PDF (opcional)

1. Presionar **Exportar PDF**
2. Guardar archivo en ubicación definida por CASISA
3. Entregar a supervisor si se requiere documentación formal

### Paso 7 — Validación por supervisor

1. Supervisor revisa registro en `/siniestros`
2. Verifica completitud de datos y clima
3. Aprueba o solicita corrección

## 6. Medición del indicador IP-04

| Campo | Valor |
|-------|-------|
| Fórmula | (Siniestros con clima completo / Total siniestros del mes) × 100 |
| Fuente | Consulta en `/siniestros` + BD `road_accidents` |
| Meta | ≥ 90% mensual |
| Responsable | Supervisor — primer día hábil del mes siguiente |

## 7. Desviaciones

| Situación | Acción |
|-----------|--------|
| Siniestro > 92 días sin clima | Documentar imposibilidad técnica en observaciones |
| Coordenadas incorrectas | Editar ubicación antes de guardar definitivo |
| Error al subir multimedia | Reintentar; verificar tamaño < límite del sistema |

---

**Aprobación:** _Pendiente_
