# Procedimiento: No Conformidades y Mejora Continua

**Código:** SGC-PWY-PROC-006  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 10.2, 10.3 – No conformidad y mejora continua

---

## 1. Objetivo

Establecer el proceso para identificar, registrar, analizar, corregir y prevenir no conformidades (NC) relacionadas con el Panel Ejecutivo Waze, promoviendo la mejora continua del SGC.

## 2. Alcance

Aplica a NC detectadas en:

- Desarrollo y pruebas de software
- Despliegue y operación en producción
- Documentación del SGC
- Feedback de operadores de sala de control
- Auditorías internas y externas

## 3. Definiciones

| Término | Definición |
|---------|------------|
| NC | Incumplimiento de un requisito (funcional, técnico, documental o de proceso) |
| AC | Acción Correctiva: elimina la causa raíz para evitar recurrencia |
| Acción inmediata | Corrección puntual sin análisis de causa raíz (contención) |

## 4. Fuentes de detección

| Fuente | Ejemplos |
|--------|----------|
| Operador / usuario | Mapa no carga, alertas tardías, TTS sin audio |
| Monitoreo | Health check fallido, logs de error |
| Pruebas | Test fallido en CI, defecto en preprod |
| Auditoría de código | Hallazgos en CODE_AUDIT_REPORT.md |
| Revisión por dirección | Objetivo de calidad no cumplido |

## 5. Clasificación de severidad

| Nivel | Descripción | Tiempo de respuesta | Ejemplo |
|-------|-------------|---------------------|---------|
| **Crítica** | Sistema inoperativo o riesgo operativo | Inmediato (< 1 h) | Backend caído, BD inaccesible |
| **Mayor** | Funcionalidad clave degradada | < 24 h | Polling Waze detenido, login fallido |
| **Menor** | Impacto limitado, workaround disponible | < 5 días | Error visual, filtro no funciona |
| **Observación** | Oportunidad de mejora, sin NC formal | Planificada | Refactor sugerido en auditoría |

## 6. Procedimiento

### 6.1 Detección y registro

1. Identificar la NC (qué, cuándo, dónde, quién detectó).
2. Registrar en el formato de la sección 8 o como issue en GitHub con etiqueta `nc`.
3. Asignar responsable de investigación.
4. Para NC críticas: activar acción inmediata (rollback, hotfix, reinicio de servicio).

### 6.2 Contención (acción inmediata)

| Acción | Cuándo |
|--------|--------|
| Reiniciar servicio NSSM | Servicio no responde |
| Rollback de deploy | Regresión post-release |
| Deshabilitar feature | Módulo defectuoso no crítico |
| Restaurar backup BD | Corrupción de datos |

### 6.3 Análisis de causa raíz

Para NC mayores y críticas, realizar análisis de causa raíz:

1. **¿Qué ocurrió?** — Descripción factual
2. **¿Por qué ocurrió?** — Cadena de causas (5 porqués o diagrama de Ishikawa)
3. **¿Por qué no se detectó antes?** — Falla en pruebas, proceso, revisión
4. **¿Qué se hará para evitar recurrencia?** — AC propuesta

### 6.4 Acción correctiva (AC)

La AC debe ser:

- Específica y medible
- Con responsable y fecha límite
- Verificable (cómo se confirma la eficacia)

**Ejemplos de AC:**

| NC | AC |
|----|-----|
| Deploy sin prueba en preprod | Reforzar checklist de liberación en PROC-004 |
| Timeout en polling Waze | Añadir retry con backoff + alerta en health |
| Documento desactualizado | Actualizar REG-001 y regenerar PDF |

### 6.5 Verificación de eficacia

1. Tras implementar la AC, verificar que la NC no se repite.
2. Plazo de verificación: 30 días para NC mayores, 90 días para críticas.
3. Registrar resultado: **Eficaz** / **No eficaz** (requiere nueva AC).

### 6.6 Cierre

Una NC se cierra cuando:

- La acción inmediata resolvió el síntoma
- La AC se implementó y verificó como eficaz
- La evidencia se registró (commit, PR, actualización de procedimiento)

## 7. Mejora continua (10.3)

Además de las AC por NC, el equipo promueve mejoras proactivas:

| Actividad | Frecuencia |
|-----------|------------|
| Retrospectiva de sprint/release | Por release |
| Actualización de REG-002 (riesgos) | Trimestral |
| Revisión de objetivos de calidad (OQ-01 a OQ-05) | Trimestral |
| Auditoría interna del SGC | Semestral |
| Optimización de rendimiento | Según métricas |

## 8. Formato de registro de NC

| Campo | Valor |
|-------|-------|
| ID NC | NC-PWY-YYYY-NNN |
| Fecha de detección | |
| Detectado por | |
| Descripción | |
| Severidad | Crítica / Mayor / Menor / Observación |
| Acción inmediata | |
| Causa raíz | |
| Acción correctiva | |
| Responsable AC | |
| Fecha límite AC | |
| Verificación de eficacia | |
| Estado | Abierta / En tratamiento / Cerrada |
| Fecha de cierre | |

## 9. Registros

- Issues GitHub con etiqueta `nc` o `bug`
- Tabla de NC (puede mantenerse en este documento o herramienta de tickets)
- Commits de fixes asociados (`fix:` en Conventional Commits)
- Actualizaciones de procedimientos derivadas de AC

## 10. Indicadores

| Indicador | Meta |
|-----------|------|
| NC críticas abiertas > 48 h | 0 |
| AC implementadas en plazo | ≥ 90% |
| Recurrencia de misma NC | 0 |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
