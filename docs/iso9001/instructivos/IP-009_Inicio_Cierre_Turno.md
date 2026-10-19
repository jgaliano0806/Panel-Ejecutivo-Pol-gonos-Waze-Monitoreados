# Instructivo IP-009: Inicio y cierre de turno

**Código:** SGC-PWY-IP-009  
**Proceso:** PRO-OP-009  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador de sala de control  
**Indicador:** IP-05 — 100% turnos con audio habilitado al inicio

---

## 1. Objetivo

Estandarizar el inicio y cierre de cada turno de monitoreo para garantizar continuidad operativa.

## 2. Instructivo — Inicio de turno

### Checklist de inicio (completar en orden)

| # | Paso | Verificación | OK |
|---|------|--------------|-----|
| 1 | Encender equipo de sala de control | Pantalla y red activas | ☐ |
| 2 | Abrir navegador → `http://10.1.0.136/` | Página de login visible | ☐ |
| 3 | Iniciar sesión con credenciales personales | Redirige a `/mapa` | ☐ |
| 4 | **Clic en icono de audio (altavoz)** | Icono activo, sin tachar | ☐ |
| 5 | Verificar indicador WebSocket | Estado **Conectado** (verde) | ☐ |
| 6 | Verificar mapa carga con polígonos | Polígonos visibles | ☐ |
| 7 | Revisar KPIs: incidentes activos | Números coherentes | ☐ |
| 8 | Ir a `/notificaciones` | Revisar pendientes del turno anterior | ☐ |
| 9 | Recibir relevo del operador saliente | Situación actual comunicada | ☐ |
| 10 | Anotar en bitácora: hora inicio, operador, novedades | Bitácora actualizada | ☐ |

### Paso crítico — Audio (IP-05)

> **OBLIGATORIO:** El paso 4 (habilitar audio) debe completarse en **todos** los turnos.
> El supervisor verifica al cierre del día que el 100% de turnos registraron audio habilitado.

### Verificación opcional de salud

```powershell
# Desde navegador o terminal
http://10.1.0.136/health
# Respuesta esperada: HTTP 200
```

## 3. Instructivo — Durante el turno

1. Ejecutar IP-001 (monitoreo continuo)
2. Atender alertas según IP-002 e IP-003
3. Registrar siniestros según IP-004 si ocurren
4. Anotar incidencias del sistema según IP-010

## 4. Instructivo — Cierre de turno

### Checklist de cierre

| # | Paso | Verificación | OK |
|---|------|--------------|-----|
| 1 | Informar al relevo: incidentes activos, zonas críticas | Comunicación verbal completada | ☐ |
| 2 | Informar alertas pendientes no atendidas | Relevo informado | ☐ |
| 3 | Marcar notificaciones propias como leídas o informar | Sin pendientes ocultos | ☐ |
| 4 | Anotar en bitácora: hora cierre, novedades del turno | Bitácora actualizada | ☐ |
| 5 | Cerrar sesión (sidebar → Cerrar sesión) | Redirige a login | ☐ |
| 6 | Bloquear o apagar equipo según política CASISA | Equipo seguro | ☐ |

## 5. Plantilla bitácora de turno

```
BITÁCORA DE TURNO — Panel Waze
Fecha: ____/____/____

INICIO
Hora: ______  Operador: ______________  Relevo de: ______________
Audio habilitado: SÍ ☐  NO ☐
WebSocket OK: SÍ ☐  NO ☐
Novedades del turno anterior: _________________________________

DURANTE EL TURNO
| Hora | Evento / Acción                          |
|------|------------------------------------------|
|      |                                          |

CIERRE
Hora: ______  Relevo a: ______________
Incidentes activos al cierre: ______________
Novedades para próximo turno: _________________________________
```

## 6. Medición del indicador IP-05

| Campo | Valor |
|-------|-------|
| Fórmula | (Turnos con audio=SÍ / Total turnos del día) × 100 |
| Fuente | Bitácora de turno, campo "Audio habilitado" |
| Meta | 100% diario |
| Responsable | Supervisor al cierre del día |

## 7. Desviaciones

| Situación | Acción |
|-----------|--------|
| No se pudo habilitar audio | Probar otro navegador; reportar IP-010 |
| Relevo ausente | Informar a supervisor; no cerrar sesión hasta relevo |

---

**Aprobación:** _Pendiente_
