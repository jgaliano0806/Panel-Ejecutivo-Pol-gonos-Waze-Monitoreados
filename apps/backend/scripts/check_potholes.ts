import { dbService } from "../src/database/dbService";

async function checkPotholes() {
  try {
    console.log("--- Checking Pothole Data ---");

    // 1. Check total potholes in the last 24 hours
    const query24h = `
      SELECT count(*) as count
      FROM waze_alerts
      WHERE subtype = 'HAZARD_ON_ROAD_POT_HOLE'
      AND pub_millis > (EXTRACT(EPOCH FROM NOW()) * 1000 - 86400000)
    `;
    const res24h = await dbService.query(query24h);
    console.log(`Potholes in last 24h: ${res24h.rows[0].count}`);

    // 2. Check total potholes in the last 1 hour (current service window)
    const query1h = `
      SELECT count(*) as count
      FROM waze_alerts
      WHERE subtype = 'HAZARD_ON_ROAD_POT_HOLE'
      AND pub_millis > (EXTRACT(EPOCH FROM NOW()) * 1000 - 3600000)
    `;
    const res1h = await dbService.query(query1h);
    console.log(`Potholes in last 1h: ${res1h.rows[0].count}`);

    // 3. List some examples to check street names and grouping
    const queryList = `
      SELECT street, city, count(*) as count
      FROM waze_alerts
      WHERE subtype = 'HAZARD_ON_ROAD_POT_HOLE'
      AND pub_millis > (EXTRACT(EPOCH FROM NOW()) * 1000 - 86400000)
      GROUP BY street, city
      ORDER BY count DESC
      LIMIT 10
    `;
    const resList = await dbService.query(queryList);
    console.table(resList.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

checkPotholes();
