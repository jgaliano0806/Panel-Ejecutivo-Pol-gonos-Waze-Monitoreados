# Despliegue - Panel Waze Monitoreados
## Windows Server 2022

### Rutas de producción (servidor actual)

| Recurso | Ruta |
|---------|------|
| Aplicación | `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados` |
| Base de datos | PostgreSQL 18 en `D:\postgreSQL` |
| Backups | `D:\Backups\panel_waze\` |

### Arquitectura en producción

```
  Usuarios (browser)
       │
       ▼  :80
  ┌──────────┐     /api, /socket.io      ┌──────────────┐
  │  nginx    │ ──────────────────────►   │  Node.js     │
  │ (puerto   │     proxy                 │  Fastify     │ :3002
  │  80)      │◄──────────────────────    │  Socket.IO   │
  │           │                           └──────┬───────┘
  │  Sirve    │                                  │
  │  /dist    │                                  ▼
  └──────────┘                           ┌──────────────┐
                                         │ PostgreSQL   │
                                         │ (localhost)  │ :5432
                                         └──────────────┘
```

---

## Pasos de despliegue

### 1. Conectarse al servidor

```
RDP a 10.1.0.136
Usuario: waze
```

### 2. Copiar el proyecto al servidor

Desde tu máquina local, copiar la carpeta completa del proyecto:

```powershell
# Opción A: Copiar via carpeta compartida o USB
# Copiar todo el proyecto a D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados en el servidor

# Opción B: Desde la máquina local, usar robocopy via red
robocopy "C:\Users\usuario\Desktop\Proyectos CASISA\Panel-Waze-Monitoreados" "\\10.1.0.136\D$\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados" /MIR /XD node_modules dist .git /XF "*.log"
```

### 3. Ejecutar el script de despliegue

En el servidor, abrir **PowerShell como Administrador** y ejecutar:

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\deploy"
Set-ExecutionPolicy Bypass -Scope Process -Force
.\deploy-server.ps1
```

El script automáticamente:
- Instala Node.js 20, Git, PostgreSQL 16, nginx, NSSM
- Crea la base de datos y aplica el schema
- Compila el proyecto (types, backend, frontend)
- Configura nginx como reverse proxy
- Registra ambos procesos como servicios de Windows
- Abre puertos en el firewall

### 4. Verificar

```
http://10.1.0.136        → Panel web (frontend)
http://10.1.0.136/health → Health check del backend
```

---

## Gestión de servicios

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\deploy"

# Ver estado
.\manage-services.ps1 -Action status

# Reiniciar todo
.\manage-services.ps1 -Action restart

# Ver logs
.\manage-services.ps1 -Action logs

# Detener
.\manage-services.ps1 -Action stop

# Actualizar (git pull + rebuild + restart)
.\manage-services.ps1 -Action update
```

---

## Servicios Windows registrados

| Servicio | Descripción | Puerto |
|----------|-------------|--------|
| `PanelWazeBackend` | Node.js API + WebSocket | 3002 |
| `PanelWazeNginx` | Reverse proxy + Frontend | 80 |

Ambos arrancan automáticamente con Windows (`SERVICE_AUTO_START`).

---

## Logs

- Backend stdout: `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stdout.log`
- Backend stderr: `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stderr.log`
- Nginx access: `C:\nginx\logs\access.log`
- Nginx error: `C:\nginx\logs\error.log`

Los logs del backend rotan automáticamente al llegar a 10MB.

---

## Solución de problemas

### El backend no arranca
```powershell
nssm status PanelWazeBackend
Get-Content "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stderr.log" -Tail 30
```

### PostgreSQL no conecta
```powershell
Get-Service postgresql*
# Si está detenido:
Start-Service postgresql-x64-16
```

### El frontend muestra página en blanco
1. Verificar que nginx esté corriendo: `nssm status PanelWazeNginx`
2. Verificar que el build exista: `Test-Path "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\frontend\dist\index.html"`
3. Si no existe, reconstruir: `cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\frontend"; npm run build`

### WebSocket no conecta
Verificar que nginx tenga la configuración de proxy para `/socket.io/`
con `Upgrade` y `Connection` headers (ya incluida en `nginx-prod.conf`).

---

## Actualización del sistema

Para actualizar a una nueva versión:

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\deploy"
.\manage-services.ps1 -Action update
```

O manualmente:
```powershell
# 1. Copiar nuevos archivos al servidor
# 2. En el servidor:
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
npm ci --include=dev
npm run build
cd deploy
.\manage-services.ps1 -Action restart
```
