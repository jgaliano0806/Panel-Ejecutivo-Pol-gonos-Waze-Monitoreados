# Instructivo IP-010: Gestión de incidencias operativas

**Código:** SGC-PWY-IP-010  
**Proceso:** PRO-OP-010  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Operador (detecta), Supervisor (gestiona)  
**Indicador:** IP-06 — 0 NC críticas abiertas > 48 h  
**Vinculación:** PROC-006 (No conformidades)

---

## 1. Objetivo

Detectar, clasificar, escalar y resolver incidencias operativas del Panel Ejecutivo Waze.

## 2. Tipos de incidencia

| Tipo | Ejemplos |
|------|----------|
| **Funcional** | Mapa vacío, filtros no funcionan, export PDF falla |
| **Rendimiento** | Datos con > 60 s de retraso, lentitud general |
| **Audio/TTS** | Sin sonido, TTS no habla, sirena ausente |
| **Conectividad** | WebSocket desconectado, login fallido |
| **Datos** | Incidente falso, clima incorrecto, conteo erróneo |

## 3. Instructivo — Detección y contención (Operador)

### Paso 1 — Identificar

1. Detectar comportamiento anómalo durante operación normal
2. Anotar: fecha, hora, módulo, descripción, captura de pantalla

### Paso 2 — Resolución básica

| Problema | Acción inmediata |
|----------|------------------|
| Mapa no carga | F5 (refrescar) |
| Sin audio | Clic en altavoz (IP-009 paso 4) |
| WebSocket desconectado | F5; si persiste → Paso 3 |
| Login fallido | Verificar credenciales; reintentar |
| Datos desactualizados | Esperar 30 s; F5 si persiste |

### Paso 3 — Escalar si persiste

1. Contactar supervisor (teléfono o canal interno)
2. Enviar: descripción + captura + hora de inicio
3. Continuar operación con workaround si existe (ej. usar otro módulo)

## 4. Instructivo — Gestión (Supervisor)

### Paso 1 — Clasificar severidad

| Nivel | Criterio | Tiempo de respuesta |
|-------|----------|---------------------|
| **Crítica** | Sistema inoperativo, sala de control ciega | < 1 hora |
| **Mayor** | Funcionalidad clave degradada | < 24 horas |
| **Menor** | Impacto limitado, workaround disponible | < 5 días |
| **Observación** | Mejora sugerida, sin impacto operativo | Planificada |

### Paso 2 — Registrar NC

1. Asignar ID: `NC-PWY-YYYY-NNN`
2. Completar formulario (PROC-006 sección 8):

| Campo | Valor |
|-------|-------|
| ID NC | NC-PWY-____-___ |
| Fecha detección | |
| Detectado por | |
| Descripción | |
| Severidad | |
| Acción inmediata | |
| Estado | Abierta |

### Paso 3 — Escalar según severidad

| Severidad | Escalamiento |
|-----------|--------------|
| Crítica | Contactar GED + admin sistemas inmediatamente |
| Mayor | Crear ticket GED con prioridad alta |
| Menor | Ticket GED prioridad normal |

### Paso 4 — Seguimiento

1. Verificar resolución con operador
2. Confirmar que el problema no recurre
3. Cerrar NC con fecha y evidencia

### Paso 5 — Acción correctiva (si recurrencia)

1. Analizar causa raíz (5 porqués)
2. Definir AC con responsable y fecha límite
3. Verificar eficacia a 30 días

## 5. Medición del indicador IP-06

| Campo | Valor |
|-------|-------|
| Fórmula | Conteo de NC con severidad Crítica y estado Abierta > 48 h |
| Fuente | Registro de NC (PROC-006) |
| Meta | 0 |
| Frecuencia | Revisión semanal por Responsable de Calidad |

## 6. Contactos de escalamiento

| Nivel | Contacto | Canal |
|-------|----------|-------|
| Supervisor de turno | Según organigrama CASISA | Teléfono interno |
| GED (desarrollo) | Equipo GED | Ticket / email interno |
| Admin sistemas | Administrador servidor | Ticket infraestructura |

## 7. Desviaciones del instructivo

Si una NC crítica supera 48 h sin cierre:

1. Escalar a Responsable del Proyecto
2. Registrar desviación en revisión por dirección (cláusula 9.3)
3. Implementar AC de emergencia

---

**Aprobación:** _Pendiente_
