# Instructivo de despliegue – Panel Ejecutivo Waze

Guía de instalación y configuración para entornos productivos: **servidor Red Hat** (RHEL/Rocky/Alma) y **PC productiva** (Windows o Linux). Pensada para ejecución paso a paso por un administrador o DevOps.

---

## Índice

1. [Opciones de despliegue](#1-opciones-de-despliegue)
2. [Opción A: Servidor Red Hat](#2-opción-a-servidor-red-hat)
3. [Opción B: PC productiva](#3-opción-b-pc-productiva)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Verificación y salud](#5-verificación-y-salud)
6. [Mantenimiento y actualización](#6-mantenimiento-y-actualización)
7. [Resolución de problemas](#7-resolución-de-problemas)
8. [Resumen rápido](#8-resumen-rápido)

---

## 1. Opciones de despliegue

| Opción | Entorno | Uso típico |
|--------|---------|------------|
| **A** | Servidor Red Hat (RHEL / Rocky / Alma) | Producción centralizada, acceso por red, varios usuarios. |
| **B** | PC local (Windows o Linux) | Sala de control, un equipo fijo, mismo uso productivo. |

En ambos casos el **stack** es el mismo: Node.js, PostgreSQL, Redis (opcional), frontend estático + API. La diferencia está en dónde se instala y cómo se deja arrancando (systemd en servidor, servicio o script en PC).

> **Requisitos previos**: Ver [REQUISITOS_SISTEMA.md](./REQUISITOS_SISTEMA.md) para hardware, software y cargas en BD.

---

## 2. Opción A: Servidor Red Hat

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
PORT=3001

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
curl -s http://localhost:3001/health
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
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001/health;
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

## 3. Opción B: PC productiva

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

El frontend en PC puede usar `VITE_API_URL=http://localhost:3001` (o la IP de la PC si se accede desde otra máquina).

---

### 3.3. Linux (PC productiva)

1. Instalar Node 18, PostgreSQL 16, Redis (opcional) con el gestor de paquetes de la distribución.
2. Clonar repo, `npm install`, `npm run build`, configurar `apps/backend/.env`.
3. Ejecutar `npm run db:migrate --workspace=apps/backend`.
4. Para dejarlo “productivo”:
   - **systemd**: Usar el mismo `panel-waze-api.service` de la [sección 2.8](#28-servicio-systemd-para-el-backend), ajustando rutas si el repo no está en `/opt/panel-waze`.
   - **Frontend**: En la misma PC se puede usar `npm run preview` en un puerto fijo o servir `apps/frontend/dist` con un servidor estático y acceder por `http://localhost:PUERTO`.

---

## 4. Variables de entorno

### 4.1. Backend (`apps/backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno | `production` |
| `PORT` | Puerto del servidor API | `3001` |
| `DB_HOST` | Host PostgreSQL | `localhost` |
| `DB_PORT` | Puerto PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base | `panel_waze` |
| `DB_USER` | Usuario de la base | `panel_waze` |
| `DB_PASSWORD` | Contraseña | (obligatorio) |
| `REDIS_HOST` | Host Redis (opcional) | `localhost` |
| `REDIS_PORT` | Puerto Redis | `6379` |
| `WAZE_PARTNER_ID` | ID Partner Waze (si aplica) | - |

### 4.2. Frontend (build)

Definir **antes** de `npm run build` en `apps/frontend`:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del backend | `/api` (mismo dominio) o `http://localhost:3001` |
| `VITE_GOOGLE_MAPS_API_KEY` | API Key Google Maps (opcional) | - |

---

## 5. Verificación y salud

- **API**: `curl http://localhost:3001/health` (o la URL pública si usas Nginx).
- **Frontend**: Abrir en navegador la URL del servidor o `http://localhost:5180` si usas `serve`/preview.
- **Logs (Red Hat)**: `journalctl -u panel-waze-api -f` y `tail -f /var/log/nginx/error.log`.

---

## 6. Mantenimiento y actualización

1. **Backup de BD**: Realizar copias periódicas con `pg_dump panel_waze`.
2. **Actualizar código**:
   ```bash
   cd /opt/panel-waze/repo   # o la ruta del clone
   git pull
   npm install
   npm run build
   ```
3. **Reiniciar backend**: `sudo systemctl restart panel-waze-api` (Red Hat) o reiniciar el proceso en PC.
4. Si cambian migraciones: `npm run db:migrate --workspace=apps/backend` antes de reiniciar.

---

## 7. Resolución de problemas

| Síntoma | Posible causa | Acción |
|---------|----------------|--------|
| Backend no arranca | BD no accesible o `.env` incorrecto | Revisar `DB_*`, probar conexión con `psql`. |
| Frontend no carga datos | `VITE_API_URL` incorrecta o CORS | Verificar URL de API en build y proxy Nginx. |
| 502 Bad Gateway | Backend no escucha en 3001 | Comprobar `systemctl status panel-waze-api` y logs. |
| Polling Waze sin datos | Feeds o red | Revisar conectividad a Waze y logs del backend. |
| Redis no conecta | Redis no instalado o mal configurado | El backend sigue sin Redis (fallback); opcional corregir `REDIS_*`. |

---

## 8. Resumen rápido

| Paso | Red Hat (servidor) | PC productiva |
|------|--------------------|----------------|
| Node/PostgreSQL/Redis | dnf, postgresql-setup, redis | Instaladores o package manager |
| Código | Clone en `/opt/panel-waze/repo` | Clone en ruta fija (ej. `C:\PanelWaze`) |
| Build | `npm install` + `npm run build` | Igual |
| .env | `apps/backend/.env` (DB, REDIS) | Igual |
| Migraciones | `npm run db:migrate --workspace=apps/backend` | Igual |
| Arranque | systemd `panel-waze-api.service` | Servicio Windows o systemd (Linux) |
| Frontend | Nginx sirve `dist` + proxy `/api` | Servidor estático o `npm run preview` |
| SSL | certbot + Nginx | Opcional |

---

## Referencias

- [REQUISITOS_SISTEMA.md](./REQUISITOS_SISTEMA.md) – Requisitos físicos, lógicos y cargas en BD.
- [DEPLOYMENT.md](./DEPLOYMENT.md) – Despliegue con Docker y desarrollo local.
- [API.md](./API.md) – Endpoints y health checks.
