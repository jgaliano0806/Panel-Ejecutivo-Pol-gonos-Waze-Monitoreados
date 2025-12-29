# 🚀 Guía de Despliegue

Este documento describe cómo desplegar el Panel Ejecutivo Waze en diferentes entornos.

## 📋 Prerrequisitos

- **Node.js**: v18 o superior
- **Docker & Docker Compose**: Para despliegue contenerizado
- **PostgreSQL**: v16+ (si no se usa Docker)

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
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

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
| Variable | Descripción | Valor Default/Ejemplo |
|----------|-------------|-----------------------|
| `PORT` | Puerto del servidor | `3001` |
| `NODE_ENV` | Entorno | `development` / `production` |
| `DB_HOST` | Host de DB | `localhost` |
| `DB_USER` | Usuario DB | `postgres` |
| `DB_PASSWORD`| Password DB | - |
| `DB_NAME` | Nombre DB | `panel_waze` |
| `WAZE_PARTNER_ID` | ID Partner Waze | - |

### Frontend
| Variable | Descripción | Valor Default/Ejemplo |
|----------|-------------|-----------------------|
| `VITE_API_URL` | URL del Backend | `http://localhost:3001` |
| `VITE_GOOGLE_MAPS_API_KEY` | API Key Maps | - |
