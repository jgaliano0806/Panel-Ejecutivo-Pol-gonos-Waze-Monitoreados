---
name: sql-optimization-patterns
description: Domina la optimización de consultas SQL, estrategias de indexación y el análisis de EXPLAIN para mejorar drásticamente el rendimiento de la base de datos y eliminar consultas lentas. Úsalo al depurar consultas lentas, diseñar esquemas de base de datos o optimizar el rendimiento de la aplicación.
---

# Patrones de Optimización SQL

Transforma las consultas lentas a la base de datos en operaciones ultrarrápidas mediante la optimización sistemática, la indexación adecuada y el análisis del plan de consulta.

## Cuándo usar este Skill

- Depuración de consultas de ejecución lenta.
- Diseño de esquemas de base de datos eficientes.
- Optimización de los tiempos de respuesta de la aplicación.
- Reducción de la carga y los costes de la base de datos.
- Mejora de la escalabilidad para conjuntos de datos en crecimiento.
- Análisis de planes de consulta EXPLAIN.
- Implementación de índices eficientes.
- Resolución de problemas de consultas N+1.

## Conceptos Principales

### 1. Planes de Ejecución de Consultas (EXPLAIN)

Comprender la salida de EXPLAIN es fundamental para la optimización.

**EXPLAIN en PostgreSQL:**

```sql
-- Explain básico
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- Con estadísticas de ejecución reales
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- Salida detallada (verbose) con más detalles
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT u.*, o.order_total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days';
```

**Métricas clave a vigilar:**

- **Seq Scan**: Escaneo completo de la tabla (normalmente lento para tablas grandes).
- **Index Scan**: Uso de un índice (bueno).
- **Index Only Scan**: Uso de un índice sin tocar la tabla (lo mejor).
- **Nested Loop**: Método de unión/join (está bien para conjuntos de datos pequeños).
- **Hash Join**: Método de unión (bueno para conjuntos de datos más grandes).
- **Merge Join**: Método de unión (bueno para datos ordenados).
- **Cost**: Coste estimado de la consulta (cuanto menor, mejor).
- **Rows**: Filas estimadas devueltas.
- **Actual Time**: Tiempo de ejecución real.

### 2. Estrategias de Índices

Los índices son la herramienta de optimización más potente.

**Tipos de Índices:**

- **B-Tree**: Predeterminado, bueno para consultas de igualdad y rango.
- **Hash**: Solo para comparaciones de igualdad (=).
- **GIN**: Búsqueda de texto completo, consultas de arrays, JSONB.
- **GiST**: Datos geométricos, búsqueda de texto completo.
- **BRIN**: Block Range INdex para tablas muy grandes con correlación.

```sql
-- Índice B-Tree estándar
CREATE INDEX idx_users_email ON users(email);

-- Índice compuesto (¡el orden importa!)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Índice parcial (indexa solo un subconjunto de filas)
CREATE INDEX idx_active_users ON users(email)
WHERE status = 'active';

-- Índice de expresión
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Índice de recubrimiento (incluye columnas adicionales)
CREATE INDEX idx_users_email_covering ON users(email)
INCLUDE (name, created_at);

-- Índice de búsqueda de texto completo
CREATE INDEX idx_posts_search ON posts
USING GIN(to_tsvector('english', title || ' ' || body));

-- Índice JSONB
CREATE INDEX idx_metadata ON events USING GIN(metadata);
```

### 3. Patrones de Optimización de Consultas

**Evita SELECT \*:**

```sql
-- Mal: Obtiene columnas innecesarias
SELECT * FROM users WHERE id = 123;

-- Bien: Obtiene solo lo que necesitas
SELECT id, email, name FROM users WHERE id = 123;
```

**Usa la cláusula WHERE de forma eficiente:**

```sql
-- Mal: La función impide el uso del índice
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- Bien: Crea un índice funcional o usa una coincidencia exacta
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Después:
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- O almacena los datos normalizados
SELECT * FROM users WHERE email = 'user@example.com';
```

**Optimiza los JOINs:**

```sql
-- Mal: Producto cartesiano y luego filtrado
SELECT u.name, o.total
FROM users u, orders o
WHERE u.id = o.user_id AND u.created_at > '2024-01-01';

-- Bien: Filtrar antes de unir
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01';

-- Mejor: Filtrar ambas tablas
SELECT u.name, o.total
FROM (SELECT * FROM users WHERE created_at > '2024-01-01') u
JOIN orders o ON u.id = o.user_id;
```

## Patrones de Optimización

### Patrón 1: Eliminar Consultas N+1

**Problema: Anti-patrón de consulta N+1**

```python
# Mal: Ejecuta N+1 consultas
users = db.query("SELECT * FROM users LIMIT 10")
for user in users:
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id)
    # Procesar pedidos
```

**Solución: Usar JOINs o carga por lotes (Batch Loading)**

```sql
-- Solución 1: JOIN
SELECT
    u.id, u.name,
    o.id as order_id, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.id IN (1, 2, 3, 4, 5);

-- Solución 2: Consulta por lotes
SELECT * FROM orders
WHERE user_id IN (1, 2, 3, 4, 5);
```

```python
# Bien: Consulta única con JOIN o carga por lotes
# Usando JOIN
results = db.query("""
    SELECT u.id, u.name, o.id as order_id, o.total
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id IN (1, 2, 3, 4, 5)
""")

# O carga por lotes (batch load)
users = db.query("SELECT * FROM users LIMIT 10")
user_ids = [u.id for u in users]
orders = db.query(
    "SELECT * FROM orders WHERE user_id IN (?)",
    user_ids
)
# Agrupar pedidos por user_id
orders_by_user = {}
for order in orders:
    orders_by_user.setdefault(order.user_id, []).append(order)
```

### Patrón 2: Optimizar la Paginación

**Mal: OFFSET en tablas grandes**

```sql
-- Lento para offsets grandes
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 100000;  -- ¡Muy lento!
```

**Bien: Paginación basada en cursores**

```sql
-- Mucho más rápido: Usa un cursor (último ID visto)
SELECT * FROM users
WHERE created_at < '2024-01-15 10:30:00'  -- Último cursor
ORDER BY created_at DESC
LIMIT 20;

-- Con ordenamiento compuesto
SELECT * FROM users
WHERE (created_at, id) < ('2024-01-15 10:30:00', 12345)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Requiere un índice
CREATE INDEX idx_users_cursor ON users(created_at DESC, id DESC);
```

### Patrón 3: Agregación Eficiente

**Optimiza consultas COUNT:**

```sql
-- Mal: Cuenta todas las filas
SELECT COUNT(*) FROM orders;  -- Lento en tablas grandes

-- Bien: Usa estimaciones para conteos aproximados
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'orders';

-- Bien: Filtrar antes de contar
SELECT COUNT(*) FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- Mejor: Usa "index-only scan"
CREATE INDEX idx_orders_created ON orders(created_at);
SELECT COUNT(*) FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Optimiza GROUP BY:**

```sql
-- Mal: Agrupar y luego filtrar
SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 10;

-- Mejor: Filtrar primero y luego agrupar (si es posible)
SELECT user_id, COUNT(*) as order_count
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(*) > 10;

-- Lo mejor: Usa un índice de recubrimiento (covering index)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### Patrón 4: Optimización de Subconsultas

**Transforma subconsultas correlacionadas:**

```sql
-- Mal: Subconsulta correlacionada (se ejecuta por cada fila)
SELECT u.name, u.email,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
FROM users u;

-- Bien: JOIN con agregación
SELECT u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name, u.email;

-- Mejor: Usa funciones de ventana (window functions)
SELECT DISTINCT ON (u.id)
    u.name, u.email,
    COUNT(o.id) OVER (PARTITION BY u.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

**Usa CTEs para mayor claridad:**

```sql
-- Usando Common Table Expressions (Expresiones de Tabla Comunes)
WITH recent_users AS (
    SELECT id, name, email
    FROM users
    WHERE created_at > NOW() - INTERVAL '30 days'
),
user_order_counts AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT ru.name, ru.email, COALESCE(uoc.order_count, 0) as orders
FROM recent_users ru
LEFT JOIN user_order_counts uoc ON ru.id = uoc.user_id;
```

### Patrón 5: Operaciones por Lotes (Batch)

**INSERT por lotes:**

```sql
-- Mal: Múltiples inserciones individuales
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
INSERT INTO users (name, email) VALUES ('Carol', 'carol@example.com');

-- Bien: Inserción por lotes (batch)
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com'),
    ('Carol', 'carol@example.com');

-- Mejor: Usa COPY para inserciones masivas (PostgreSQL)
COPY users (name, email) FROM '/tmp/users.csv' CSV HEADER;
```

**UPDATE por lotes:**

```sql
-- Mal: Actualización en un bucle
UPDATE users SET status = 'active' WHERE id = 1;
UPDATE users SET status = 'active' WHERE id = 2;
-- ... repetir para muchos IDs

-- Bien: Actualización única con cláusula IN
UPDATE users
SET status = 'active'
WHERE id IN (1, 2, 3, 4, 5, ...);

-- Mejor: Usa una tabla temporal para lotes grandes
CREATE TEMP TABLE temp_user_updates (id INT, new_status VARCHAR);
INSERT INTO temp_user_updates VALUES (1, 'active'), (2, 'active'), ...;

UPDATE users u
SET status = t.new_status
FROM temp_user_updates t
WHERE u.id = t.id;
```

## Técnicas Avanzadas

### Vistas Materializadas

Pre-calcula consultas costosas.

```sql
-- Crear vista materializada
CREATE MATERIALIZED VIEW user_order_summary AS
SELECT
    u.id,
    u.name,
    COUNT(o.id) as total_orders,
    SUM(o.total) as total_spent,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Añadir índice a la vista materializada
CREATE INDEX idx_user_summary_spent ON user_order_summary(total_spent DESC);

-- Refrescar vista materializada
REFRESH MATERIALIZED VIEW user_order_summary;

-- Refresco concurrente (PostgreSQL)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_order_summary;

-- Consultar vista materializada (muy rápido)
SELECT * FROM user_order_summary
WHERE total_spent > 1000
ORDER BY total_spent DESC;
```

### Particionado

Divide tablas grandes para un mejor rendimiento.

```sql
-- Particionado por rango por fecha (PostgreSQL)
CREATE TABLE orders (
    id SERIAL,
    user_id INT,
    total DECIMAL,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Crear particiones
CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Las consultas usan automáticamente la partición adecuada
SELECT * FROM orders
WHERE created_at BETWEEN '2024-02-01' AND '2024-02-28';
-- Solo escanea la partición orders_2024_q1
```

### Hints y Optimización de Consultas

```sql
-- Forzar el uso de un índice (MySQL)
SELECT * FROM users
USE INDEX (idx_users_email)
WHERE email = 'user@example.com';

-- Consulta en paralelo (PostgreSQL)
SET max_parallel_workers_per_gather = 4;
SELECT * FROM large_table WHERE condition;

-- Hints de join (PostgreSQL)
SET enable_nestloop = OFF;  -- Forzar hash join o merge join
```

## Mejores Prácticas

1.  **Indexa selectivamente**: Demasiados índices ralentizan las escrituras.
2.  **Monitorea el rendimiento de las consultas**: Usa los logs de consultas lentas (slow query logs).
3.  **Mantén las estadísticas actualizadas**: Ejecuta `ANALYZE` regularmente.
4.  **Usa tipos de datos adecuados**: Tipos más pequeños = mejor rendimiento.
5.  **Normaliza con cabeza**: Equilibra la normalización frente al rendimiento.
6.  **Cachea los datos accedidos con frecuencia**: Usa caché a nivel de aplicación.
7.  **Pooling de conexiones**: Reutiliza las conexiones a la base de datos.
8.  **Mantenimiento regular**: `VACUUM`, `ANALYZE`, reconstrucción de índices.

```sql
-- Actualizar estadísticas
ANALYZE users;
ANALYZE VERBOSE orders;

-- Vacuum (PostgreSQL)
VACUUM ANALYZE users;
VACUUM FULL users;  -- Reclama espacio (bloquea la tabla)

-- Reindexar
REINDEX INDEX idx_users_email;
REINDEX TABLE users;
```

## Errores Comunes (Pitfalls)

- **Sobre-indexación**: Cada índice ralentiza INSERT/UPDATE/DELETE.
- **Índices no utilizados**: Desperdician espacio y ralentizan las escrituras.
- **Falta de índices**: Consultas lentas, escaneos completos de tabla.
- **Conversión de tipos implícita**: Impide el uso de índices.
- **Condiciones OR**: Pueden no usar los índices de forma eficiente.
- **LIKE con comodín inicial**: `LIKE '%abc'` no puede usar el índice.
- **Funciones en el WHERE**: Impiden el uso de índices a menos que exista un índice funcional.

## Monitoreo de Consultas

```sql
-- Encontrar consultas lentas (PostgreSQL)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Encontrar índices faltantes (PostgreSQL)
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;

-- Encontrar índices no utilizados (PostgreSQL)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Recursos

- **references/postgres-optimization-guide.md**: Optimización específica de PostgreSQL.
- **references/mysql-optimization-guide.md**: Optimización de MySQL/MariaDB.
- **references/query-plan-analysis.md**: Análisis profundo de planes EXPLAIN.
- **assets/index-strategy-checklist.md**: Cuándo y cómo crear índices.
- **assets/query-optimization-checklist.md**: Guía paso a paso de optimización.
- **scripts/analyze-slow-queries.sql**: Identifica consultas lentas en tu base de datos.
- **scripts/index-recommendations.sql**: Genera recomendaciones de índices.
