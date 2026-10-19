# Procedimiento: Pruebas y Verificación

**Código:** SGC-PWY-PROC-004  
**Versión:** 1.1  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 8.3.4, 8.6 – Control de diseño y desarrollo; Liberación

---

## 1. Objetivo

Establecer las actividades de verificación y validación que aseguran que el Panel Ejecutivo Waze cumple los requisitos especificados antes de su liberación.

## 2. Alcance

Aplica a pruebas en:

- Código fuente (unitarias, integración)
- API REST y WebSocket
- Interfaz de usuario (E2E)
- Despliegue en preprod y producción

## 3. Tipos de prueba

| Tipo | Herramienta | Alcance | Cuándo ejecutar |
|------|-------------|---------|-----------------|
| **Linting** | ESLint | Estilo y errores estáticos | Pre-commit, CI, antes de PR |
| **Type checking** | TypeScript | Tipos y contratos | Pre-commit, CI, antes de PR |
| **Unitarias** | Vitest/Jest (workspaces) | Funciones, servicios, utils | Desarrollo, CI |
| **Integración** | Tests de API/rutas | Endpoints, middleware | Desarrollo, CI |
| **E2E** | Playwright | Flujos de usuario completos | Pre-merge a preprod |
| **Smoke** | Manual / script | Health, login, mapa carga | Post-deploy preprod y prod |
| **Regresión** | Manual | Módulo afectado + dependencias | Validación en preprod |

## 4. Procedimiento

### 4.1 Pruebas en desarrollo

Antes de abrir un PR, el desarrollador ejecuta:

```bash
npm run lint
npm run typecheck
npm run test
```

Si el cambio afecta flujos de UI:

```bash
npm run test:e2e
```

### 4.2 Pruebas en CI (GitHub Actions)

El pipeline (`.github/workflows/ci-cd.yml`) valida en push a `main` y `preprod`:

| Job | Contenido |
|-----|-----------|
| `lint` | ESLint + TypeScript check (frontend y backend) |
| `security` | npm audit (nivel high) en root, backend y frontend |
| `build-frontend` / `build-backend` | Compilación de artefactos |
| `test` | Tests unitarios (Vitest) |
| `e2e` | Playwright E2E (incluye `/mapa` con mocks) |
| `deploy` | Solo en `main`: deploy NSSM + nginx con health-check y rollback |
| `pipeline-status` | Falla el pipeline si cualquier job crítico falla |

**Criterio:** El PR no se mergea si CI falla. Node.js 20 en CI.

### 4.3 Pruebas en preprod

Tras merge a `preprod` y deploy:

| Verificación | Método | Criterio de aceptación |
|--------------|--------|------------------------|
| Health general | `GET /health` | Status 200, sin errores |
| Readiness | `GET /health/ready` | BD y servicios OK |
| API incidentes | `GET /api/incidents` | Respuesta JSON válida |
| WebSocket | Conexión Socket.IO | Eventos `waze:data_updated` recibidos |
| Frontend | Navegación manual | Mapa carga, markers visibles |
| TTS | Alerta de prueba | Audio reproducido (si aplica) |
| Módulo modificado | Casos de prueba del PR | Funcionalidad según especificación |

### 4.4 Pruebas de regresión

Para cambios que afectan módulos compartidos, validar:

- Autenticación y permisos (RBAC)
- Polling Waze (alertas, jams, irregularities)
- Gestión de polígonos
- Panel de administración
- Catálogos de incidentes

### 4.5 Criterios de liberación (8.6)

El software se libera a producción (`main`) solo si:

| # | Criterio | Evidencia |
|---|----------|-----------|
| 1 | CI verde en el commit de preprod | GitHub Actions |
| 2 | Smoke test en preprod exitoso | Registro en PR o ticket |
| 3 | Sin NC bloqueantes abiertas | PROC-006 |
| 4 | Documentación actualizada (si aplica) | Commits `docs:` |
| 5 | Migraciones de BD ejecutadas en preprod | Log de `npm run db:migrate` |

### 4.6 Gestión de defectos encontrados en pruebas

1. Registrar el defecto como NC (PROC-006) o issue en GitHub.
2. Clasificar severidad:
   - **Crítica:** Bloquea operación → hotfix
   - **Mayor:** Funcionalidad degradada → fix en rama dedicada
   - **Menor:** Cosmético → backlog
3. No liberar a producción con defectos críticos o mayores sin resolver.

## 5. Entornos de prueba

| Entorno | URL / Acceso | Propósito |
|---------|--------------|-----------|
| Local | `localhost:5180` / `:3002` | Desarrollo |
| Preprod | Servidor staging | Validación pre-liberación |
| Producción | `10.1.0.136:5180` | Operación (smoke post-deploy) |

## 6. Registros

| Registro | Ubicación |
|----------|-----------|
| Resultados CI | GitHub Actions logs |
| Resultados tests | Salida de `npm run test` |
| Reportes E2E | Playwright reports |
| Validación preprod | Comentarios PR / tickets |
| Auditorías de código | `apps/*/docs/CODE_AUDIT_REPORT.md` |

## 7. Indicadores

| Indicador | Meta |
|-----------|------|
| Tests pasando antes de merge a preprod | 100% |
| Defectos críticos en producción | 0 |
| Smoke test post-deploy | Ejecutado en cada release |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
| 1.1 | 2026-06-08 | CI/CD completo: security, E2E, deploy automático | GED |
