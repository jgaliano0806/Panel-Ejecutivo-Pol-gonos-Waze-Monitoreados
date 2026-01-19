const { Pool } = require("pg");

async function checkWeatherData() {
  const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "panel_waze",
    user: "postgres",
    password: "CASISA",
  });

  try {
    console.log("--- Checking Weather Data in Road Accidents ---\n");

    // 1. Count total accidents
    const totalQuery = `SELECT COUNT(*) as count FROM road_accidents`;
    const totalRes = await pool.query(totalQuery);
    console.log(`Total accidents: ${totalRes.rows[0].count}\n`);

    // 2. Count accidents with weather_data
    const withWeatherQuery = `
      SELECT COUNT(*) as count
      FROM road_accidents
      WHERE weather_data IS NOT NULL
      AND weather_data::text != '{}'
      AND weather_data::text != 'null'
    `;
    const withWeatherRes = await pool.query(withWeatherQuery);
    console.log(
      `Accidents with weather data: ${withWeatherRes.rows[0].count}\n`
    );

    // 3. Sample recent accidents with their weather data
    const sampleQuery = `
      SELECT
        id,
        street,
        accident_at,
        weather_data,
        LENGTH(weather_data::text) as weather_data_length
      FROM road_accidents
      ORDER BY accident_at DESC
      LIMIT 5
    `;
    const sampleRes = await pool.query(sampleQuery);

    console.log("Recent accidents sample:");
    console.table(
      sampleRes.rows.map((row) => ({
        id: row.id.substring(0, 8),
        street: row.street || "N/A",
        accident_at: row.accident_at,
        has_weather:
          row.weather_data && row.weather_data_length > 2 ? "YES" : "NO",
        weather_length: row.weather_data_length,
      }))
    );

    // 4. Show one full weather_data example
    const exampleQuery = `
      SELECT id, street, weather_data
      FROM road_accidents
      WHERE weather_data IS NOT NULL
      AND weather_data::text != '{}'
      LIMIT 1
    `;
    const exampleRes = await pool.query(exampleQuery);

    if (exampleRes.rows.length > 0) {
      console.log("\nExample weather_data structure:");
      console.log("ID:", exampleRes.rows[0].id);
      console.log("Street:", exampleRes.rows[0].street);
      console.log(
        "Weather Data:",
        JSON.stringify(exampleRes.rows[0].weather_data, null, 2)
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkWeatherData();
