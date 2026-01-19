// Script para verificar qué está devolviendo el backend
// Ejecutar en consola del navegador

fetch("http://localhost:3001/api/jams/all")
  .then((r) => r.json())
  .then((jams) => {
    console.log("📊 ANÁLISIS DE JAMS DEL BACKEND");
    console.log("================================\n");

    console.log(`Total jams: ${jams.length}`);

    const withLine = jams.filter((j) => j.line && j.line.length > 0);
    const withPolyline = jams.filter(
      (j) => j.polyline && j.polyline.length > 0
    );
    const withBlocking = jams.filter((j) => j.blockingAlertUuid);

    console.log(`\nJams con line: ${withLine.length}`);
    console.log(`Jams con polyline: ${withPolyline.length}`);
    console.log(`Jams con blockingAlertUuid: ${withBlocking.length}`);

    if (withBlocking.length > 0) {
      console.log("\n🚧 Jams con blockingAlertUuid:");
      withBlocking.forEach((j, i) => {
        console.log(`\n  #${i + 1}:`);
        console.log(`    ID: ${j.id}`);
        console.log(`    blockingAlertUuid: ${j.blockingAlertUuid}`);
        console.log(`    Calle: ${j.street}`);
        console.log(
          `    line: ${j.line ? j.line.length + " puntos" : "VACÍO"}`
        );
        console.log(
          `    polyline: ${
            j.polyline ? j.polyline.length + " puntos" : "VACÍO"
          }`
        );

        if (j.line && j.line.length > 0) {
          console.log(`    ✅ Tiene geometría en line`);
        } else if (j.polyline && j.polyline.length > 0) {
          console.log(`    ⚠️ Tiene geometría en polyline (no en line)`);
        } else {
          console.log(`    ❌ NO tiene geometría`);
        }
      });
    }

    console.log("\n\n🔍 SOLUCIÓN:");
    if (
      withBlocking.length > 0 &&
      withLine.length === 0 &&
      withPolyline.length > 0
    ) {
      console.log("❌ El backend está devolviendo 'polyline' pero NO 'line'");
      console.log(
        "✅ Necesitas actualizar el backend para mapear polyline → line"
      );
    } else if (withBlocking.length > 0 && withLine.length > 0) {
      console.log("✅ El backend está devolviendo 'line' correctamente");
      console.log("✅ Las líneas de cierre deberían mostrarse en el mapa");
    } else {
      console.log("⚠️ No hay jams con blockingAlertUuid en los datos");
    }
  });
