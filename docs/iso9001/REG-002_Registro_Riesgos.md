# Registro de Riesgos y Oportunidades

**Código:** SGC-PWY-REG-002  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 6.1 – Acciones para abordar riesgos y oportunidades

---

## 1. Propósito

Identificar, evaluar y gestionar los riesgos y oportunidades que pueden afectar la conformidad del Panel Ejecutivo Waze con sus requisitos y la eficacia del SGC.

## 2. Metodología de evaluación

| Parámetro | Escala |
|-----------|--------|
| **Probabilidad** | 1 (Muy baja) – 5 (Muy alta) |
| **Impacto** | 1 (Mínimo) – 5 (Crítico) |
| **Nivel de riesgo** | Probabilidad × Impacto |

| Nivel | Rango | Acción |
|-------|-------|--------|
| Bajo | 1–6 | Monitorear |
| Medio | 7–14 | Mitigar |
| Alto | 15–25 | Mitigar urgentemente + plan de contingencia |

## 3. Registro de riesgos

| ID | Riesgo | Prob. | Imp. | Nivel | Mitigación | Responsable | Estado |
|----|--------|-------|------|-------|------------|-------------|--------|
| R-01 | Indisponibilidad del feed Waze CCP | 3 | 5 | 15 | Reintentos automáticos, logs, alertas health check, monitoreo de ciclo polling | GED | Activo |
| R-02 | Despliegue a producción sin validación en preprod | 2 | 5 | 10 | Flujo obligatorio preprod → main (PROC-003) | GED | Activo |
| R-03 | Pérdida o corrupción de datos en PostgreSQL | 2 | 5 | 10 | Backups diarios, migraciones versionadas, rollback documentado | Admin sistemas | Activo |
| R-04 | Vulnerabilidad de seguridad (acceso no autorizado) | 2 | 5 | 10 | JWT, RBAC, rate limiting, validación de inputs, HTTPS | GED | Activo |
| R-05 | Saturación de BD por crecimiento de histórico | 3 | 3 | 9 | Retención 30 días snapshots/TVT (migr. 049), 90 días notifications | GED | Activo |
| R-06 | Fallo de servicio NSSM en Windows Server | 2 | 4 | 8 | Scripts de reinicio, monitoreo health, documentación PROC-005 | Admin sistemas | Activo |
| R-07 | Dependencia de APIs externas (Open-Meteo, Edge TTS) | 3 | 3 | 9 | Fallback en memoria, logs de errores, voces alternativas | GED | Activo |
| R-08 | Pérdida de conocimiento (rotación de personal GED) | 2 | 4 | 8 | Documentación SGC, README, procedimientos ISO | Responsable proyecto | Activo |
| R-09 | Regresión por cambio en paquetes compartidos | 3 | 3 | 9 | Tests unitarios, typecheck, revisión de PR | GED | Activo |
| R-10 | Indisponibilidad de Redis (rate limiting) | 3 | 2 | 6 | Fallback en memoria implementado en backend | GED | Activo |

## 4. Registro de oportunidades

| ID | Oportunidad | Beneficio esperado | Acción propuesta | Responsable | Estado |
|----|-------------|-------------------|------------------|-------------|--------|
| O-01 | Migración a WebSocket puro (sin polling frontend) | Menor latencia, menor carga de red | Ya implementado: broadcast `waze:data_updated` | GED | Implementado |
| O-02 | Caché Redis para feeds Waze y clima | Menor carga en BD y APIs externas | Configurar Redis/Memurai en producción | Admin sistemas | Planificado |
| O-03 | Dashboard de KPIs / risk scoring por grupo | Mejor visibilidad para supervisores | Backend en `risk.routes.ts` (`ENABLE_RISK_SCORING=1`); frontend no integrado en main | GED | Backend listo, UI pendiente |
| O-04 | Automatización de CI/CD completo | Menor error humano en deploy | GitHub Actions + deploy NSSM/nginx con rollback | GED | **Implementado** |
| O-05 | Certificación SSL/HTTPS en producción | Seguridad y cumplimiento | Configurar certificado en Nginx/reverse proxy | Admin sistemas | Planificado |

## 5. Revisión

| Fecha revisión | Revisado por | Cambios |
|----------------|--------------|---------|
| 2026-06-08 | GED | Emisión inicial con 10 riesgos y 5 oportunidades |
| _Próxima: 2026-12-08_ | | |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
