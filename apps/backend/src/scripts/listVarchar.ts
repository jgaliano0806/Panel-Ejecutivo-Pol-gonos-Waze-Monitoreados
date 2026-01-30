import { dbService } from "../database/dbService";

async function listVarcharColumns() {
  try {
    const result = await dbService.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'character varying'
        AND table_name IN ('waze_alerts', 'waze_jams', 'alerts', 'incidents_history', 'config_polygons', 'polygon_snapshots')
      ORDER BY table_name, column_name;
    `);

    console.log("Columnas VARCHAR candidatas a optimización:");
    console.table(result.rows);
  } catch (error) {
    console.error(error);
  }
}

listVarcharColumns();
