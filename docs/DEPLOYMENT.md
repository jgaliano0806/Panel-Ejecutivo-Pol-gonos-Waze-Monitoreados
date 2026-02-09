# 🚀 Guía de Despliegue

Este documento describe cómo desplegar el Panel Ejecutivo Waze en diferentes entornos.

## 📋 Prerrequisitos

- **Node.js**: v18 o superior
- **npm**: v8 o superior
- **PostgreSQL**: v16+ (si no se usa Docker)
- **Redis** (opcional): para caché y rate limiting. En Windows puede usarse **Memurai**.
- **Docker & Docker Compose** (opcional): para despliegue contenerizado

## 🛠️ Desarrollo Local

Para correr el entorno completo de desarrollo en tu máquina local:

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**
   Copia los archivos de ejemplo:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```
   Edita los archivos `.env` con tus credenciales locales.

3. **Iniciar servicios**
   ```bash
   # Inicia Frontend y Backend concurrentemente
   npm run dev:all
   ```
   - Frontend: http://localhost:5180
   - Backend: http://localhost:3002

## 🐳 Despliegue con Docker

### Desarrollo (Docker)
Levanta todos los servicios (BD, Backend, Frontend) usando Docker Compose.

```bash
npm run docker:compose:dev
# O directamente:
docker-compose --profile dev up
```

### Producción (Docker)

Para un entorno de producción:

```bash
npm run docker:compose:prod
# O directamente:
docker-compose --profile prod up -d
```

Este perfil:
- Levanta la base de datos PostgreSQL.
- Construye y levanta el contenedor de la aplicación (Frontend servido estáticamente o vía Nginx, Backend API).
- Reinicia contenedores automáticamente (`restart: always`).

## 📦 Build Manual

Si necesitas construir los artefactos para despliegue manual (ej. en un servidor web tradicional o PAAS):

1. **Build General**
   ```bash
   npm run build
   ```
   Esto generará:
   - `apps/frontend/dist/`: Archivos estáticos del frontend.
   - `apps/backend/dist/`: Código JS compilado del backend.

2. **Ejecutar Backend**
   ```bash
   cd apps/backend
   npm start
   ```

3. **Servir Frontend**
   Configura tu servidor web (Nginx, Apache) para servir la carpeta `apps/frontend/dist`.

## ⚙️ Variables de Entorno

### Backend

Copia `apps/backend/.env.example` a `apps/backend/.env` y ajusta los valores.

| Variable | Descripción | Valor Default/Ejemplo |
|----------|-------------|------------------------|
| `PORT` | Puerto del servidor | `3002` |
| `NODE_ENV` | Entorno | `development` / `production` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario DB | `postgres` |
| `DB_PASSWORD` | Contraseña DB | (requerido) |
| `DB_NAME` | Nombre de la base de datos | `panel_waze` |
| `REDIS_HOST` | Host de Redis (opcional) | `localhost` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `WAZE_PARTNER_ID` | ID Partner Waze (si aplica) | - |

En Windows se puede usar **Memurai** como compatibilidad con Redis; las variables `REDIS_*` aplican igual.

### Frontend

Copia `apps/frontend/.env.example` a `apps/frontend/.env` si existe, o crea `.env` con:

| Variable | Descripción | Valor Default/Ejemplo |
|----------|-------------|------------------------|
| `VITE_API_URL` | URL base del backend (puede incluir `/api`) | `http://localhost:3002` o `http://localhost:3002/api` |
| `VITE_GOOGLE_MAPS_API_KEY` | API Key de Google Maps (si se usa) | (opcional) |
