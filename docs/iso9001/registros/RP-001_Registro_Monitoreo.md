# Registro RP-001: Verificación de monitoreo en tiempo real

**Código:** SGC-PWY-RP-001  
**Proceso:** PRO-OP-001 | **Instructivo:** IP-001  
**Indicador:** IP-01 — Actualización de datos ≤ 30 s  
**Retención:** 90 días | **Versión:** 1.0

## Uso del registro

Complete este formulario en cada turno de monitoreo para documentar la evidencia del indicador IP-01, conforme al instructivo IP-001.

---

## Datos del registro

| Campo | Valor |
|-------|-------|
| ID registro | RP-001-________ |
| Fecha | ____/____/____ |
| Turno | Mañana / Tarde / Noche |
| Operador | |
| Supervisor | |

---

## Muestreo de actualización de datos (IP-01)

Realizar **3 mediciones** por turno. Registrar tiempo entre eventos `waze:data_updated` consecutivos.

| Muestra | Hora inicio | Hora actualización | Δ segundos | ≤ 30 s (Sí/No) |
|---------|-------------|-------------------|------------|----------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Promedio del turno:** ______ segundos  
**Meta IP-01:** ≤ 30 s — **Cumple:** Sí ☐  No ☐

---

## Checklist de verificación (cada 30 min)

| Hora | WebSocket OK | Mapa OK | KPIs coherentes | Audio activo | Observaciones |
|------|--------------|---------|-----------------|--------------|---------------|
| | ☐ | ☐ | ☐ | ☐ | |
| | ☐ | ☐ | ☐ | ☐ | |
| | ☐ | ☐ | ☐ | ☐ | |

---

## Incidencias del turno relacionadas con monitoreo

| Hora | Descripción | Acción tomada | Derivado a RP-010 |
|------|-------------|---------------|-------------------|
| | | | Sí ☐  No ☐ |

---

## Cierre

| Campo | Valor |
|-------|-------|
| Firma operador | _________________________ |
| Firma supervisor (revisión) | _________________________ |
| Fecha cierre | ____/____/____ |
