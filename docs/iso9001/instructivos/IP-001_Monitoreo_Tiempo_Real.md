# Instructivo IP-001: Monitoreo de tráfico en tiempo real

**Código:** SGC-PWY-IP-001  
**Proceso:** PRO-OP-001  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador de sala de control  
**Indicador:** IP-01 — Actualización de datos ≤ 30 s

---

## 1. Objetivo

Este instructivo describe cómo ejecutar el monitoreo continuo del tráfico vehicular mediante el módulo Mapa y verificar que los datos Waze se actualicen en tiempo real.

## 2. Alcance

Aplica al turno operativo en sala de control. El módulo de trabajo es `/mapa`.

## 3. Precondiciones

- [ ] Equipo encendido y conectado a red LAN
- [ ] Sesión iniciada (ver IP-009)
- [ ] Audio habilitado (icono altavoz activo)
- [ ] Indicador WebSocket en estado **Conectado**

## 4. Instructivo paso a paso

### Paso 1 — Acceder al mapa

1. Abrir navegador en `http://10.1.0.136/`
2. Si no hay sesión, iniciar sesión (IP-009)
3. Verificar que la ruta activa es `/mapa`
4. Esperar carga completa del mapa (polígonos y leyenda visibles)

### Paso 2 — Verificar conexión en tiempo real

1. Observar indicador de conexión en barra superior
2. **Conectado (verde):** continuar
3. **Desconectado (rojo):**
   - Presionar F5 para refrescar
   - Si persiste: ejecutar IP-010

### Paso 3 — Revisar estado general

1. Leer KPIs del panel lateral:
   - Total incidentes activos
   - Polígonos en estado crítico
   - Resumen meteorológico vial
2. Comparar conteo de KPIs con marcadores visibles en mapa
3. Si hay discrepancia mayor: anotar y reportar (IP-010)

### Paso 4 — Monitoreo activo

1. Observar marcadores de incidentes (colores según tipo)
2. Revisar líneas de congestión (jams)
3. Al recibir actualización automática (~30 s): verificar que KPIs cambian
4. Para foco en zona específica:
   - Seleccionar polígono en lista lateral, o
   - Aplicar filtro por tipo de incidente

### Paso 5 — Consultar detalle de incidente

1. Hacer clic en marcador del mapa
2. Leer popup: tipo, subtipo, ubicación, hora, confianza
3. Si requiere acción: derivar a IP-002 o IP-003 según tipo
4. Cerrar popup y continuar monitoreo

### Paso 6 — Verificación periódica (cada 30 min)

| Verificación | Criterio OK |
|--------------|-------------|
| WebSocket conectado | Indicador verde |
| Última actualización | KPIs cambiaron en últimos 60 s |
| Mapa interactivo | Zoom y clic funcionan |
| Audio activo | Icono altavoz sin tachar |

## 5. Registro

- Logs automáticos: eventos `waze:data_updated` en backend
- Bitácora de turno: anotar eventos relevantes manualmente

## 6. Medición del indicador IP-01

| Campo | Valor |
|-------|-------|
| Fórmula | Tiempo entre dos eventos `waze:data_updated` consecutivos |
| Fuente | Logs backend o consola navegador (F12 → Network → WS) |
| Meta | ≤ 30 segundos |
| Frecuencia | Muestra aleatoria 3 veces por turno |

## 7. Desviaciones

| Situación | Acción |
|-----------|--------|
| Mapa vacío sin incidentes > 5 min | Verificar `/health`; reportar IP-010 |
| Datos con más de 60 s de retraso | Refrescar página; si persiste IP-010 |
| Polígono sin datos | Informar a supervisor para revisar feed Waze |

---

**Aprobación:** _Pendiente_
