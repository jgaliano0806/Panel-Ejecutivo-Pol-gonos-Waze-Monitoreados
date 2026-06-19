# Procedimiento: Gestión de Cambios

**Código:** SGC-PWY-PROC-003  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 8.5.6 – Control de cambios

---

## 1. Objetivo

Asegurar que los cambios al Panel Ejecutivo Waze se identifican, evalúan, aprueban, implementan y verifican de manera controlada, manteniendo la trazabilidad y la estabilidad operativa.

## 2. Alcance

Aplica a cambios en:

- Código fuente (frontend, backend, packages)
- Esquema de base de datos (migraciones)
- Configuración de despliegue (NSSM, variables de entorno, scripts)
- Documentación del SGC y técnica
- Dependencias npm

## 3. Clasificación de cambios

| Tipo | Descripción | Flujo | Ejemplo |
|------|-------------|-------|---------|
| **Estándar** | Feature o fix planificado | feat/fix → preprod → main | Nuevo filtro en dashboard |
| **Emergencia (hotfix)** | Corrección urgente en producción | hotfix desde main → main + sync preprod | Caída del servicio backend |
| **Configuración** | Cambio de variables, sin código | Documentar + aplicar en servidor | Cambio de JWT_SECRET |
| **Infraestructura** | BD, NSSM, firewall | PROC-005 + registro | Actualización PostgreSQL |

## 4. Procedimiento

### 4.1 Solicitud de cambio

Toda solicitud de cambio debe incluir:

1. **Descripción** del cambio propuesto
2. **Motivo** (requisito, bug, mejora, NC)
3. **Impacto** estimado (módulos, API, BD, usuarios)
4. **Riesgos** asociados
5. **Plan de pruebas** y rollback

### 4.2 Evaluación de impacto

| Área | Preguntas de evaluación |
|------|------------------------|
| Frontend | ¿Cambia UI, rutas, permisos? |
| Backend | ¿Nuevos endpoints, cambio de contrato? |
| Base de datos | ¿Requiere migración? ¿Es reversible? |
| Despliegue | ¿Requiere reinicio de servicios NSSM? |
| Operación | ¿Afecta sala de control en horario pico? |

**Matriz de decisión:**

| Impacto | Aprobación requerida |
|---------|---------------------|
| Bajo (1 módulo, sin BD) | Desarrollador + revisión PR |
| Medio (API, BD, 2+ módulos) | Líder técnico + validación preprod |
| Alto (arquitectura, seguridad, prod) | Responsable del proyecto |

### 4.3 Implementación controlada

1. Crear rama desde `preprod` (o `main` para hotfix).
2. Implementar cambio con commits trazables.
3. Ejecutar pruebas (PROC-004).
4. Abrir PR con plantilla de descripción.
5. Merge a `preprod` tras aprobación.

### 4.4 Flujo de ramas obligatorio

```
feat/fix/refactor/*  →  preprod  →  main
```

**Reglas:**

- Nunca mergear directo a `main` saltando `preprod` (excepto hotfix documentado).
- `preprod` debe estar sincronizada con `main` antes de abrir ramas nuevas.
- Ramas experimentales (ej. `group-kpis-display`) no se integran sin decisión de producto.

### 4.5 Hotfix de emergencia

Cuando un fix va directo a producción por urgencia:

1. Crear rama `hotfix/descripcion` desde `main`.
2. Implementar, probar mínimamente, merge a `main` y desplegar.
3. **Inmediatamente** sincronizar `preprod` con `main`.
4. Documentar el desvío del flujo estándar y la causa.
5. Backportar a ramas feature abiertas si aplica.

### 4.6 Control de versiones del software

| Elemento | Mecanismo |
|----------|-----------|
| Versión del monorepo | `package.json` → `version` (actual: 2.0.0) |
| Historial de cambios | Commits Git (Conventional Commits) |
| Tags de release | `git tag v2.0.0` (opcional, para hitos mayores) |
| Migraciones BD | Numeración secuencial en carpeta migrations |

### 4.7 Verificación post-cambio

Tras cada despliegue:

1. Verificar `/health` y `/health/ready`
2. Smoke test del módulo afectado
3. Revisar logs del backend (`LOG_LEVEL=info`)
4. Confirmar polling Waze activo (ciclo ≤ 30 s)

## 5. Registros

| Registro | Ubicación |
|----------|-----------|
| Solicitud de cambio | Descripción del PR |
| Aprobación | Review/merge en GitHub |
| Implementación | Commits asociados al PR |
| Verificación | Comentarios del PR, logs de deploy |

## 6. Indicadores

| Indicador | Meta |
|-----------|------|
| Cambios desplegados sin pasar por preprod | 0 (excepto hotfix documentados) |
| Rollbacks por cambio defectuoso | Tendencia decreciente |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
