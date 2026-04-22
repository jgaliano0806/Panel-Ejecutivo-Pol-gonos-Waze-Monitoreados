# ===========================================
# PANEL EJECUTIVO - MULTI-STAGE DOCKERFILE
# ===========================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copiar archivos de dependencias raiz (workspaces: apps/* + packages/*)
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/

# Instalar dependencias
RUN npm ci --include=dev

# Copiar código fuente
COPY . .

# Buildear types compartidos (tsc -b del frontend los referencia vía paths alias)
WORKDIR /app/packages/types
RUN npm run build

# Build de producción frontend
WORKDIR /app/apps/frontend
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_API_URL=/api
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copiar archivos de dependencias raiz (para tener contexto de workspaces)
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build shared types (el backend los necesita en dist/)
WORKDIR /app/packages/types
RUN npm run build

# Build TypeScript backend
WORKDIR /app/apps/backend
RUN npm run build

# Stage 3: Production Image
FROM node:20-alpine AS production

# Instalar nginx y curl para health check
RUN apk add --no-cache nginx curl

WORKDIR /app

# Copiar backend compilado y dependencias
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=backend-builder /app/apps/backend/package.json ./apps/backend/

# Copiar carpeta de datos del backend
COPY apps/backend/data ./apps/backend/data

# Copiar frontend build
COPY --from=frontend-builder /app/apps/frontend/dist ./apps/frontend/dist

# Configuración de nginx
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Script de inicio
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 -G nodejs && \
  chown -R nodejs:nodejs /app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Exponer puertos
EXPOSE 80 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Ejecutar como usuario no-root
USER nodejs

CMD ["/start.sh"]
