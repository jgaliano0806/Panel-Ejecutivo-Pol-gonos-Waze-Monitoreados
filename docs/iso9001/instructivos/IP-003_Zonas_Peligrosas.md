# Instructivo IP-003: Respuesta a zonas peligrosas

**Código:** SGC-PWY-IP-003  
**Proceso:** PRO-OP-003  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador de sala de control  
**Indicador:** IP-03 — Alerta sonora en ≤ 5 s

---

## 1. Objetivo

Este instructivo describe cómo responder de inmediato cuando un incidente Waze ocurre dentro de una zona peligrosa configurada (geofencing RAC).

## 2. Disparador

- Evento WebSocket `red_zone_critical_alert`
- **Sirena** + TTS prioritario (diferente de alerta estándar)

## 3. Precondiciones

- [ ] Audio **obligatoriamente** habilitado
- [ ] Permiso `danger_zones.view`
- [ ] Conocimiento de protocolo CASISA para zonas críticas

## 4. Instructivo paso a paso

### Paso 1 — Reconocer alerta crítica

1. Al escuchar **sirena** (no solo beep): es zona peligrosa
2. Anotar hora exacta de la sirena (indicador IP-03)
3. Escuchar mensaje TTS prioritario completo
4. **No esperar** segunda alerta por `notification:new` (está deduplicada)

### Paso 2 — Identificar en mapa

1. Ir a `/mapa` o `/zonas-peligrosas`
2. Localizar zona peligrosa resaltada
3. Identificar marcador del incidente dentro de la zona
4. Leer popup: tipo, ubicación, nivel de peligrosidad de la zona

### Paso 3 — Evaluar riesgo

| Nivel zona | Acción inmediata |
|------------|------------------|
| Extrema | Activar protocolo de emergencia CASISA |
| Alta | Comunicar a patrulla y supervisor |
| Media | Monitoreo reforzado + comunicación preventiva |

### Paso 4 — Activar protocolo operativo

1. Comunicar por canal oficial CASISA:
   - Nombre de la zona peligrosa
   - Tipo de incidente
   - Ubicación y km de referencia
   - Hora del evento
2. Esperar confirmación de recepción
3. Mantener monitoreo en mapa hasta resolución del incidente

### Paso 5 — Seguimiento

1. Verificar cada 5 min si el incidente sigue activo
2. Si el incidente se resuelve (marcador desaparece): informar cierre
3. Registrar acciones en bitácora de turno

### Paso 6 — Edición de zonas (solo con `danger_zones.edit`)

1. Ir a `/zonas-peligrosas`
2. Para crear: dibujar polígono → nombre + nivel
3. Para modificar: seleccionar zona → editar geometría o atributos
4. Para eliminar: confirmar con supervisor antes de borrar

## 5. Medición del indicador IP-03

| Campo | Valor |
|-------|-------|
| Fórmula | Tiempo entre emisión backend y primera sirena en cliente |
| Método | Comparar timestamp del evento WS con hora anotada por operador |
| Meta | ≤ 5 segundos |
| Frecuencia | Por cada evento de zona peligrosa |

## 6. Desviaciones

| Situación | Acción |
|-----------|--------|
| Sirena sin sonido | Verificar audio (IP-009); reportar IP-010 |
| Incidente fuera de zona visible | Refrescar mapa; verificar en `/zonas-peligrosas` |
| Zona mal configurada | Escalar a administrador (IP-007) |

---

**Aprobación:** _Pendiente_
