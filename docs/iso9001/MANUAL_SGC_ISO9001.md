# Manual del Sistema de Gestión de la Calidad

**Código:** SGC-PWY-001  
**Proyecto:** Panel Ejecutivo Waze – Monitoreo de Tráfico en Tiempo Real  
**Organización:** CASISA – Caminos de las Sierras  
**Norma de referencia:** ISO 9001:2015  
**Versión:** 1.1  
**Fecha:** Junio 2026  
**Estado:** Vigente

---

## Tabla de contenidos

1. [Introducción](#1-introducción)
2. [Alcance del SGC](#2-alcance-del-sgc)
3. [Referencias normativas](#3-referencias-normativas)
4. [Términos y definiciones](#4-términos-y-definiciones)
5. [Contexto de la organización](#5-contexto-de-la-organización)
6. [Liderazgo](#6-liderazgo)
7. [Planificación](#7-planificación)
8. [Apoyo](#8-apoyo)
9. [Operación](#9-operación)
10. [Evaluación del desempeño](#10-evaluación-del-desempeño)
11. [Mejora](#11-mejora)
12. [Matriz de procedimientos](#12-matriz-de-procedimientos)

---

## 1. Introducción

### 1.1 Propósito

Este manual establece el Sistema de Gestión de la Calidad (SGC) aplicable al desarrollo, mantenimiento y operación del **Panel Ejecutivo Waze**, sistema interno de CASISA para el monitoreo en tiempo real del tráfico vehicular en la red de autopistas de Córdoba, Argentina.

El panel integra el feed de Waze, notificaciones en vivo, síntesis de voz (TTS), mapas interactivos y gestión de polígonos de monitoreo para la sala de control operativa.

### 1.2 Visión del producto

| Atributo | Descripción |
|----------|-------------|
| Nombre comercial | Panel Ejecutivo Waze |
| Versión del software | 2.0.0 |
| Tipo de producto | Aplicación web de monitoreo operativo |
| Usuarios objetivo | Operadores de sala de control, supervisores, administradores |
| Entorno productivo | Windows Server 2022 (`10.1.0.136`) |
| Equipo desarrollador | GED – CASISA |

---

## 2. Alcance del SGC

### 2.1 Alcance del sistema de gestión de la calidad

El SGC abarca el ciclo de vida completo del Panel Ejecutivo Waze:

- Análisis y definición de requisitos
- Diseño y arquitectura de software
- Desarrollo (frontend React, backend Fastify, paquetes compartidos)
- Pruebas (unitarias, integración, E2E)
- Despliegue en entornos preprod y producción
- Mantenimiento correctivo y evolutivo
- Gestión de incidentes operativos y no conformidades

### 2.2 Exclusiones

No se excluyen requisitos de ISO 9001:2015. Los procesos de adquisición de hardware y licencias de terceros (Waze CCP, Open-Meteo) se gestionan conforme a los procedimientos corporativos de CASISA y se documentan como entradas del proceso de operación.

### 2.3 Límites físicos y organizacionales

| Límite | Detalle |
|--------|---------|
| Organización | CASISA – Caminos de las Sierras |
| Ubicación del código | Repositorio Git `Panel-Waze-Monitoreados` |
| Servidor productivo | `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados` |
| Ramas de control | `main` (producción), `preprod` (staging), `feat/*`, `fix/*` |

---

## 3. Referencias normativas

| Referencia | Título |
|------------|--------|
| ISO 9001:2015 | Sistemas de gestión de la calidad – Requisitos |
| ISO 9000:2015 | Sistemas de gestión de la calidad – Fundamentos y vocabulario |
| ISO/IEC 12207:2017 | Procesos del ciclo de vida del software |
| Conventional Commits | Estándar de mensajes de commit del proyecto |

---

## 4. Términos y definiciones

| Término | Definición |
|---------|------------|
| SGC | Sistema de Gestión de la Calidad |
| NC | No Conformidad: incumplimiento de un requisito |
| AC | Acción Correctiva: acción para eliminar la causa de una NC |
| PR | Pull Request: solicitud de integración de código |
| Preprod | Entorno de pre-producción para validación antes de `main` |
| Evidencia | Registro que demuestra la conformidad con un requisito |
| Parte interesada | Persona u organización que puede afectar o ser afectada por el proyecto |

---

## 5. Contexto de la organización

### 5.1 Comprensión de la organización y su contexto (4.1)

CASISA opera infraestructura vial de peaje en Córdoba. El Panel Ejecutivo Waze responde a la necesidad de visibilidad en tiempo real sobre incidentes, congestión y condiciones meteorológicas en los corredores monitoreados.

**Factores internos:**

- Equipo GED con competencias en desarrollo full-stack (TypeScript, React, Node.js)
- Infraestructura Windows Server con PostgreSQL y servicios NSSM
- Monorepo con workspaces npm para mantenibilidad

**Factores externos:**

- Disponibilidad del feed Waze CCP (Partners)
- Conectividad de red LAN y acceso a APIs meteorológicas (Open-Meteo)
- Requisitos regulatorios de operación vial y seguridad de la información

### 5.2 Partes interesadas y sus requisitos (4.2)

| Parte interesada | Requisitos | Cómo se satisface |
|------------------|------------|-------------------|
| Operadores de sala de control | Alertas en tiempo real, mapa legible, TTS, zonas peligrosas | WebSocket, MapLibre GL, Edge TTS, `red_zone_critical_alert` |
| Supervisores | KPIs, histórico, siniestros, gestión de polígonos | Dashboard, `/estadisticas`, módulo RAC |
| Administradores de sistema | Despliegue confiable, logs, health checks | NSSM, `/health`, scripts de reinicio |
| GED / Desarrollo | Código mantenible, CI, documentación | Monorepo, lint, typecheck, docs |
| CASISA (Gerencia) | Disponibilidad operativa, trazabilidad de cambios | Flujo preprod → main, registros Git |

### 5.3 Determinación del alcance del SGC

Ver sección 2 de este manual.

---

## 6. Liderazgo

### 6.1 Compromiso de la dirección (5.1)

La dirección de CASISA respalda el SGC del proyecto mediante:

- Asignación de recursos (servidor, licencias, tiempo del equipo GED)
- Definición de objetivos de calidad medibles (sección 7.2)
- Revisión periódica del desempeño del sistema

### 6.2 Política de calidad del proyecto (5.2)

> **Política de Calidad – Panel Ejecutivo Waze**
>
> CASISA se compromete a entregar y mantener un panel de monitoreo confiable, seguro y actualizado que apoye la toma de decisiones operativas en la sala de control. El equipo GED desarrolla software con trazabilidad de cambios, pruebas sistemáticas, documentación vigente y mejora continua conforme a ISO 9001:2015.

**Principios:**

1. **Confiabilidad:** El sistema debe estar disponible para operación 24/7 en producción.
2. **Trazabilidad:** Todo cambio de código se registra en Git con mensajes convencionales.
3. **Seguridad:** Autenticación JWT, RBAC y validación de entradas en todos los endpoints.
4. **Mejora continua:** Las NC se registran, analizan y se implementan acciones correctivas.

### 6.3 Roles y responsabilidades (5.3)

| Rol | Responsabilidades |
|-----|-------------------|
| Responsable del Proyecto | Aprobación de releases, priorización, revisión de riesgos |
| Líder Técnico / Desarrollador | Implementación, revisión de código, arquitectura |
| Responsable de Calidad | Auditorías internas, control documental, seguimiento de NC |
| Operador / Usuario final | Reporte de incidencias, validación funcional en preprod |
| Administrador de sistemas | Despliegue NSSM, backups BD, monitoreo de servicios |

---

## 7. Planificación

### 7.1 Riesgos y oportunidades (6.1)

El registro de riesgos y oportunidades se mantiene en [REG-002_Registro_Riesgos.md](./REG-002_Registro_Riesgos.md).

**Riesgos principales identificados:**

| ID | Riesgo | Mitigación |
|----|--------|------------|
| R-01 | Caída del feed Waze | Reintentos, logs, alertas de health check |
| R-02 | Despliegue sin prueba en preprod | Flujo obligatorio preprod → main |
| R-03 | Pérdida de datos en BD | Backups PostgreSQL, migraciones versionadas |
| R-04 | Vulnerabilidad de seguridad | JWT, RBAC, rate limiting, validación de inputs |

### 7.2 Objetivos de calidad (6.2)

| ID | Objetivo | Indicador | Meta | Frecuencia de medición |
|----|----------|-----------|------|------------------------|
| OQ-01 | Disponibilidad del servicio | Uptime del endpoint `/health` | ≥ 99% mensual | Mensual |
| OQ-02 | Calidad de código | Resultado de `npm run lint` y `typecheck` | 0 errores en CI | Por commit/PR |
| OQ-03 | Cobertura de pruebas | Tests unitarios y E2E ejecutados | 100% pasan antes de merge a preprod | Por PR |
| OQ-04 | Tiempo de actualización de datos Waze | Latencia ciclo de polling | ≤ 30 segundos | Semanal |
| OQ-05 | Documentación vigente | Registros en REG-001 actualizados | 100% docs críticos con versión | Trimestral |

### 7.3 Planificación de cambios (6.3)

Los cambios al SGC se gestionan mediante [PROC-001_Control_Documentos.md](./PROC-001_Control_Documentos.md). Toda modificación de procedimiento requiere actualización de versión, fecha y registro en REG-001.

---

## 8. Apoyo

### 8.1 Recursos (7.1)

| Recurso | Especificación |
|---------|----------------|
| Servidor productivo | Windows Server 2022, 4+ GB RAM, PostgreSQL 18.3 |
| Herramientas de desarrollo | Node.js 20+ (mín. 18), npm 8+, Git, VS Code/Cursor |
| CI/CD | GitHub Actions: lint, security audit, build, E2E, deploy automático en `main` |
| Reverse proxy | nginx :80 en producción (PanelWazeNginx via NSSM) |
| Monitoreo | Health checks (`/health`, `/health/ready`, `/health/live`) |

### 8.2 Competencia (7.2)

El equipo GED debe poseer competencia en:

- TypeScript, React, Fastify, PostgreSQL
- Git y flujo de ramas (preprod → main)
- Despliegue Windows con NSSM
- Lectura de documentación técnica del proyecto

La evidencia de competencia se registra mediante formación interna, commits y revisiones de PR.

### 8.3 Toma de conciencia (7.3)

Todo miembro del equipo debe conocer:

- La política de calidad del proyecto
- Su rol y responsabilidades
- El impacto de no conformidades en la operación de sala de control
- Los canales de reporte de incidencias

### 8.4 Comunicación (7.4)

| Tipo | Canal | Frecuencia |
|------|-------|------------|
| Cambios de código | Pull Requests en GitHub | Por cambio |
| Releases | Merge preprod → main | Según planificación |
| Incidencias operativas | Canal interno GED / tickets | Inmediato |
| Revisión de desempeño | Reunión de proyecto | Trimestral |

### 8.5 Información documentada (7.5)

El control de documentos y registros se define en [PROC-001_Control_Documentos.md](./PROC-001_Control_Documentos.md).

**Tipos de información documentada:**

| Tipo | Ejemplos | Control |
|------|----------|---------|
| Manual del SGC | Este documento | Versión, aprobación |
| Procedimientos | PROC-001 a PROC-006 | Código, versión, fecha |
| Registros | Commits Git, PRs, logs, auditorías | Inmutables, fechados |
| Documentación técnica | ARCHITECTURE.md, API.md | Versión en repositorio |

---

## 9. Operación

### 9.1 Planificación y control operacional (8.1)

La operación del software se planifica mediante:

1. Definición de requisitos (REQUISITOS_SISTEMA.md, historias de usuario)
2. Diseño (ARCHITECTURE.md)
3. Desarrollo (PROC-002)
4. Verificación (PROC-004)
5. Liberación (PROC-003, PROC-005)

### 9.2 Requisitos para productos y servicios (8.2)

| Fuente de requisitos | Documento |
|---------------------|-----------|
| Operación de sala de control | Requisitos funcionales del dashboard |
| Integración Waze | Feed CCP, catálogos de incidentes |
| Infraestructura | REQUISITOS_SISTEMA.md |
| Seguridad | JWT, RBAC, HTTPS en producción |

### 9.3 Diseño y desarrollo (8.3)

Ver [PROC-002_Desarrollo_Software.md](./PROC-002_Desarrollo_Software.md).

**Resumen del proceso:**

```
Requisitos → Diseño → Implementación → Revisión de código → Pruebas → Integración preprod → Validación → Producción
```

### 9.4 Control de procesos externos (8.4)

| Proveedor externo | Servicio | Control |
|-------------------|----------|---------|
| Waze (Google) | Feed de tráfico CCP | Monitoreo de disponibilidad, logs de polling |
| Open-Meteo | Datos meteorológicos | Fallback, logs de errores HTTP |
| Microsoft | Edge TTS | Configuración de voces, límites de cuota |

### 9.5 Producción y provisión del servicio (8.5)

| Subproceso | Procedimiento |
|------------|---------------|
| Despliegue | PROC-005, INSTRUCTIVO_DESPLIEGUE.md |
| Identificación y trazabilidad | Commits Git, tags de versión |
| Propiedad del cliente | Datos en PostgreSQL de CASISA |
| Preservación | Backups BD, retención histórica 90 días |
| Actividades posteriores | Mantenimiento, hotfixes documentados |
| Control de cambios | PROC-003 |
| Liberación | Merge preprod → main con validación |

### 9.6 Liberación de productos y servicios (8.6)

**Criterios de liberación a producción (`main`):**

- [ ] PR aprobado y mergeado en `preprod`
- [ ] Pruebas en preprod exitosas (smoke, regresión del módulo)
- [ ] `npm run lint` y `npm run typecheck` sin errores
- [ ] Documentación actualizada si aplica
- [ ] Sin NC abiertas bloqueantes

---

## 10. Evaluación del desempeño

### 10.1 Seguimiento, medición, análisis (9.1)

| Qué se mide | Cómo | Responsable |
|------------|------|-------------|
| Disponibilidad | Health checks, logs NSSM | Admin sistemas |
| Errores de aplicación | Logs backend (`LOG_LEVEL`) | GED |
| Calidad de código | Lint, typecheck, auditorías | GED |
| Satisfacción operador | Feedback en validación preprod | Responsable proyecto |

### 10.2 Auditoría interna (9.2)

**Frecuencia:** Semestral o ante cambios mayores de arquitectura.

**Alcance de auditoría:**

- Cumplimiento del flujo preprod → main
- Vigencia de documentación (REG-001)
- Evidencia de pruebas en últimos releases
- Estado de NC y AC abiertas

**Evidencia:** Informes en `apps/frontend/docs/` y `apps/backend/docs/`.

### 10.3 Revisión por la dirección (9.3)

**Entradas:** Objetivos de calidad (7.2), resultados de auditorías, feedback de operadores, riesgos (REG-002).

**Salidas:** Decisiones sobre mejoras, recursos, cambios al SGC.

**Frecuencia:** Trimestral.

---

## 11. Mejora

### 11.1 Generalidades (10.1)

El equipo identifica oportunidades de mejora mediante retrospectivas, auditorías de código y análisis de incidentes operativos.

### 11.2 No conformidad y acción correctiva (10.2)

Ver [PROC-006_No_Conformidades_Mejora.md](./PROC-006_No_Conformidades_Mejora.md).

### 11.3 Mejora continua (10.3)

El SGC se mejora continuamente mediante:

- Actualización de procedimientos tras lecciones aprendidas
- Refactorización planificada en ramas dedicadas
- Optimización de rendimiento (polling, BD, caché Redis)
- Incorporación de feedback de operadores

---

## 12. Matriz de procedimientos

| Código | Procedimiento | Cláusula ISO |
|--------|---------------|--------------|
| SGC-PWY-PROC-001 | Control de documentos y registros | 7.5 |
| SGC-PWY-PROC-002 | Desarrollo de software | 8.3 |
| SGC-PWY-PROC-003 | Gestión de cambios | 8.5.6 |
| SGC-PWY-PROC-004 | Pruebas y verificación | 8.3.4, 8.6 |
| SGC-PWY-PROC-005 | Despliegue y mantenimiento | 8.5.1, 8.5.5 |
| SGC-PWY-PROC-006 | No conformidades y mejora continua | 10.2, 10.3 |
| SGC-PWY-MU-001 | Manual de Usuario | 7.2, 7.3, 8.5 |
| SGC-PWY-MP-001 | Manual de Procesos Operativos | 8.1, 8.5 |
| SGC-PWY-RP-001…010 | Registros de procesos operativos | 7.5.2, 8.5.1 |
| SGC-PWY-REG-001 | Registro maestro de documentación | 7.5.3 |
| SGC-PWY-REG-002 | Registro de riesgos y oportunidades | 6.1 |

---

**Fin del documento SGC-PWY-001**

| Campo | Valor |
|-------|-------|
| Elaborado por | GED – CASISA |
| Revisado por | _Pendiente_ |
| Aprobado por | _Pendiente_ |
| Próxima revisión | Diciembre 2026 |
