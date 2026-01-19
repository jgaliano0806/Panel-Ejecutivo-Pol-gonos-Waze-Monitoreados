// Script para buscar ID en la API
// Ejecutar en consola del navegador (F12)

const searchId = "eabe1424-8078-4e5d-b145-aca8d1e6fad0";

console.log(`🔍 Buscando ID: ${searchId}\n`);

Promise.all([
  fetch("http://localhost:3001/api/incidents/all").then((r) => r.json()),
  fetch("http://localhost:3001/api/jams/all").then((r) => r.json()),
])
  .then(([incidents, jams]) => {
    console.log("📊 RESULTADOS DE BÚSQUEDA");
    console.log("========================\n");

    // Buscar en incidents
    const incident = incidents.find((i) => i.id === searchId);
    if (incident) {
      console.log("✅ ENCONTRADO EN INCIDENTS:");
      console.log(incident);
      console.log("\n");
    } else {
      console.log("❌ No encontrado en incidents\n");
    }

    // Buscar en jams
    const jam = jams.find((j) => j.id === searchId);
    if (jam) {
      console.log("✅ ENCONTRADO EN JAMS:");
      console.log(jam);
      console.log("\n");
    } else {
      console.log("❌ No encontrado en jams\n");
    }

    // Buscar jams que referencien este ID como blockingAlertUuid
    const referencingJams = jams.filter(
      (j) => j.blockingAlertUuid === searchId
    );
    if (referencingJams.length > 0) {
      console.log(
        `✅ JAMS QUE REFERENCIAN ESTE ID (${referencingJams.length}):`
      );
      referencingJams.forEach((j, i) => {
        console.log(`\n  Jam #${i + 1}:`);
        console.log(`    ID: ${j.id}`);
        console.log(`    Calle: ${j.street || "N/A"}`);
        console.log(`    Level: ${j.level}`);
        console.log(`    Speed: ${j.speed || j.speedKMH} km/h`);
        console.log(
          `    Tiene line: ${
            j.line ? "SÍ (" + j.line.length + " puntos)" : "NO"
          }`
        );
        console.log(
          `    Tiene polyline: ${
            j.polyline ? "SÍ (" + j.polyline.length + " puntos)" : "NO"
          }`
        );
      });
      console.log("\n");
    } else {
      console.log("❌ No hay jams que referencien este ID\n");
    }

    // Si es un incident de tipo ROAD_CLOSED, buscar jams cercanos
    if (incident && incident.type.toLowerCase().includes("roadclosed")) {
      console.log("🚧 Es un ROAD_CLOSED, buscando jams cercanos...\n");

      const nearbyJams = jams.filter((j) => {
        if (!j.line || j.line.length < 2) return false;

        const jamStart = j.line[0];
        const dx =
          (jamStart.x - incident.location.lng) *
          111320 *
          Math.cos((incident.location.lat * Math.PI) / 180);
        const dy = (jamStart.y - incident.location.lat) * 110540;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < 1000; // 1km
      });

      console.log(`📍 Jams cercanos (<1km): ${nearbyJams.length}`);
      if (nearbyJams.length > 0) {
        nearbyJams.slice(0, 5).forEach((j, i) => {
          const jamStart = j.line[0];
          const dx =
            (jamStart.x - incident.location.lng) *
            111320 *
            Math.cos((incident.location.lat * Math.PI) / 180);
          const dy = (jamStart.y - incident.location.lat) * 110540;
          const distance = Math.sqrt(dx * dx + dy * dy);

          console.log(`\n  Jam #${i + 1}:`);
          console.log(`    ID: ${j.id}`);
          console.log(`    Calle: ${j.street || "N/A"}`);
          console.log(`    Distancia: ${Math.round(distance)}m`);
          console.log(
            `    Tiene line: ${
              j.line ? "SÍ (" + j.line.length + " puntos)" : "NO"
            }`
          );
        });
      }
    }

    console.log("\n\n✅ Búsqueda completada");
  })
  .catch((err) => console.error("❌ Error:", err));
