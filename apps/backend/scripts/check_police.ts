import { dbService } from "../src/database/dbService";

async function checkPoliceAlerts() {
  try {
    console.log("Connecting to DB...");
    const result = await dbService.query(`
      SELECT type, subtype, count(*) as count
      FROM waze_alerts
      WHERE is_active = true
      GROUP BY type, subtype
      ORDER BY count DESC
    `);

    console.log("Active Alerts by Type:");
    console.table(result.rows);

    const police = result.rows.filter((r) => r.type === "POLICE");
    if (police.length === 0) {
      console.log("❌ NO POLICE ALERTS FOUND IN DB");
    } else {
      console.log("✅ Found police alerts in DB");
    }

    // Verificar si hay mapeo en incidents_types
    const types = await dbService.query(
      `SELECT * FROM incident_types WHERE code = 'POLICE'`
    );
    console.log("Incident Types config for POLICE:");
    console.table(types.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

checkPoliceAlerts();
