# Instructivo IP-007: Administración del sistema

**Código:** SGC-PWY-IP-007  
**Proceso:** PRO-OP-007  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Administrador  
**Permiso:** `admin`

---

## 1. Objetivo

Administrar la configuración del Panel Ejecutivo Waze: polígonos, catálogos, mojones y parámetros del sistema.

## 2. Precondiciones

- [ ] Rol Administrador asignado
- [ ] Cambios coordinados con supervisor (evitar impacto en operación)

## 3. Instructivo — Polígonos Waze

### Paso 1 — Acceder

1. Navegar a `/admin` → **Polígonos Waze**

### Paso 2 — Crear polígono

1. Presionar **Nuevo polígono**
2. Completar: nombre, feed URL Waze, coordenadas/geometría
3. Asignar a grupo si aplica
4. Guardar
5. Esperar próximo ciclo de polling (~30 s)
6. Verificar en `/mapa` que el polígono aparece con datos

### Paso 3 — Editar polígono

1. Seleccionar polígono existente
2. Modificar campos necesarios
3. Guardar
4. Verificar en mapa

### Paso 4 — Importar/exportar

1. **Exportar CSV:** respaldo antes de cambios masivos
2. **Importar CSV:** validar formato → importar → verificar conteo

## 4. Instructivo — Catálogos

### Paso 1 — Acceder

1. `/admin` → **Catálogos**

### Paso 2 — Sincronizar con Waze

1. Presionar **Sincronizar**
2. Esperar finalización
3. Verificar que tipos/subtipos se actualizaron

### Paso 3 — Crear tipo personalizado (si necesario)

1. Nuevo tipo → nombre, código, icono
2. Agregar subtipos asociados
3. Guardar

## 5. Instructivo — Mojones kilométricos

### Paso 1 — Acceder

1. `/admin` → **Mojones Kilométricos**

### Paso 2 — Crear mojón

1. Nuevo → ruta, km, coordenadas lat/lng
2. Guardar
3. Verificar que alertas nuevas muestran referencia km

## 6. Instructivo — Configuración del sistema

### Paso 1 — Acceder

1. `/admin` → **Configuración Sistema**

### Paso 2 — TTS

| Parámetro | Valor recomendado |
|-----------|-------------------|
| Voz | `es-AR-ElenaNeural` |
| Velocidad | Predeterminado |
| Filtros | Tipos críticos activos |

### Paso 3 — Verificar tras cambios

1. Abrir `http://10.1.0.136/health` → HTTP 200
2. Smoke test en `/mapa`
3. Probar TTS con alerta de prueba (solo en horario de bajo tráfico)

## 7. Registro de cambios administrativos

| Campo | Registrar |
|-------|-----------|
| Fecha/hora | |
| Administrador | |
| Sección modificada | Polígonos / Catálogos / Mojones / Config |
| Descripción del cambio | |
| Verificación post-cambio | OK / NOK |

## 8. Desviaciones

| Situación | Acción |
|-----------|--------|
| Polígono sin datos tras crear | Verificar feed URL; revisar logs backend |
| Cambio rompe operación | Rollback vía PROC-003 / contactar GED |

---

**Aprobación:** _Pendiente_
