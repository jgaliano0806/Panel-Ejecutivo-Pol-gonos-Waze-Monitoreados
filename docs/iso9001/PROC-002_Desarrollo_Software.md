# Procedimiento: Desarrollo de Software

**Código:** SGC-PWY-PROC-002  
**Versión:** 1.1  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 8.3 – Diseño y desarrollo de productos y servicios

---

## 1. Objetivo

Definir las etapas, entradas, salidas y controles del proceso de diseño y desarrollo del Panel Ejecutivo Waze.

## 2. Alcance

Aplica al desarrollo de funcionalidades en:

- `apps/frontend` — Aplicación React (Vite + TypeScript)
- `apps/backend` — API Fastify (Node.js + TypeScript)
- `packages/*` — Tipos, configuración y utilidades compartidas

## 3. Entradas del proceso

| Entrada | Fuente | Documento |
|---------|--------|-------------|
| Requisitos funcionales | Operación / Gerencia | Historias de usuario, tickets |
| Requisitos no funcionales | Arquitectura | REQUISITOS_SISTEMA.md |
| Diseño de arquitectura | GED | ARCHITECTURE.md |
| Especificación de API | GED | API.md |
| Restricciones técnicas | Infraestructura | INSTRUCTIVO_DESPLIEGUE.md |

## 4. Salidas del proceso

| Salida | Destino |
|--------|---------|
| Código fuente versionado | Repositorio Git |
| Migraciones de BD | `apps/backend/src/database/migrations/` |
| Documentación actualizada | `docs/` |
| Pull Request con descripción | GitHub |
| Build compilado | `apps/*/dist/` |

## 5. Etapas del proceso

### 5.1 Planificación del cambio

1. Identificar el tipo de cambio: `feat`, `fix`, `refactor`, `docs`, `chore`.
2. Evaluar alcance:
   - **Cambio menor:** 1-2 archivos, un solo módulo → rama `fix/*` o `feat/*`
   - **Cambio mayor:** frontend + backend, API, BD, CI → rama dedicada obligatoria
3. Crear rama desde `preprod` actualizada:

```bash
git checkout preprod
git pull origin preprod
git checkout -b feat/descripcion-corta
```

### 5.2 Diseño

Antes de implementar cambios significativos, el desarrollador debe:

1. Revisar ARCHITECTURE.md y patrones existentes (hexagonal, CQRS donde aplique).
2. Definir impacto en API, BD y frontend.
3. Documentar decisiones de diseño en el PR o en `docs/` si el cambio es estructural.

**Criterios de diseño:**

- Reutilizar paquetes compartidos (`packages/types`, `packages/shared`)
- Mantener separación de capas (routes → services → models)
- Validar entradas en backend; tipos compartidos entre front y back

### 5.3 Implementación

1. Escribir código conforme a estándares del proyecto (ESLint, TypeScript strict).
2. Crear migraciones de BD si el esquema cambia.
3. Actualizar tipos en `packages/types` si los contratos cambian.
4. Commits atómicos con Conventional Commits:

```
feat(frontend): añadir filtro de incidentes por polígono
fix(backend): corregir timeout en polling Waze
docs: actualizar API de catálogos
```

### 5.4 Revisión de código

Todo cambio requiere Pull Request hacia `preprod` con:

- Descripción del cambio y motivación
- Lista de archivos modificados
- Riesgos identificados (API, BD, deploy)
- Evidencia de pruebas ejecutadas

**Checklist de revisión:**

- [ ] El código sigue convenciones del proyecto
- [ ] No hay secretos ni credenciales hardcodeadas
- [ ] Tipos TypeScript correctos
- [ ] Migraciones de BD reversibles o documentadas
- [ ] Sin regresiones evidentes

### 5.5 Verificación del diseño

| Actividad | Comando / Método |
|-----------|------------------|
| Linting | `npm run lint` |
| Type checking | `npm run typecheck` |
| Tests unitarios | `npm run test` |
| Tests E2E | `npm run test:e2e` |
| Smoke manual | Validar módulo en entorno local |

Ver detalle en [PROC-004_Pruebas_Verificacion.md](./PROC-004_Pruebas_Verificacion.md).

### 5.6 Validación

1. Merge del PR a `preprod`.
2. Deploy en entorno preprod.
3. Validación funcional por operador o responsable del proyecto.
4. Registro de OK o NC en PROC-006 si hay hallazgos.

### 5.7 Liberación a producción

Solo tras validación exitosa en preprod:

```bash
git checkout main
git pull origin main
git merge preprod
git push origin main
```

El push a `main` dispara deploy NSSM en el servidor productivo.

## 6. Control de cambios de diseño

Los cambios de diseño durante el desarrollo se documentan en:

- Comentarios del PR
- Actualización de ARCHITECTURE.md (si es cambio estructural)
- Registro en PROC-003

## 7. Registros

| Registro | Evidencia |
|----------|-----------|
| Código fuente | Commits Git |
| Revisiones | PRs en GitHub |
| Diseño | ARCHITECTURE.md, diagramas Mermaid |
| Pruebas | Resultados de CI, logs de test |

## 8. Indicadores

| Indicador | Meta |
|-----------|------|
| PRs con revisión antes de merge | 100% |
| Errores de lint/typecheck en main | 0 |
| Cambios mayores sin rama dedicada | 0 |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
| 1.1 | 2026-06-08 | Ruta migraciones, módulos RAC/siniestros/zonas peligrosas | GED |
