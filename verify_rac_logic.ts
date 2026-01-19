// Mock types
interface Polygon {
  id: string;
  group: string;
}

interface Alert {
  type: string;
  polygon_id: string;
}

// Logic copied from implementation
const RAC_GROUPS = [
  "Autovía A-019",
  "Área Capital",
  "Ruta Nacional 9",
  "Ruta Nacional 19",
  "Ruta Nacional 36",
];

function calculateKPI(polygons: Polygon[], alerts: Alert[]) {
  // IDs de polígonos que pertenecen a la RAC
  const racPolygonIds = new Set(
    polygons.filter((p) => RAC_GROUPS.includes(p.group || "")).map((p) => p.id)
  );

  let racAccidentsTotal = 0;

  for (const alert of alerts) {
    if (
      (alert.type === "ACCIDENT" || alert.type.startsWith("ACCIDENT_")) &&
      alert.polygon_id &&
      racPolygonIds.has(alert.polygon_id)
    ) {
      racAccidentsTotal++;
    }
  }
  return racAccidentsTotal;
}

// Test Data
const mockPolygons: Polygon[] = [
  { id: "P1", group: "Autovía A-019" }, // RAC
  { id: "P2", group: "Área Capital" }, // RAC
  { id: "P3", group: "Other Group" }, // Not RAC
];

const mockAlerts: Alert[] = [
  { type: "ACCIDENT", polygon_id: "P1" }, // Should count
  { type: "ACCIDENT_MAJOR", polygon_id: "P2" }, // Should count
  { type: "JAM", polygon_id: "P1" }, // Wrong type
  { type: "ACCIDENT", polygon_id: "P3" }, // Wrong group
];

// Run verification
const result = calculateKPI(mockPolygons, mockAlerts);
console.log(`Expected: 2, Got: ${result}`);

if (result === 2) {
  console.log("✅ Logic verification PASSED");
} else {
  console.error("❌ Logic verification FAILED");
  process.exit(1);
}
