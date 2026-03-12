# Setup Local - Panel Waze

## Requisitos

- Node.js 18+
- PostgreSQL 16+ (o 18)
- Redis opcional (Memurai en Windows, o Docker)

## Pasos

### 1. Instalar PostgreSQL

Si aun no esta instalado:

- Ejecuta: `c:\Users\waze\Downloads\postgresql-18.3-2-windows-x64.exe`
- Durante la instalacion:
  - Puerto: 5432
  - Contrasena del usuario `postgres`: usa `CASISA` o anota la que elijas
  - Agrega `bin` al PATH si se ofrece

### 2. Ejecutar setup con restore de backup

```bat
cd "d:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
scripts\setup-restore.bat
```

El script:
- Instala dependencias npm
- Crea `.env` en backend y frontend
- Restaura `d:\panel_waze_backup.dump` en la BD `panel_waze`

### 3. Ajustar contrasena de BD (si usaste otra)

Edita `apps\backend\.env` y cambia `DB_PASSWORD` si no usaste CASISA.

### 4. Iniciar el proyecto

```bat
npm run dev:all
```

- Frontend: http://localhost:5180
- Backend: http://localhost:3002

## Alternativa: Docker

Si tienes Docker:

```bat
docker-compose --profile dev up -d postgres redis
```

Luego restaura el backup manualmente:

```bat
set PGPASSWORD=postgres
psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE panel_waze;"
pg_restore -U postgres -h localhost -p 5432 -d panel_waze --no-owner --no-privileges d:\panel_waze_backup.dump
```

Y en `apps\backend\.env` usa `DB_PASSWORD=postgres`.

## Redis

Opcional. Sin Redis el backend funciona con cache deshabilitado. Para habilitar:
- Memurai: https://www.memurai.com/
- O Docker: `docker run -d -p 6379:6379 redis:7-alpine`
