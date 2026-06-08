const fs = require("fs");
const path = require("path");

const src = path.join(
  __dirname,
  "../../frontend/src/data/mock/realCordobaPolygons.ts",
);
let content = fs.readFileSync(src, "utf8");
content = content.replace(/PolygonState\.\w+/g, "'LOW'");
const match = content.match(/export const realCordobaPolygons[^=]*=\s*(\[[\s\S]*\]);/);
if (!match) {
  console.error("Could not parse realCordobaPolygons");
  process.exit(1);
}
const polys = eval(match[1]);
const out = polys
  .map((p) => ({ id: p.id, name: p.name, geometry: p.geometry }))
  .filter((p) => p.geometry?.coordinates?.length);
const outPath = path.join(__dirname, "../data/rac-polygon-geometries.json");
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`Exported ${out.length} RAC geometries → ${outPath}`);
