# Instructivo IP-002: Gestión de alertas y notificaciones

**Código:** SGC-PWY-IP-002  
**Proceso:** PRO-OP-002  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador de sala de control  
**Indicador:** IP-02 — ≥ 95% alertas atendidas en < 2 min

---

## 1. Objetivo

Este instructivo describe cómo atender las alertas Waze en tiempo real, evaluar su severidad y registrar el tratamiento aplicado.

## 2. Disparadores

- Evento WebSocket `notification:new`
- Snackbar flotante en mapa
- Contador de notificaciones incrementado

## 3. Precondiciones

- [ ] Audio habilitado (IP-009)
- [ ] Permiso `notifications.view`
- [ ] Módulo mapa o notificaciones accesible

## 4. Instructivo paso a paso

### Paso 1 — Recepción de alerta

1. Al sonar beep o aparecer snackbar: **detener otra tarea** y leer alerta
2. Anotar hora de recepción (para indicador IP-02)
3. Leer: tipo de incidente, ubicación, polígono afectado
4. Si TTS activo: escuchar mensaje de voz completo

### Paso 2 — Evaluación de severidad

| Severidad | Criterio | Acción |
|-----------|----------|--------|
| Alta | Accidente mayor, vía cerrada, múltiples reportes | Comunicar inmediatamente a patrulla/supervisor |
| Media | Congestión severa, peligro en calzada | Monitorear evolución; comunicar si persiste > 15 min |
| Baja | Incidente menor, reporte aislado | Registrar y monitorear |

### Paso 3 — Verificar en mapa

1. Localizar marcador correspondiente en `/mapa`
2. Confirmar que coincide con la alerta recibida
3. Si es zona peligrosa: **derivar a IP-003** (no duplicar atención)

### Paso 4 — Registrar atención

1. Ir a `/notificaciones`
2. Localizar la alerta en el listado
3. Presionar para marcar como **leída**
4. Si requiere seguimiento: anotar en bitácora de turno

### Paso 5 — Comunicación externa (si aplica)

1. Contactar patrulla o gerencia según protocolo CASISA
2. Informar: tipo, ubicación, km de referencia, hora
3. Anotar hora de comunicación en bitácora

### Paso 6 — Cierre de la alerta

1. Verificar que la alerta está marcada como leída
2. Calcular tiempo de atención: recepción → marcada leída
3. Meta: **< 2 minutos**

## 5. Medición del indicador IP-02

| Campo | Valor |
|-------|-------|
| Fórmula | (Alertas atendidas en < 2 min / Total alertas del turno) × 100 |
| Registro | Bitácora de turno con hora recepción y hora atención |
| Meta | ≥ 95% diario |
| Responsable medición | Supervisor al cierre de turno |

## 6. Plantilla de registro (bitácora)

```
Fecha: ____/____/____  Turno: ______  Operador: ______________

| Hora alerta | Tipo        | Ubicación     | Hora atendida | Δ min | OK/NOK |
|-------------|-------------|---------------|---------------|-------|--------|
|             |             |               |               |       |        |
```

## 7. Desviaciones

| Situación | Acción |
|-----------|--------|
| Alerta duplicada | Marcar una; ignorar duplicado (deduplicación activa) |
| Falsa alarma | Marcar leída; reportar IP-010 si recurrente |
| Sin audio en alerta | Verificar icono altavoz; ejecutar IP-009 paso 4 |

---

**Aprobación:** _Pendiente_
