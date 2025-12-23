# 🧪 Prueba de Conexión a PostgreSQL

## Opción 1: Usar el Script Automático (Windows)

Ejecuta el script batch:

```bash
cd backend
scripts\test-connection.bat
```

Este script:
- ✅ Verifica que las dependencias estén instaladas
- ✅ Crea el archivo `.env` si no existe
- ✅ Ejecuta las pruebas de conexión

## Opción 2: Ejecutar Manualmente

### 1. Instalar dependencias (si no están instaladas)

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Crea o edita `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=postgres
```

### 3. Asegurar que PostgreSQL esté corriendo

**Con Docker:**
```bash
docker-compose --profile dev up -d postgres
```

**Localmente:**
- Verifica que PostgreSQL esté instalado y corriendo
- Crea la base de datos: `CREATE DATABASE panel_waze;`

### 4. Ejecutar el script de prueba

```bash
cd backend
npx ts-node scripts/test-db-connection.ts
```

## Qué Verifica el Script

1. ✅ **Conexión básica** - Verifica que puede conectarse a PostgreSQL
2. ✅ **Tablas existentes** - Lista todas las tablas en la base de datos
3. ✅ **Estructura de tablas** - Verifica las columnas de `historical_snapshots`
4. ✅ **Inserción de datos** - Prueba insertar un snapshot de prueba
5. ✅ **Lectura de datos** - Prueba leer datos de la base de datos
6. ✅ **Limpieza** - Elimina los datos de prueba

## Solución de Problemas

### Error: "Connection refused"

**Causa:** PostgreSQL no está corriendo o no es accesible.

**Solución:**
- Verifica que PostgreSQL esté corriendo: `docker ps` o verifica el servicio
- Verifica que el puerto 5432 no esté bloqueado
- Verifica las credenciales en `.env`

### Error: "Database does not exist"

**Causa:** La base de datos `panel_waze` no existe.

**Solución:**
```sql
CREATE DATABASE panel_waze;
```

### Error: "Table does not exist"

**Causa:** El esquema SQL no se ejecutó.

**Solución:**
```bash
# Con Docker (automático al iniciar)
docker-compose --profile dev up -d postgres

# Manualmente
psql -U postgres -d panel_waze -f backend/src/database/schema.sql
```

### Error: "Password authentication failed"

**Causa:** Credenciales incorrectas.

**Solución:**
- Verifica el archivo `.env`
- Si usas Docker, verifica `POSTGRES_PASSWORD` en `docker-compose.yml`

## Resultado Esperado

Si todo está correcto, deberías ver:

```
🔍 Probando conexión a PostgreSQL...

📋 Configuración:
   Host: localhost
   Port: 5432
   Database: panel_waze
   User: postgres
   Password: ***

1️⃣ Probando conexión básica...
✅ Conexión exitosa

2️⃣ Verificando tablas...
   Tablas encontradas: 3
   - alerts
   - historical_snapshots
   - polygon_snapshots

3️⃣ Verificando estructura de historical_snapshots...
   Columnas:
   - id (uuid)
   - timestamp (timestamp with time zone)
   ...

4️⃣ Probando inserción de datos...
✅ Inserción exitosa

5️⃣ Probando lectura de datos...
   Total de snapshots: 1

6️⃣ Limpiando datos de prueba...
✅ Limpieza completada

🎉 ¡Todas las pruebas pasaron exitosamente!
✅ PostgreSQL está configurado correctamente
```

