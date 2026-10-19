# Manual de Usuario

**Código:** SGC-PWY-MU-001  
**Proyecto:** Panel Ejecutivo Waze – Monitoreo de Tráfico en Tiempo Real  
**Organización:** CASISA – Caminos de las Sierras  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 7.2, 7.3, 8.5 — Competencia, conciencia y operación

---

## Tabla de contenidos

1. [Introducción](#1-introducción)
2. [Requisitos de acceso](#2-requisitos-de-acceso)
3. [Inicio de sesión y perfil](#3-inicio-de-sesión-y-perfil)
4. [Navegación general](#4-navegación-general)
5. [Módulo Mapa y Zonas](#5-módulo-mapa-y-zonas)
6. [Módulo Notificaciones](#6-módulo-notificaciones)
7. [Módulo Zonas Peligrosas](#7-módulo-zonas-peligrosas)
8. [Módulo Incidentes Waze](#8-módulo-incidentes-waze)
9. [Módulo Siniestros Viales](#9-módulo-siniestros-viales)
10. [Módulo Estadísticas](#10-módulo-estadísticas)
11. [Panel de Administración](#11-panel-de-administración)
12. [Alertas de voz (TTS)](#12-alertas-de-voz-tts)
13. [Roles y permisos](#13-roles-y-permisos)
14. [Resolución de problemas](#14-resolución-de-problemas)
15. [Registro de incidencias](#15-registro-de-incidencias)

---

## 1. Introducción

### 1.1 Propósito

Este manual guía a los usuarios del **Panel Ejecutivo Waze** en el uso correcto del sistema para el monitoreo operativo del tráfico en la red de autopistas de Córdoba.

### 1.2 Alcance

Este manual aplica a operadores de sala de control, supervisores y administradores que utilizan el panel en el entorno de producción.

### 1.3 URL de acceso

| Entorno | URL |
|---------|-----|
| Producción | http://10.1.0.136/ |
| Desarrollo local | http://localhost:5180 |

---

## 2. Requisitos de acceso

### 2.1 Requisitos técnicos del puesto de trabajo

| Requisito | Especificación |
|-----------|----------------|
| Navegador | Chrome, Edge o Firefox (última versión estable) |
| Resolución | Mínimo 1920×1080 recomendado para sala de control |
| Red | Acceso LAN a `10.1.0.136` |
| Audio | Parlantes o auriculares para alertas TTS |
| Credenciales | Usuario y contraseña asignados por administrador |

### 2.2 Primera interacción obligatoria

Al iniciar el turno, el operador **debe hacer clic en el icono de audio** (altavoz) en la barra superior del panel para habilitar las alertas sonoras. Los navegadores bloquean el audio automático hasta que el usuario interactúa con la página.

---

## 3. Inicio de sesión y perfil

### 3.1 Iniciar sesión

1. Abrir la URL del panel en el navegador.
2. Ingresar **email** y **contraseña** en la pantalla de login.
3. Presionar **Iniciar sesión**.
4. El sistema redirige automáticamente al módulo Mapa (`/mapa`).

### 3.2 Cerrar sesión

1. Expandir el menú lateral (sidebar).
2. Presionar el botón **Cerrar sesión** en la parte inferior.
3. El sistema limpia las notificaciones locales y redirige al login.

### 3.3 Perfil de usuario

Ruta: `/perfil` (accesible desde el menú de usuario).

| Acción | Descripción |
|--------|-------------|
| Ver datos | Nombre, email, rol asignado |
| Cambiar contraseña | Requiere contraseña actual y nueva |
| Sesiones activas | Ver y revocar sesiones en otros equipos |

---

## 4. Navegación general

### 4.1 Menú lateral (sidebar)

El menú lateral muestra solo los módulos para los que el usuario tiene permiso:

| Ícono | Módulo | Ruta |
|-------|--------|------|
| Mapa | Mapa y Zonas | `/mapa` |
| Campana | Notificaciones | `/notificaciones` |
| Escudo | Zonas peligrosas | `/zonas-peligrosas` |
| Lupa | Incidentes Waze | `/incidentes` |
| Auto | Siniestros viales | `/siniestros` |
| Engranaje | Administración | `/admin` |

### 4.2 Barra superior

| Elemento | Función |
|----------|---------|
| Logo CASISA | Identificación del sistema |
| Indicador de conexión | Estado WebSocket (conectado/desconectado) |
| Contador de notificaciones | Alertas no leídas |
| Botón de audio | Activar/desactivar TTS y alertas sonoras |
| Tema claro/oscuro | Cambiar apariencia visual |

### 4.3 Actualización de datos

Los datos se actualizan automáticamente vía WebSocket cada vez que el backend completa un ciclo de ingesta Waze (aproximadamente cada 30 segundos). No es necesario refrescar la página manualmente.

---

## 5. Módulo Mapa y Zonas

**Ruta:** `/mapa`  
**Permiso:** `map.view`

### 5.1 Descripción

Vista principal de operación. Muestra el mapa interactivo con polígonos de monitoreo, incidentes Waze en tiempo real, congestión (jams) y KPIs de tráfico.

### 5.2 Elementos del mapa

| Elemento | Significado |
|----------|-------------|
| Marcadores de colores | Incidentes Waze (accidentes, peligros, clima) |
| Polígonos coloreados | Estado de tráfico por zona de monitoreo |
| Líneas de congestión | Jams (embotellamientos) activos |
| Popup al clic | Detalle del incidente: tipo, ubicación, hora, confianza |

### 5.3 Filtros disponibles

- Filtrar por tipo de incidente (accidente, peligro, clima, etc.)
- Filtrar por polígono o grupo de polígonos
- Filtrar por severidad
- Búsqueda por texto (calle, ciudad)

### 5.4 KPIs en dashboard

El panel lateral muestra indicadores en tiempo real:

- Total de incidentes activos
- Polígonos en estado crítico
- Comparación de velocidad vs. histórico
- Resumen meteorológico interpretado para gestión vial

### 5.5 Acciones del operador

| Acción | Procedimiento |
|--------|---------------|
| Consultar incidente | Clic en marcador → leer popup |
| Cambiar zoom | Rueda del mouse o controles +/- |
| Cambiar basemap | Selector de mapa base (oscuro/claro) |
| Centrar en polígono | Seleccionar polígono en lista lateral |

---

## 6. Módulo Notificaciones

**Ruta:** `/notificaciones`  
**Permiso:** `notifications.view`

### 6.1 Descripción

Centro de notificaciones con historial de alertas Waze recibidas en tiempo real.

### 6.2 Funciones

| Función | Descripción |
|---------|-------------|
| Listado cronológico | Alertas ordenadas por fecha/hora |
| Marcar como leída | Clic en notificación individual |
| Marcar todas leídas | Botón "Marcar todas" |
| Filtro por tipo | Accidentes, peligros, clima |
| Snackbar en mapa | Alerta flotante breve al recibir evento nuevo |

### 6.3 Comportamiento en tiempo real

Cuando llega una alerta nueva:

1. Aparece snackbar en la esquina del mapa (si está en `/mapa`).
2. Se incrementa el contador de no leídas.
3. Si TTS está activo, se reproduce mensaje de voz (ver sección 12).

---

## 7. Módulo Zonas Peligrosas

**Ruta:** `/zonas-peligrosas`  
**Permiso:** `danger_zones.view` (ver), `danger_zones.edit` (editar)

### 7.1 Descripción

Gestión y visualización de zonas peligrosas (geofencing) sobre el mapa. Cuando un incidente Waze cae dentro de una zona peligrosa, el sistema emite una **alerta crítica** con sirena y TTS prioritario.

### 7.2 Visualización

- Las zonas peligrosas se muestran como polígonos resaltados en el mapa.
- Color según nivel de peligrosidad configurado.
- Al detectar incidente dentro de la zona: alerta `red_zone_critical_alert`.

### 7.3 Edición (requiere `danger_zones.edit`)

| Acción | Procedimiento |
|--------|---------------|
| Crear zona | Dibujar polígono en mapa → completar nombre y nivel |
| Editar zona | Seleccionar zona → modificar geometría o atributos |
| Eliminar zona | Seleccionar zona → confirmar eliminación |

---

## 8. Módulo Incidentes Waze

**Ruta:** `/incidentes`  
**Permiso:** `incidents.view`

### 8.1 Descripción

Módulo de consulta y gestión de incidentes reportados por Waze con filtros avanzados, histórico y exportación.

### 8.2 Submódulos

| Ruta | Función |
|------|---------|
| `/incidentes` | Listado activo con filtros y búsqueda |
| `/incidentes/historico` | Consulta de incidentes históricos por fecha y polígono |
| `/estadisticas` | Analítica operativa: tendencias, disponibilidad, hotspots |

### 8.3 Filtros de consulta

- Tipo y subtipo de incidente
- Rango de fechas (desde / hasta)
- Polígono específico
- Estado activo/inactivo
- Búsqueda por texto libre

### 8.4 Exportación

Usuarios con permiso `incidents.export` pueden exportar listados filtrados.

---

## 9. Módulo Siniestros Viales

**Ruta:** `/siniestros`  
**Permisos:** `accidents.view` (ver), `accidents.create` (crear), `accidents.export` (exportar)

### 9.1 Descripción

Registro y consulta de siniestros viales (RAC) con datos de ubicación, clima histórico, multimedia y exportación a PDF.

### 9.2 Consultar siniestros

1. Acceder a `/siniestros`.
2. Usar filtros: fecha, ruta, estado, tipo.
3. Seleccionar un siniestro de la lista para ver detalle.
4. El panel de detalle muestra:
   - Ubicación en mini-mapa
   - Datos del siniestro (fecha, tipo, descripción)
   - **Clima histórico** al momento del siniestro (temperatura, viento, visibilidad, precipitación)
   - Resumen meteorológico interpretado para gestión vial
   - Multimedia adjunta (fotos, videos)
   - Referencia kilométrica (mojón más cercano)

### 9.3 Registrar nuevo siniestro (requiere `accidents.create`)

1. Presionar **Nuevo siniestro**.
2. Completar campos obligatorios: ubicación, fecha/hora, tipo, descripción.
3. Opcionalmente adjuntar multimedia.
4. Guardar. El sistema consulta clima histórico automáticamente.

### 9.4 Actualizar clima histórico

Si un siniestro no tiene datos meteorológicos:

1. Seleccionar el siniestro.
2. Presionar **Actualizar clima**.
3. El sistema consulta Open-Meteo para la fecha y ubicación del siniestro (hasta 92 días de antigüedad).

### 9.5 Exportar a PDF (requiere `accidents.export`)

1. Seleccionar siniestro.
2. Presionar **Exportar PDF**.
3. Se genera documento con datos, mapa, clima y multimedia.

---

## 10. Módulo Estadísticas

**Ruta:** `/estadisticas`  
**Permiso:** `incidents.view`

### 10.1 Descripción

Dashboard de analítica operativa con métricas diarias, semanales y mensuales.

### 10.2 Contenido

| Sección | Datos |
|---------|-------|
| Tendencias | Evolución de incidentes en el tiempo |
| Disponibilidad | Porcentaje de tiempo con datos Waze activos |
| Hotspots | Zonas con mayor concentración de incidentes |
| Comparación grupal | Métricas por grupo de polígonos |

---

## 11. Panel de Administración

**Ruta:** `/admin`  
**Permiso:** `admin`

### 11.1 Secciones

| Sección | Función |
|---------|---------|
| **Polígonos Waze** | Crear, editar, eliminar polígonos de monitoreo. Importar/exportar CSV |
| **Catálogos** | Gestionar tipos y subtipos de incidentes. Sincronizar con Waze |
| **Usuarios y Perfiles** | CRUD usuarios, asignar roles y permisos |
| **Mojones Kilométricos** | Gestionar hitos kilométricos por ruta (geo-referencia) |
| **Configuración Sistema** | Parámetros generales, voz TTS, umbrales de alerta |

### 11.2 Gestión de usuarios

| Acción | Procedimiento |
|--------|---------------|
| Crear usuario | Usuarios → Nuevo → email, nombre, rol |
| Asignar rol | Seleccionar rol predefinido (Administrador, Supervisor, Operador, Visualizador) |
| Permisos personalizados | Editar permisos individuales del rol |
| Desactivar usuario | Cambiar estado a inactivo |

### 11.3 Configuración TTS

Ruta: Admin → Configuración Sistema → Voz (TTS)

| Parámetro | Descripción |
|-----------|-------------|
| Voz | Elena (AR), Tomás (AR), Dalia (MX), Jorge (MX) |
| Velocidad | Rate de reproducción |
| Tono | Pitch de la voz |
| Filtros | Tipos de incidente que activan TTS |

---

## 12. Alertas de voz (TTS)

### 12.1 Activación

1. Hacer clic en el icono de **altavoz** en la barra superior.
2. El icono cambia de estado (activo/silenciado).
3. La preferencia se guarda en el navegador.

### 12.2 Tipos de alerta sonora

| Evento | Comportamiento |
|--------|----------------|
| Alerta estándar | Beep + lectura TTS del incidente |
| Zona peligrosa | **Sirena** + TTS prioritario (no se repite en alerta estándar) |
| Mute activo | Sin sonido ni TTS (solo visual) |

### 12.3 Mensaje TTS

El sistema construye un mensaje en lenguaje natural con:

- Tipo de incidente traducido al español
- Ubicación (calle, ruta, mojón kilométrico si disponible)
- Polígono de monitoreo afectado

---

## 13. Roles y permisos

### 13.1 Roles predefinidos

| Rol | Permisos | Uso típico |
|-----|----------|------------|
| **Administrador** | Todos (`admin`) | Gestión del sistema |
| **Supervisor** | Todos excepto `admin` | Supervisión operativa |
| **Operador** | map, zonas (ver/editar), notificaciones, siniestros (ver/crear), incidentes | Sala de control |
| **Visualizador** | map, notificaciones, siniestros (ver), incidentes (ver) | Consulta sin edición |

### 13.2 Matriz de permisos

| Permiso | Mapa | Zonas | Notif. | Siniestros | Incidentes | Admin |
|---------|------|-------|--------|------------|------------|-------|
| `map.view` | Ver | — | — | — | — | — |
| `danger_zones.view` | — | Ver | — | — | — | — |
| `danger_zones.edit` | — | Editar | — | — | — | — |
| `notifications.view` | — | — | Ver | — | — | — |
| `accidents.view` | — | — | — | Ver | — | — |
| `accidents.create` | — | — | — | Crear | — | — |
| `accidents.export` | — | — | — | Exportar | — | — |
| `incidents.view` | — | — | — | — | Ver | — |
| `incidents.export` | — | — | — | — | Exportar | — |
| `admin` | — | — | — | — | — | Total |

### 13.3 Acceso denegado

Si el usuario intenta acceder a un módulo sin permiso, el sistema muestra **"Acceso Denegado"** con enlace a la primera ruta disponible según sus permisos.

---

## 14. Resolución de problemas

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Pantalla en blanco tras login | Sin permisos asignados | Contactar administrador |
| Mapa sin incidentes | Feed Waze caído o sin datos | Verificar `/health`; esperar próximo ciclo (30 s) |
| Sin alertas de voz | Audio no habilitado | Clic en icono altavoz |
| "Desconectado" en barra | WebSocket caído | Refrescar página; verificar red |
| Datos desactualizados | Caché del navegador | Ctrl+F5 (recarga forzada) |
| Error al exportar PDF | Permiso `accidents.export` ausente | Solicitar permiso al administrador |
| Clima histórico vacío | Siniestro > 92 días o sin coordenadas | Usar "Actualizar clima" o verificar ubicación |

---

## 15. Registro de incidencias

Si detecta un comportamiento anómalo del sistema durante la operación:

1. Anotar: fecha, hora, módulo, descripción del problema, captura de pantalla si es posible.
2. Reportar al supervisor o al equipo GED.
3. El supervisor registra la incidencia conforme a [PROC-006_No_Conformidades_Mejora.md](./PROC-006_No_Conformidades_Mejora.md).

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |

| Campo | Valor |
|-------|-------|
| Elaborado por | GED – CASISA |
| Revisado por | _Pendiente_ |
| Aprobado por | _Pendiente_ |
| Próxima revisión | Diciembre 2026 |
