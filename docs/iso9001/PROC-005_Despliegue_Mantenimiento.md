# Procedimiento: Despliegue y Mantenimiento

**Código:** SGC-PWY-PROC-005  
**Versión:** 1.1  
**Fecha:** Junio 2026  
**Cláusula ISO 9001:2015:** 8.5.1, 8.5.5 – Producción y provisión del servicio

---

## 1. Objetivo

Definir las actividades controladas para el despliegue, operación y mantenimiento del Panel Ejecutivo Waze en entornos de preproducción y producción.

## 2. Alcance

Aplica a despliegue en:

- **Producción actual:** Windows Server 2022 (`10.1.0.136`) con NSSM
- **Alternativas:** Red Hat (systemd + Nginx), Docker Compose, PC productiva

Documentación operativa:
- [deploy/INSTRUCCIONES-DESPLIEGUE.md](../../deploy/INSTRUCCIONES-DESPLIEGUE.md) — referencia principal Windows
- [INSTRUCTIVO_DESPLIEGUE.md](../INSTRUCTIVO_DESPLIEGUE.md) — instructivo completo multi-plataforma

## 3. Entornos

| Entorno | Rama Git | Método de deploy | URL |
|---------|----------|------------------|-----|
| Desarrollo local | cualquiera | `npm run dev:all` | localhost:5180 |
| Preprod | `preprod` | Manual / CI | Según configuración |
| Producción | `main` | CI/CD → NSSM + nginx (auto en push) | http://10.1.0.136/ |

## 4. Despliegue en producción (Windows Server)

### 4.1 Prerrequisitos

| Componente | Ubicación / Versión |
|------------|---------------------|
| Node.js | 18+ |
| PostgreSQL | 18.3 en `D:\postgreSQL` |
| Redis / Memurai | Opcional (fallback en memoria) |
| NSSM | Gestor de servicios Windows |
| Proyecto | `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados` |

### 4.2 Procedimiento de despliegue estándar

1. Validar que `preprod` fue probado (PROC-004).
2. Merge `preprod` → `main` y push.
3. **CI/CD automático** (`.github/workflows/ci-cd.yml`):
   - Build frontend y backend
   - Deploy vía `deploy/manage-services.ps1` en runner self-hosted
   - Health-check autoritativo post-deploy
   - **Rollback automático** al SHA anterior si falla

4. **Despliegue manual** (si CI no disponible):

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\deploy"
.\manage-services.ps1 -Action update
```

5. Ejecutar migraciones si hay cambios de BD: `npm run db:migrate`
6. Verificar salud del sistema (sección 4.4).

### 4.3 Instalación inicial de servicios

Para primera instalación o reinstalación completa:

```powershell
# Ejecutar como Administrador
scripts\INSTALAR-NSSM.bat
```

| Servicio NSSM | Puerto | Función |
|---------------|--------|---------|
| PanelWazeNginx | 80 | Reverse proxy, sirve `dist`, proxy `/api` y `/socket.io` |
| PanelWazeBackend | 3002 | API Fastify + Socket.IO |
| PanelWazeFrontend | 5180 | Preview Vite (solo dev; producción usa nginx :80) |

### 4.4 Verificación post-despliegue

| Verificación | Comando / Acción | Resultado esperado |
|--------------|------------------|-------------------|
| Health | `curl http://10.1.0.136/health` | HTTP 200 (vía nginx) |
| Readiness | `curl http://10.1.0.136/health/ready` | BD conectada |
| Frontend | Abrir http://10.1.0.136/ | Login y mapa cargan |
| WebSocket | Consola navegador | Sin errores Socket.IO |
| Polling Waze | Revisar logs backend | Ciclo cada 30 s |
| WebSocket | Consola del navegador | Sin errores de conexión |

### 4.5 Variables de entorno críticas

Configurar en `apps/backend/.env` (ver `.env.example`):

| Variable | Obligatoria | Notas |
|----------|-------------|-------|
| DB_PASSWORD | Sí | Credencial PostgreSQL |
| JWT_SECRET | Sí | Cambiar en producción |
| FRONTEND_URL | Sí | URL del frontend |
| PORT | Sí | 3002 (backend) |
| REDIS_HOST | No | Fallback en memoria si ausente |

## 5. Mantenimiento

### 5.1 Mantenimiento preventivo

| Actividad | Frecuencia | Responsable |
|-----------|------------|-------------|
| Backup PostgreSQL | Diario | Admin sistemas |
| Revisión de logs | Semanal | GED |
| Actualización de dependencias | Mensual | GED |
| Verificación de espacio en disco | Mensual | Admin sistemas |
| Revisión de retención histórica (90 días) | Trimestral | GED |

### 5.2 Mantenimiento correctivo

1. Detectar incidencia (operador, health check, logs).
2. Clasificar severidad (PROC-006).
3. Aplicar hotfix si es crítico (PROC-003).
4. Documentar causa raíz y AC.

### 5.3 Rollback

Si un despliegue falla:

1. Revertir al commit anterior en `main`:

```bash
git revert HEAD
git push origin main
```

2. En el servidor: `git pull`, `npm run build`, reiniciar servicios.
3. Si hay migración de BD incompatible, restaurar backup y documentar NC.

## 6. Preservación de datos

| Dato | Mecanismo | Retención |
|------|-----------|-----------|
| Incidentes Waze | PostgreSQL (`waze_alerts`, `waze_jams`) | Activo + histórico 90 días |
| Snapshots / TVT | `historical_snapshots`, `polygon_snapshots` | 30 días (migración 049); notifications 90 días |
| Configuración | Git + `.env` (no en repo) | Permanente |
| Logs | Archivos de log del servidor | 90 días mínimo |

## 7. Registros

| Registro | Ubicación |
|----------|-----------|
| Deploy log | Commits en `main`, logs NSSM |
| Migraciones ejecutadas | Salida de `db:migrate` |
| Backups BD | Servidor (admin) |
| Incidencias | PROC-006, tickets |

## 8. Indicadores

| Indicador | Meta |
|-----------|------|
| Uptime mensual `/health` | ≥ 99% |
| Tiempo de recuperación ante caída (MTTR) | ≤ 2 horas |
| Backups BD exitosos | 100% diario |

---

**Historial de revisiones**

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Emisión inicial | GED |
| 1.1 | 2026-06-08 | nginx :80, CI/CD automático, rollback, retención 30d | GED |
