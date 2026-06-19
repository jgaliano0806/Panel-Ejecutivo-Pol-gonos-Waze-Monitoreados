# Procedimiento: Control de Documentos y Registros

**Código:** SGC-PWY-PROC-001  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 7.5 – Información documentada

---

## 1. Objetivo

Establecer los criterios para la creación, actualización, control de versiones, distribución, almacenamiento y retención de la información documentada del SGC del Panel Ejecutivo Waze.

## 2. Alcance

Aplica a toda la documentación del SGC (manuales, procedimientos, registros) y a la documentación técnica vinculada al proyecto almacenada en el repositorio Git.

## 3. Responsabilidades

| Rol | Actividad |
|-----|-----------|
| Responsable de Calidad | Mantener REG-001, aprobar versiones de procedimientos |
| GED | Crear y actualizar documentación técnica |
| Responsable del Proyecto | Aprobar cambios al Manual del SGC |

## 4. Definiciones

| Término | Definición |
|---------|------------|
| Documento | Información controlada que requiere revisión y aprobación |
| Registro | Evidencia de actividades realizadas; no se edita tras su creación |
| Versión | Identificador secuencial de revisiones de un documento |

## 5. Procedimiento

### 5.1 Codificación de documentos

| Prefijo | Tipo | Ejemplo |
|---------|------|---------|
| SGC-PWY-XXX | Manual del SGC | SGC-PWY-001 |
| SGC-PWY-MU-XXX | Manual de Usuario | SGC-PWY-MU-001 |
| SGC-PWY-MP-XXX | Manual de Procesos | SGC-PWY-MP-001 |
| SGC-PWY-IP-XXX | Instructivo operativo | SGC-PWY-IP-001 |
| SGC-PWY-RP-XXX | Registro de proceso (evidencia) | SGC-PWY-RP-001 |
| SGC-PWY-PROC-XXX | Procedimiento | SGC-PWY-PROC-002 |
| SGC-PWY-REG-XXX | Registro maestro / plantilla | SGC-PWY-REG-001 |

### 5.2 Creación de documentos

1. Elaborar el borrador en formato Markdown (`.md`) en `docs/` o `docs/iso9001/`.
2. Asignar código, versión inicial `1.0` y fecha de emisión.
3. Registrar el documento en [REG-001_Registro_Documentos.md](./REG-001_Registro_Documentos.md).
4. Solicitar revisión al Responsable de Calidad o Responsable del Proyecto.
5. Tras aprobación, commitear en Git con mensaje `docs: <descripción>`.

### 5.3 Actualización de documentos

1. Identificar la necesidad de cambio (revisión programada, cambio de proceso, NC).
2. Incrementar versión:
   - Cambio menor (correcciones): incremento decimal (1.0 → 1.1)
   - Cambio mayor (reestructuración): incremento entero (1.x → 2.0)
3. Registrar el cambio en la tabla de historial del documento.
4. Actualizar REG-001 con nueva versión y fecha.
5. Commitear y, si aplica, regenerar PDF con `npm run docs:iso-pdf`.

### 5.4 Control de registros

Los registros se generan automáticamente o manualmente y no se modifican después de su creación.

| Registro | Ubicación | Retención |
|----------|-----------|-----------|
| Historial de commits | Git (`git log`) | Permanente |
| Pull Requests | GitHub | Permanente |
| Logs de aplicación | Servidor / archivos de log | 90 días mínimo |
| Registros de proceso (RP-001…010) | Sala de control / calidad CASISA | 90 días – 5 años (ver cada RP) |
| Bitácoras de turno (RP-009) | Carpeta turno / digital | 90 días |
| NC operativas (RP-010) | Tickets + archivo calidad | 5 años |
| Auditorías de código | `apps/*/docs/CODE_AUDIT_REPORT.md` | Permanente |
| Migraciones de BD | `apps/backend/src/database/migrations/` | Permanente |
| Backups PostgreSQL | Servidor (admin sistemas) | Según política CASISA |

### 5.5 Distribución y acceso

- **Documentación del SGC:** Repositorio Git, carpeta `docs/iso9001/`
- **PDFs locales:** `docs/iso9001/` — generados con `npm run docs:iso-pdf` y comandos asociados
- **PDFs publicados:** `Z:\G.E.D\Panel Waze\iso9001\` — copia con `npm run docs:iso-publish`
- **Acceso:** Miembros del equipo GED y auditores autorizados por CASISA

### 5.6 Documentos obsoletos

Los documentos obsoletos no se eliminan del historial Git. Se marcan como **Obsoleto** en REG-001 y se reemplazan por la versión vigente. Las versiones anteriores permanecen accesibles mediante `git log`.

### 5.7 Documentos de origen externo

| Documento externo | Control |
|-------------------|---------|
| ISO 9001:2015 | Referencia normativa; actualización según ISO |
| Documentación Waze CCP | Versión según portal de partners |
| Dependencias npm | Versionado en `package-lock.json` |

## 6. Registros generados

- REG-001: Registro maestro de documentación
- Historial de versiones en cada documento
- Commits Git con prefijo `docs:`

## 7. Indicadores

| Indicador | Meta |
|-----------|------|
| Documentos críticos con versión vigente en REG-001 | 100% |
| Tiempo de actualización tras cambio de proceso | ≤ 15 días hábiles |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
