// Script de diagnóstico para cierres de camino
// Ejecutar en la consola del navegador (F12)

console.log("🔍 DIAGNÓSTICO DE CIERRES DE CAMINO");
console.log("=====================================\n");

// 1. Obtener datos de incidents
fetch("http://localhost:3001/api/incidents/all")
  .then((r) => r.json())
  .then((incidents) => {
    const closures = incidents.filter(
      (inc) =>
        inc.type.toLowerCase().includes("roadclosed") ||
        inc.type.toLowerCase().includes("road_closed")
    );

    console.log(`📊 Total incidents: ${incidents.length}`);
    console.log(`🚧 Cierres de camino: ${closures.length}\n`);

    if (closures.length > 0) {
      console.log("Detalles de cierres:");
      closures.forEach((closure, i) => {
        console.log(`\n  Cierre #${i + 1}:`);
        console.log(`    ID: ${closure.id}`);
        console.log(`    Tipo: ${closure.type}`);
        console.log(`    Subtipo: ${closure.subtype || "N/A"}`);
        console.log(`    Calle: ${closure.street || "N/A"}`);
        console.log(
          `    Ubicación: ${closure.location.lat}, ${closure.location.lng}`
        );
      });
    }

    // 2. Obtener datos de jams
    return fetch("http://localhost:3001/api/jams/all")
      .then((r) => r.json())
      .then((jams) => ({ closures, jams }));
  })
  .then(({ closures, jams }) => {
    console.log(`\n📊 Total jams: ${jams.length}`);
    console.log(
      `📍 Jams con polyline: ${
        jams.filter((j) => j.polyline && j.polyline.length > 0).length
      }`
    );
    console.log(
      `📍 Jams con line: ${
        jams.filter((j) => j.line && j.line.length > 0).length
      }`
    );
    console.log(
      `🔗 Jams con blockingAlertUuid: ${
        jams.filter((j) => j.blockingAlertUuid).length
      }\n`
    );

    if (closures.length > 0) {
      console.log("🔍 Buscando jams asociados a cada cierre:\n");

      closures.forEach((closure, i) => {
        console.log(`\n  Cierre #${i + 1} (${closure.id}):`);

        // Buscar por blockingAlertUuid
        const byUuid = jams.filter((j) => j.blockingAlertUuid === closure.id);
        console.log(`    ✓ Por blockingAlertUuid: ${byUuid.length}`);

        // Buscar por calle
        const byStreet = jams.filter(
          (j) => j.street && closure.street && j.street === closure.street
        );
        console.log(`    ✓ Por calle (${closure.street}): ${byStreet.length}`);

        // Buscar por proximidad
        const nearby = jams.filter((j) => {
          if (!j.line || j.line.length < 2) return false;

          const jamStart = j.line[0];
          const dx =
            (jamStart.x - closure.location.lng) *
            111320 *
            Math.cos((closure.location.lat * Math.PI) / 180);
          const dy = (jamStart.y - closure.location.lat) * 110540;
          const distance = Math.sqrt(dx * dx + dy * dy);

          return distance < 1000; // 1km
        });
        console.log(`    ✓ Por proximidad (<1km): ${nearby.length}`);

        if (nearby.length > 0) {
          console.log(`\n    Jams cercanos:`);
          nearby.slice(0, 3).forEach((j) => {
            const jamStart = j.line[0];
            const dx =
              (jamStart.x - closure.location.lng) *
              111320 *
              Math.cos((closure.location.lat * Math.PI) / 180);
            const dy = (jamStart.y - closure.location.lat) * 110540;
            const distance = Math.sqrt(dx * dx + dy * dy);

            console.log(
              `      - ${j.id}: ${j.street || "sin calle"} (${Math.round(
                distance
              )}m)`
            );
          });
        }
      });
    }

    console.log("\n\n✅ Diagnóstico completado");
    console.log("=====================================");
  })
  .catch((err) => {
    console.error("❌ Error:", err);
  });
