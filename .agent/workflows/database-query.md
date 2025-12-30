---
description: Query PostgreSQL con prepared statements
---


typescript// ✅ CORRECTO
const result = await db.query(
  'SELECT * FROM waze_alerts WHERE polygon_id = $1 AND is_active = true',
  [polygonId]
);

// Con transaction
await db.transaction(async (client) => {
  await client.query('INSERT INTO alerts VALUES ($1, $2)', [uuid, type]);
  await client.query('UPDATE polygons SET alert_count = alert_count + 1 WHERE id = $1', [polygonId]);
});

// ❌ NUNCA string concatenation
const bad = await db.query(`SELECT * FROM alerts WHERE id = '${id}'`);
Reglas:

Connection pooling
Prepared statements SIEMPRE
Transactions para multi-tabla
Indices en WHERE/JOIN
Log queries >100ms

