# 🗄️ Guía de Implementación de PostgreSQL

## 📋 Plan Paso a Paso

Esta guía te llevará paso a paso para implementar PostgreSQL en el Panel Ejecutivo de Waze.

---

## ✅ PASO 1: Instalar Dependencias

### 1.1 Instalar el driver de PostgreSQL

```bash
cd backend
npm install pg
npm install --save-dev @types/pg
```

### 1.2 Verificar instalación

```bash
npm list pg
```

**✅ Checklist:**
- [ ] `pg` instalado en `backend/package.json`
- [ ] `@types/pg` instalado en `backend/package.json`

---

## ✅ PASO 2: Configurar Variables de Entorno

### 2.1 Crear archivo `.env` en `backend/`

Copia el archivo `.env.example` y crea `.env`:

```bash
cd backend
cp .env.example .env
```

### 2.2 Editar `.env` con tus credenciales

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=postgres
```

**⚠️ IMPORTANTE:** En producción, usa contraseñas seguras y nunca commitees el archivo `.env`.

**✅ Checklist:**
- [ ] Archivo `.env` creado en `backend/`
- [ ] Variables de entorno configuradas

---

## ✅ PASO 3: Configurar PostgreSQL

### Opción A: Usar Docker (Recomendado) 🐳

#### 3.1 Iniciar PostgreSQL con Docker Compose

```bash
# Desde la raíz del proyecto
docker-compose --profile dev up -d postgres
```

Esto iniciará PostgreSQL en el puerto `5432` y creará automáticamente:
- La base de datos `panel_waze`
- El usuario `postgres`
- Las tablas desde `schema.sql`

#### 3.2 Verificar que PostgreSQL está corriendo

```bash
docker ps | grep postgres
```

Deberías ver el contenedor `panel-waze-postgres` corriendo.

#### 3.3 Verificar conexión

```bash
docker exec -it panel-waze-postgres psql -U postgres -d panel_waze -c "SELECT NOW();"
```

**✅ Checklist:**
- [ ] Contenedor PostgreSQL corriendo
- [ ] Base de datos `panel_waze` creada
- [ ] Conexión exitosa

---

### Opción B: Instalar PostgreSQL Localmente 💻

#### 3.1 Instalar PostgreSQL

**Windows:**
- Descargar desde: https://www.postgresql.org/download/windows/
- O usar Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 3.2 Crear base de datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE panel_waze;

# Salir
\q
```

#### 3.3 Ejecutar esquema SQL

```bash
psql -U postgres -d panel_waze -f backend/src/database/schema.sql
```

**✅ Checklist:**
- [ ] PostgreSQL instalado
- [ ] Base de datos `panel_waze` creada
- [ ] Esquema SQL ejecutado

---

## ✅ PASO 4: Verificar Implementación

### 4.1 Iniciar el backend

```bash
cd backend
npm run dev
```

Deberías ver en la consola:
```
✅ Pool de PostgreSQL inicializado
✅ Conexión a PostgreSQL exitosa
✅ Esquema de base de datos inicializado
✅ Base de datos histórica inicializada
```

### 4.2 Verificar tablas creadas

**Con Docker:**
```bash
docker exec -it panel-waze-postgres psql -U postgres -d panel_waze -c "\dt"
```

**Localmente:**
```bash
psql -U postgres -d panel_waze -c "\dt"
```

Deberías ver:
- `historical_snapshots`
- `polygon_snapshots`
- `alerts`

**✅ Checklist:**
- [ ] Backend inicia sin errores
- [ ] Tablas creadas correctamente
- [ ] Conexión a base de datos funcionando

---

## ✅ PASO 5: Migrar Datos Existentes (Opcional)

Si tienes datos históricos en archivos JSON, puedes migrarlos:

### 5.1 Script de migración (crear manualmente si es necesario)

```typescript
// backend/scripts/migrate-json-to-db.ts
import { dbService } from '../src/database/dbService';
import fs from 'fs';
import path from 'path';

async function migrate() {
    // Leer archivos JSON existentes
    const globalPath = path.join(process.cwd(), 'data', 'historical', 'global.json');
    const polygonsPath = path.join(process.cwd(), 'data', 'historical', 'polygons.json');

    // Migrar datos...
    // (Implementar según necesidad)
}

migrate();
```

**✅ Checklist:**
- [ ] Datos migrados (si aplica)
- [ ] Verificar datos en base de datos

---

## ✅ PASO 6: Probar Funcionalidad

### 6.1 Verificar que se guardan snapshots

Espera 1 hora o fuerza un snapshot manualmente. Luego verifica:

```sql
SELECT COUNT(*) FROM historical_snapshots;
SELECT COUNT(*) FROM polygon_snapshots;
```

### 6.2 Verificar endpoints de API

```bash
# Obtener snapshots globales
curl http://localhost:3001/api/historical/global?hours=24

# Obtener snapshots de un polígono
curl http://localhost:3001/api/historical/polygon/P001?hours=24
```

**✅ Checklist:**
- [ ] Snapshots se guardan correctamente
- [ ] Endpoints de API funcionan
- [ ] Datos se recuperan correctamente

---

## ✅ PASO 7: Configurar Producción

### 7.1 Variables de entorno en producción

En producción, configura las variables de entorno:

```env
DB_HOST=postgres  # Nombre del servicio en docker-compose
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=<CONTRASEÑA_SEGURA>
```

### 7.2 Iniciar servicios en producción

```bash
docker-compose --profile prod up -d
```

**✅ Checklist:**
- [ ] Variables de entorno configuradas
- [ ] Servicios en producción funcionando
- [ ] Base de datos accesible desde el backend

---

## 🔧 Solución de Problemas

### Error: "Connection refused"

**Causa:** PostgreSQL no está corriendo o no es accesible.

**Solución:**
1. Verificar que PostgreSQL está corriendo: `docker ps` o `psql -U postgres`
2. Verificar variables de entorno en `.env`
3. Verificar que el puerto 5432 no está bloqueado

### Error: "Database does not exist"

**Causa:** La base de datos no fue creada.

**Solución:**
```bash
# Con Docker
docker exec -it panel-waze-postgres psql -U postgres -c "CREATE DATABASE panel_waze;"

# Localmente
psql -U postgres -c "CREATE DATABASE panel_waze;"
```

### Error: "Table does not exist"

**Causa:** El esquema SQL no fue ejecutado.

**Solución:**
```bash
# Con Docker
docker exec -i panel-waze-postgres psql -U postgres -d panel_waze < backend/src/database/schema.sql

# Localmente
psql -U postgres -d panel_waze -f backend/src/database/schema.sql
```

### Error: "Password authentication failed"

**Causa:** Credenciales incorrectas.

**Solución:**
1. Verificar `.env` tiene las credenciales correctas
2. Si usas Docker, verificar `POSTGRES_PASSWORD` en `docker-compose.yml`

---

## 📊 Estructura de Base de Datos

### Tablas Principales

1. **`historical_snapshots`**: Snapshots globales del sistema
   - Almacena métricas agregadas cada hora
   - Retención: 7 días (168 snapshots)

2. **`polygon_snapshots`**: Snapshots por polígono
   - Almacena métricas individuales por polígono
   - Retención: 7 días (168 snapshots por polígono)

3. **`alerts`**: Alertas del sistema
   - Almacena alertas generadas automáticamente
   - Incluye estado de reconocimiento

### Índices

- `idx_historical_snapshots_timestamp`: Consultas por fecha
- `idx_polygon_snapshots_polygon_timestamp`: Consultas por polígono y fecha
- `idx_alerts_severity`: Filtrado por severidad

---

## 🎯 Próximos Pasos

1. **Backups automáticos**: Configurar backups periódicos de la base de datos
2. **Monitoreo**: Agregar métricas de rendimiento de la base de datos
3. **Optimización**: Ajustar índices según patrones de consulta
4. **Migraciones**: Implementar sistema de migraciones versionadas

---

## 📝 Notas Importantes

- ⚠️ **Backups**: Configura backups regulares de PostgreSQL
- ⚠️ **Seguridad**: En producción, usa contraseñas seguras y conexiones SSL
- ⚠️ **Rendimiento**: Monitorea el tamaño de la base de datos y limpia datos antiguos
- ⚠️ **Escalabilidad**: Considera usar TimescaleDB para datos time-series si creces mucho

---

## ✅ Checklist Final

- [ ] Dependencias instaladas
- [ ] Variables de entorno configuradas
- [ ] PostgreSQL corriendo (Docker o local)
- [ ] Base de datos creada
- [ ] Esquema SQL ejecutado
- [ ] Backend conecta a la base de datos
- [ ] Snapshots se guardan correctamente
- [ ] Endpoints de API funcionan
- [ ] Datos se recuperan correctamente
- [ ] Producción configurada (si aplica)

---

**¡Listo!** 🎉 Tu base de datos PostgreSQL está configurada y funcionando.

