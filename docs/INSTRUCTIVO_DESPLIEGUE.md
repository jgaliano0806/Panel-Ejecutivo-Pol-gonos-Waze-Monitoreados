# Instructivo de despliegue – Panel Ejecutivo Waze

Guía de instalación y configuración para entornos productivos. Cubre el **servidor actual (Windows Server 2022)**, **servidores Red Hat** (RHEL/Rocky/Alma) y **PC productiva**.

---

## Índice

1. [Opciones de despliegue](#1-opciones-de-despliegue)
2. [Opción A: Windows Server 2022 (entorno actual)](#2-opción-a-windows-server-2022-entorno-actual)
3. [Opción B: Servidor Red Hat](#3-opción-b-servidor-red-hat)
4. [Opción C: PC productiva](#4-opción-c-pc-productiva)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Verificación y salud](#6-verificación-y-salud)
7. [Mantenimiento y actualización](#7-mantenimiento-y-actualización)
8. [Resolución de problemas](#8-resolución-de-problemas)
9. [Resumen rápido](#9-resumen-rápido)

---

## 1. Opciones de despliegue

| Opción | Entorno | Uso típico |
|--------|---------|------------|
| **A** | Windows Server 2022 (entorno actual CASISA) | Servidor de sala de control, acceso por red LAN. |
| **B** | Servidor Red Hat (RHEL / Rocky / Alma) | Producción centralizada Linux. |
| **C** | PC local (Windows o Linux) | Sala de control, equipo fijo. |

Stack en todos los casos: Node.js 18+, PostgreSQL 18, Redis (opcional), frontend Vite + API Fastify.

> **Requisitos previos**: Ver [REQUISITOS_SISTEMA.md](./REQUISITOS_SISTEMA.md) para hardware, software y cargas en BD.

---

## 2. Opción A: Windows Server 2022 (entorno actual)

> Configuración vigente en el servidor de producción CASISA.
>
> | Atributo | Valor |
> |----------|-------|
> | OS | Windows Server 2022 Standard |
> | IP LAN | `10.1.0.136` |
> | Ruta del proyecto | `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados` |
> | PostgreSQL | 18.3 en `D:\postgreSQL` |
> | Gestor de servicios | NSSM (Chocolatey) |
> | Servicio backend | `PanelWazeBackend` → `apps\backend\dist\server.js` |
> | Frontend | http://10.1.0.136:5180 |
> | API | http://10.1.0.136:3002 |

### 2.1. Prerrequisitos

| Software | Versión | Notas |
|----------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 18.3 | Instalado en `D:\postgreSQL` |
| NSSM | latest | `choco install nssm` |
| Redis/Memurai | 7+ | Opcional – [memurai.com](https://www.memurai.com/) |

---

### 2.2. Compilar packages compartidos

Antes de iniciar el backend, los packages del monorepo deben estar compilados.
Esto es necesario después de cada `git pull` o instalación limpia:

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
npm install
npm run build --workspace=packages/types
npm run build --workspace=packages/config
npm run build --workspace=packages/shared
npm run build --workspace=packages/database
npm run build --workspace=apps/backend
npm run build --workspace=apps/frontend
```

O simplemente:

```powershell
npm run build
```

---

### 2.3. Configurar variables de entorno

```powershell
copy apps\backend\.env.example apps\backend\.env
notepad apps\backend\.env
```

Variables mínimas a ajustar:

```env
NODE_ENV=production
PORT=3002
FRONTEND_URL=http://10.1.0.136:5180
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
JWT_SECRET=cadena-aleatoria-larga-cambiar
```

Proteger el archivo:

```powershell
icacls "apps\backend\.env" /inheritance:r /grant:r "$env:USERNAME:(R)"
```

---

### 2.4. Restaurar base de datos desde backup

Si se cuenta con un backup `.dump`:

```powershell
$env:PATH = "D:\postgreSQL\bin;$env:PATH"
$env:PGPASSWORD = "TU_PASSWORD"

psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE panel_waze ENCODING='UTF8';"
pg_restore -U postgres -h localhost -p 5432 -d panel_waze --no-owner --no-privileges "D:\panel_waze_backup.dump"
```

O ejecutar migraciones desde cero:

```powershell
npm run db:migrate
```

---

### 2.5. Servicio Windows con NSSM (PanelWazeBackend)

NSSM gestiona el backend como servicio de Windows con reinicio automático.

#### Crear / reconfigurar el servicio

```powershell
# Detener si existe (requiere PowerShell como Administrador)
nssm stop PanelWazeBackend
nssm remove PanelWazeBackend confirm

# Crear servicio apuntando al build compilado
nssm install PanelWazeBackend "C:\Program Files\nodejs\node.exe"
nssm set PanelWazeBackend AppParameters "dist\server.js"
nssm set PanelWazeBackend AppDirectory "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\backend"
nssm set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=3002"
nssm set PanelWazeBackend Start SERVICE_AUTO_START
nssm set PanelWazeBackend AppStdout "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stdout.log"
nssm set PanelWazeBackend AppStderr "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stderr.log"
nssm set PanelWazeBackend AppRotateFiles 1
nssm set PanelWazeBackend AppRotateBytes 10485760

# Iniciar
nssm start PanelWazeBackend
```

> El servicio carga el `.env` desde `apps\backend\.env` mediante dotenv al arrancar.

#### Comandos de gestión del servicio

```powershell
# Requieren PowerShell como Administrador
nssm start PanelWazeBackend
nssm stop PanelWazeBackend
nssm restart PanelWazeBackend
nssm status PanelWazeBackend
```

O desde el panel de Servicios de Windows (`services.msc`): buscar `PanelWazeBackend`.

---

### 2.6. Frontend (modo desarrollo o producción)

**Modo desarrollo** (con hot-reload, para uso interno):

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
npm run dev
```

Acceso: `http://10.1.0.136:5180`

**Modo producción** (build estático):

```powershell
# Build del frontend: VITE_API_URL debe ser la URL completa del backend
# para que la API y el proxy de tiles (mapas) funcionen con serve
echo "VITE_API_URL=http://10.1.0.136:3002" > apps\frontend\.env.production
npm run build --workspace=apps/frontend
```

Servir con `npx serve` o configurar IIS / Nginx para Windows.

> **Importante**: Si usas `serve` en el puerto 5180, `VITE_API_URL` debe ser la URL completa del backend (ej. `http://10.1.0.136:3002`) para que tanto las llamadas a la API como los tiles del mapa (proxy en el backend) funcionen correctamente.

---

### 2.7. Actualizar el servidor en producción

```powershell
cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"

# 1. Obtener cambios
git pull

# 2. Instalar dependencias nuevas (si hubiera)
npm install

# 3. Recompilar (packages primero, luego apps)
npm run build

# 4. Reiniciar servicio (requiere PowerShell como Administrador)
nssm restart PanelWazeBackend

# 5. Verificar health
Invoke-WebRequest http://localhost:3002/health -UseBasicParsing | Select-Object -ExpandProperty Content
```

Script automatizado disponible en `scripts\reconfigurar-servicio-ADMIN.ps1` (requiere Administrador).

---

### 2.8. Ver logs del servicio

```powershell
# Logs en tiempo real
Get-Content "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stdout.log" -Wait -Tail 50

# Errores
Get-Content "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stderr.log" -Tail 50
```

---

### 2.9. Backup automático de base de datos

Script: `scripts\backup-bd.ps1`

Configurar como **Tarea Programada** en Windows:

1. `Win + R` → `taskschd.msc`
2. Crear tarea básica → diaria, hora deseada (ej. 03:00 AM)
3. Acción:
   ```
   Programa: powershell.exe
   Argumentos: -ExecutionPolicy Bypass -File "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\scripts\backup-bd.ps1"
   ```

Los backups se guardan en `D:\Backups\panel_waze\` con retención de 30 días.

---

## 3. Opción B: Servidor Red Hat

### 2.1. Preparación del servidor

#### 2.1.1. Usuario y directorios

```bash
sudo useradd -r -m -s /bin/bash apppanel
sudo mkdir -p /opt/panel-waze
sudo chown apppanel:apppanel /opt/panel-waze
```

#### 2.1.2. Firewall (si aplica)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 2.1.3. SELinux (si está en enforcing)

```bash
sudo setsebool -P httpd_can_network_connect 1
# Si Node corre en /opt:
sudo semanage fcontext -a -t bin_t "/opt/panel-waze/node(/.*)?"
sudo restorecon -Rv /opt/panel-waze
```

---

### 2.2. Instalación de Node.js 18+

```bash
# Opción 1: Módulo (Rocky/Alma 9)
sudo dnf module install -y nodejs:18

# Opción 2: NodeSource (RHEL/Rocky/Alma)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

node -v   # Debe ser v18.x o superior
npm -v    # 8.x o superior
```

---

### 2.3. Instalación de PostgreSQL 16

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Crear base y usuario (reemplazar TU_PASSWORD_SEGURO)
sudo -u postgres psql << 'EOF'
CREATE USER panel_waze WITH PASSWORD 'TU_PASSWORD_SEGURO';
CREATE DATABASE panel_waze OWNER panel_waze;
\q
EOF
```

> **Importante**: Ajustar `pg_hba.conf` si la aplicación no corre en localhost (ej. `host panel_waze panel_waze 127.0.0.1/32 scram-sha-256`).

---

### 2.4. Instalación de Redis (opcional)

```bash
sudo dnf install -y redis
sudo systemctl enable redis
sudo systemctl start redis
redis-cli ping   # Debe responder PONG
```

---

### 2.5. Clonar y construir la aplicación

```bash
sudo -u apppanel bash
cd /opt/panel-waze
git clone https://github.com/jgaliano0806/Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados.git repo
cd repo
npm install
npm run build
exit
```

Si el build falla por memoria:

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

---

### 2.6. Configuración de entorno (backend)

```bash
sudo -u apppanel nano /opt/panel-waze/repo/apps/backend/.env
```

Contenido mínimo (ajustar valores reales):

```env
NODE_ENV=production
PORT=3002

DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=panel_waze
DB_PASSWORD=TU_PASSWORD_SEGURO

REDIS_HOST=localhost
REDIS_PORT=6379
```

Proteger el archivo:

```bash
sudo chmod 600 /opt/panel-waze/repo/apps/backend/.env
```

---

### 2.7. Migraciones de base de datos

```bash
cd /opt/panel-waze/repo
sudo -u apppanel npm run db:migrate --workspace=apps/backend
```

Opcional, datos de prueba:

```bash
sudo -u apppanel npm run db:seed --workspace=apps/backend
```

---

### 2.8. Servicio systemd para el backend

Crear el archivo de unidad:

```bash
sudo nano /etc/systemd/system/panel-waze-api.service
```

Contenido:

```ini
[Unit]
Description=Panel Waze - API Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=apppanel
Group=apppanel
WorkingDirectory=/opt/panel-waze/repo/apps/backend
Environment=NODE_ENV=production
EnvironmentFile=/opt/panel-waze/repo/apps/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Activar e iniciar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable panel-waze-api
sudo systemctl start panel-waze-api
sudo systemctl status panel-waze-api
curl -s http://localhost:3002/health
```

---

### 2.9. Nginx: frontend estático + proxy a la API

```bash
sudo dnf install -y nginx
```

Crear configuración del sitio (reemplazar `TU_DOMINIO_O_IP` por el hostname o IP del servidor):

```bash
sudo nano /etc/nginx/conf.d/panel-waze.conf
```

```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

    root /opt/panel-waze/repo/apps/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3002/health;
    }
}
```

Validar y recargar:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

---

### 2.10. Build del frontend con URL de la API (producción)

La URL de la API debe conocerse en tiempo de build. Si la API se expone en el mismo dominio bajo `/api`:

```bash
cd /opt/panel-waze/repo/apps/frontend
echo 'VITE_API_URL=/api' > .env.production
npm run build
```

Si la API está en otra URL absoluta:

```bash
echo 'VITE_API_URL=https://tu-dominio.com/api' > .env.production
npm run build
```

El `root` de Nginx debe apuntar a `apps/frontend/dist` (como en 2.9).

---

### 2.11. SSL con Certbot (recomendado)

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d TU_DOMINIO
sudo systemctl reload nginx
```

La renovación automática queda configurada por defecto por certbot.

---

## 4. Opción C: PC productiva

### 3.1. Requisitos de la PC

- **OS**: Windows 10/11 o Linux (Ubuntu, Debian, Fedora, etc.).
- **Node.js** ≥ 18, **PostgreSQL** ≥ 16, **Redis** opcional (en Windows: Memurai).
- **RAM**: 4 GB mínimo, 8 GB recomendado.
- **Disco**: 5–10 GB libres.

---

### 3.2. Windows – Instalación manual

1. **Node.js 18 LTS**: Descargar e instalar desde [nodejs.org](https://nodejs.org).
2. **PostgreSQL 16**: Instalador oficial; durante la instalación crear usuario y base `panel_waze`.
3. **Memurai** (opcional): Sustituto compatible con Redis en Windows.
4. **Clonar el repositorio** en una ruta estable (ej. `C:\PanelWaze`):

   ```cmd
   cd C:\PanelWaze
   git clone https://github.com/jgaliano0806/Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados.git repo
   cd repo
   ```

5. **Instalar y construir**:

   ```cmd
   npm install
   npm run build
   ```

6. **Configurar entorno**: Copiar `apps\backend\.env.example` a `apps\backend\.env` y completar `DB_*`, `PORT`, etc. (ver [Variables de entorno](#4-variables-de-entorno)).
7. **Migraciones**:

   ```cmd
   npm run db:migrate --workspace=apps/backend
   ```

8. **Probar**: `npm run dev:all` (desarrollo) o, para uso “productivo” local:
   - Terminal 1: `cd apps\backend && node dist\server.js`
   - Terminal 2 (opcional): `npx serve -s apps/frontend/dist -l 5180` para servir el frontend.

#### Arranque automático en Windows

- **Opción 1**: Crear un **servicio de Windows** (NSSM o `sc.exe`) que ejecute `node dist\server.js` desde `apps\backend` con el `.env` correcto.
- **Opción 2**: **Tarea programada** al inicio de sesión que ejecute un `.bat`:

Ejemplo `iniciar-panel.bat` (ajustar rutas):

```bat
@echo off
cd /d C:\PanelWaze\repo\apps\backend
set NODE_ENV=production
node dist\server.js
```

El frontend en PC puede usar `VITE_API_URL=http://localhost:3002` (o la IP de la PC si se accede desde otra máquina).

---

### 3.3. Linux (PC productiva)

1. Instalar Node 18, PostgreSQL 16, Redis (opcional) con el gestor de paquetes de la distribución.
2. Clonar repo, `npm install`, `npm run build`, configurar `apps/backend/.env`.
3. Ejecutar `npm run db:migrate --workspace=apps/backend`.
4. Para dejarlo “productivo”:
   - **systemd**: Usar el mismo `panel-waze-api.service` de la [sección 2.8](#28-servicio-systemd-para-el-backend), ajustando rutas si el repo no está en `/opt/panel-waze`.
   - **Frontend**: En la misma PC se puede usar `npm run preview` en un puerto fijo o servir `apps/frontend/dist` con un servidor estático y acceder por `http://localhost:PUERTO`.

---

## 5. Variables de entorno

El archivo de referencia completo es `apps/backend/.env.example`.

### 5.1. Backend (`apps/backend/.env`)

| Variable | Obligatorio | Default | Descripción |
|----------|:-----------:|---------|-------------|
| `NODE_ENV` | Si | `production` | Entorno (`production` / `development`) |
| `PORT` | Si | `3002` | Puerto del servidor API |
| `FRONTEND_URL` | No | `true` | URL del frontend para CORS (ej. `http://10.1.0.136:5180`) |
| `DB_HOST` | Si | `localhost` | Host PostgreSQL |
| `DB_PORT` | Si | `5432` | Puerto PostgreSQL |
| `DB_NAME` | Si | `panel_waze` | Nombre de la base de datos |
| `DB_USER` | Si | `postgres` | Usuario de la base |
| `DB_PASSWORD` | Si | — | Contraseña PostgreSQL |
| `DB_POOL_MAX` | No | `50` | Máximo de conexiones en el pool |
| `REDIS_HOST` | No | `localhost` | Host Redis |
| `REDIS_PORT` | No | `6379` | Puerto Redis |
| `REDIS_PASSWORD` | No | — | Contraseña Redis (si aplica) |
| `JWT_SECRET` | Si | — | Clave secreta JWT (cambiar en producción) |
| `JWT_EXPIRATION` | No | `8h` | Duración del token JWT |
| `WEATHER_PROVIDER` | No | `openmeteo` | Proveedor de clima (`openmeteo` \| `accuweather`) |
| `ACCUWEATHER_API_KEY` | No | — | API Key AccuWeather (si se usa) |
| `HERE_API_KEY` | No | — | API Key HERE Traffic (opcional) |
| `TOMTOM_API_KEY` | No | — | API Key TomTom (opcional) |
| `WAZE_FEED_TOKEN` | No | — | Token para proxy de íconos Waze |
| `WAZE_PARTNER_ID` | No | — | ID Partner Waze |
| `LOG_LEVEL` | No | `info` | Nivel de log (`trace`/`debug`/`info`/`warn`/`error`) |

### 5.2. Frontend (`apps/frontend/.env` o `.env.production`)

Definir **antes** de `npm run build`:

| Variable | Obligatorio | Descripción |
|----------|:-----------:|-------------|
| `VITE_API_URL` | Si | URL base del backend. Usar `/api` si Nginx hace proxy, o `http://10.1.0.136:3002` para acceso directo |
| `VITE_GOOGLE_MAPS_API_KEY` | No | API Key Google Maps (si se usa) |

---

## 6. Verificación y salud

- **API**: `curl http://localhost:3002/health`
- **Frontend**: `http://10.1.0.136:5180` (Windows Server) o la URL del servidor.
- **Logs Windows (NSSM)**: Ver `logs\backend-stdout.log` en la raíz del proyecto.
- **Logs Red Hat**: `journalctl -u panel-waze-api -f` y `tail -f /var/log/nginx/error.log`.

---

## 7. Mantenimiento y actualización

1. **Backup de BD**:

   ```powershell
   # Windows Server
   $env:PATH = "D:\postgreSQL\bin;$env:PATH"; $env:PGPASSWORD = "TU_PASSWORD"
   pg_dump -U postgres -h localhost -Fc panel_waze -f "D:\backups\panel_waze_$(Get-Date -Format 'yyyyMMdd').dump"
   ```

   ```bash
   # Linux
   pg_dump -U panel_waze -Fc panel_waze > /backups/panel_waze_$(date +%Y%m%d).dump
   ```

2. **Actualizar código** (Windows Server, como Administrador):

   ```powershell
   cd "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
   git pull
   npm install
   npm run build
   nssm restart PanelWazeBackend
   ```

3. **Reiniciar backend**:
   - Windows: `nssm restart PanelWazeBackend` (como Administrador) o desde `services.msc`.
   - Red Hat: `sudo systemctl restart panel-waze-api`.

4. Si cambian migraciones, ejecutar antes de reiniciar: `npm run db:migrate`.

---

## 8. Resolución de problemas

| Síntoma | Posible causa | Acción |
|---------|----------------|--------|
| Backend no arranca | BD no accesible o `.env` incorrecto | Revisar `DB_*`, probar con `psql -U postgres -h localhost`. |
| Puerto 3002 en uso | Servicio `PanelWazeBackend` ya corriendo | Detener desde `services.msc` o `nssm stop PanelWazeBackend` (Admin). |
| `Cannot find module '@panel-waze/types'` | Packages no compilados | Ejecutar `npm run build --workspace=packages/types` (y demás packages). |
| Frontend no carga datos | `VITE_API_URL` incorrecta o CORS | Verificar `VITE_API_URL` en `.env` del frontend y `FRONTEND_URL` en backend. |
| DB health: unhealthy | Servicio corriendo con `.env` viejo o distinto | Reiniciar servicio; verificar que `DB_PASSWORD` en `.env` sea correcto. |
| 502 Bad Gateway | Backend no escucha en 3002 | Revisar `nssm status PanelWazeBackend` y logs. |
| Polling Waze sin datos | Feeds o red | Revisar conectividad a feeds de Waze y logs del backend. |
| Redis no conecta | Redis no instalado | El backend opera sin Redis (cache deshabilitado). Instalar Memurai si se requiere. |

---

## 9. Resumen rápido

| Paso | Windows Server 2022 (actual) | Red Hat (servidor Linux) | PC productiva |
|------|------------------------------|--------------------------|----------------|
| PostgreSQL | 18.3 en `D:\postgreSQL` | dnf + postgresql-setup | Instalador oficial |
| Packages | `npm run build` (types, config, shared, database, backend, frontend) | Igual | Igual |
| .env | `apps\backend\.env` | `apps/backend/.env` | Igual |
| BD restore | `pg_restore ... panel_waze_backup.dump` | Igual | Igual |
| Migraciones | `npm run db:migrate` | Igual | Igual |
| Arranque backend | NSSM `PanelWazeBackend` (servicio) | systemd `panel-waze-api.service` | Servicio Windows/Linux |
| Frontend | `npm run dev` (5180) o build estático | Nginx sirve `dist` + proxy `/api` | `npm run dev` o preview |
| Logs | `logs\backend-stdout.log` | `journalctl -u panel-waze-api` | Consola |
| SSL | IIS / Nginx para Windows | certbot + Nginx | Opcional |

---

## Referencias

- [REQUISITOS_SISTEMA.md](./REQUISITOS_SISTEMA.md) – Requisitos físicos, lógicos y cargas en BD.
- [DEPLOYMENT.md](./DEPLOYMENT.md) – Despliegue con Docker y desarrollo local.
- [API.md](./API.md) – Endpoints y health checks.

---

_Última actualización: Marzo 2026_
