const { Pool } = require("pg");

async function checkIncidentsHistory() {
  const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "panel_waze",
    user: "postgres",
    password: "CASISA",
  });

  try {
    console.log("--- Checking Incidents History Table ---\n");

    // 1. Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'incidents_history'
      );
    `;
    const tableExistsRes = await pool.query(tableExistsQuery);
    console.log(`Table exists: ${tableExistsRes.rows[0].exists}\n`);

    if (!tableExistsRes.rows[0].exists) {
      console.log("❌ Table incidents_history does not exist!");
      return;
    }

    // 2. Count total records
    const countQuery = `SELECT COUNT(*) as count FROM incidents_history`;
    const countRes = await pool.query(countQuery);
    console.log(`Total records: ${countRes.rows[0].count}\n`);

    // 3. Sample recent incidents
    const sampleQuery = `
      SELECT
        incident_id,
        polygon_id,
        type,
        subtype,
        street,
        first_seen_at,
        last_seen_at,
        duration_minutes
      FROM incidents_history
      ORDER BY first_seen_at DESC
      LIMIT 10
    `;
    const sampleRes = await pool.query(sampleQuery);

    console.log("Recent incidents:");
    console.table(
      sampleRes.rows.map((row) => ({
        incident_id: row.incident_id.substring(0, 12),
        polygon: row.polygon_id,
        type: row.type,
        street: row.street || "N/A",
        first_seen: row.first_seen_at,
        duration: row.duration_minutes || "ongoing",
      }))
    );

    // 4. Count by type
    const typeCountQuery = `
      SELECT type, COUNT(*) as count
      FROM incidents_history
      GROUP BY type
      ORDER BY count DESC
    `;
    const typeCountRes = await pool.query(typeCountQuery);

    console.log("\nIncidents by type:");
    console.table(typeCountRes.rows);

    // 5. Date range
    const dateRangeQuery = `
      SELECT
        MIN(first_seen_at) as earliest,
        MAX(first_seen_at) as latest
      FROM incidents_history
    `;
    const dateRangeRes = await pool.query(dateRangeQuery);
    console.log("\nDate range:");
    console.log("Earliest:", dateRangeRes.rows[0].earliest);
    console.log("Latest:", dateRangeRes.rows[0].latest);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkIncidentsHistory();
