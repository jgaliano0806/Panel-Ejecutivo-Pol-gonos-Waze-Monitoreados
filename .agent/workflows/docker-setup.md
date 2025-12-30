---
description: docker-setup Configurar Docker Compose para dev/prod
---

Servicios:

PostgreSQL 16
Redis 7-alpine
Backend (Fastify)
Frontend (Vite)

yamlservices:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: panel_waze
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
Scripts: setup-all.bat, start-all.bat
