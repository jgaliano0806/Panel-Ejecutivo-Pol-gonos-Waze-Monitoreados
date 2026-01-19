import { dbService } from "./apps/backend/src/database/dbService";
import { repositories } from "./apps/backend/src/repositories";
import { roadAccidentService } from "./apps/backend/src/services/roadAccidentService";
import { NETWORK_CONFIG } from "./apps/frontend/src/config/constants";

async function checkData() {
  try {
    console.log("Checking road_accidents table...");
    const accidents = await roadAccidentService.getAccidents({ limit: 10 });
    console.log("Road Accidents Count:", accidents.length);
    console.log("Accidents:", JSON.stringify(accidents, null, 2));

    const stats = await roadAccidentService.getAccidentsCount();
    console.log("Road Accidents Stats (Service):", stats);

    console.log("Checking Waze Alerts in RAC...");
    const alerts = await repositories().wazeAlerts.findAllActive();
    const racGroups = NETWORK_CONFIG.racGroups;

    // Get polygons to check groups
    const polygons = await repositories().polygons.findAll();
    const racPolygonIds = polygons
      .filter((p: any) => racGroups.includes(p.group))
      .map((p: any) => p.id);

    const racWazeAccidents = alerts.filter(
      (a) =>
        a.type === "ACCIDENT" &&
        a.polygon_id &&
        racPolygonIds.includes(a.polygon_id)
    );

    console.log("Waze Active Accidents in RAC:", racWazeAccidents.length);
    console.log(
      "Waze Accidents:",
      JSON.stringify(
        racWazeAccidents.map((a) => ({
          id: a.uuid,
          type: a.type,
          subtype: a.subtype,
          polygon: a.polygon_id,
        })),
        null,
        2
      )
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

checkData();
