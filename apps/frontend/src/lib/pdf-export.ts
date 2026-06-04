/**
 * Utilidad para exportar incidentes y siniestros a PDF
 * Usa jsPDF para generar documentos PDF con branding de Caminos de las Sierras
 *
 * NOTA: jsPDF se importa dinámicamente (~300 KB) para no inflar el bundle inicial.
 * Solo se carga cuando el usuario dispara una exportación.
 */
import type { Incident } from "../hooks/useIncidentsModule";
import {
  translateIncidentType,
  translateIncidentSubtype,
} from "../hooks/useIncidentsModule";
import type { RoadAccident } from "../hooks/useRoadAccidents";
import { API_CONFIG, TILES_VERSION } from "../config/constants";

// Colores corporativos de Caminos de las Sierras
const BRAND_COLORS = {
  green: [46, 139, 87] as [number, number, number], // #2E8B57 - Verde principal
  greenDark: [34, 102, 68] as [number, number, number], // #226644 - Verde oscuro
  yellow: [255, 215, 0] as [number, number, number], // #FFD700 - Amarillo
  yellowLight: [255, 235, 100] as [number, number, number], // Amarillo claro
  textDark: [31, 41, 55] as [number, number, number], // Gris oscuro
  textMuted: [107, 114, 128] as [number, number, number], // Gris
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Carga el logo como base64
 */
async function loadLogoAsBase64(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/logo_cs.png";
  });
}

/**
 * Genera una imagen del mapa usando tiles de CARTO Light via proxy interno
 * Renderiza los tiles en un canvas local con el marcador centrado
 */
async function generateMapImage(
  lat: number,
  lng: number,
  zoom: number = 16,
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const tileSize = 256;
      // Canvas más cuadrado y 20% más grande (proporción 5:4)
      const canvasWidth = 500;
      const canvasHeight = 400;

      // Calcular coordenada de tile fraccionaria (precisión completa)
      const n = Math.pow(2, zoom);
      const xTileFrac = ((lng + 180) / 360) * n;
      const yTileFrac =
        ((1 -
          Math.log(
            Math.tan((lat * Math.PI) / 180) +
              1 / Math.cos((lat * Math.PI) / 180),
          ) /
            Math.PI) /
          2) *
        n;

      // Tile central (entero)
      const centerTileX = Math.floor(xTileFrac);
      const centerTileY = Math.floor(yTileFrac);

      // Offset en píxeles del centro del canvas al punto exacto del marker
      // Este es el desplazamiento dentro del tile central
      const pixelOffsetX = (xTileFrac - centerTileX) * tileSize;
      const pixelOffsetY = (yTileFrac - centerTileY) * tileSize;

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(null);
        return;
      }

      // Fondo gris claro mientras carga
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Cuántos tiles necesitamos en cada dirección desde el centro
      const tilesNeededX = Math.ceil(canvasWidth / tileSize / 2) + 1;
      const tilesNeededY = Math.ceil(canvasHeight / tileSize / 2) + 1;

      const tileLoadPromises: Promise<void>[] = [];

      // Iterar sobre la grilla de tiles
      for (let dx = -tilesNeededX; dx <= tilesNeededX; dx++) {
        for (let dy = -tilesNeededY; dy <= tilesNeededY; dy++) {
          const tileX = centerTileX + dx;
          const tileY = centerTileY + dy;

          // Calcular posición del tile en el canvas
          // El tile central se dibuja de modo que el punto (pixelOffsetX, pixelOffsetY)
          // quede exactamente en el centro del canvas
          const drawX = canvasWidth / 2 - pixelOffsetX + dx * tileSize;
          const drawY = canvasHeight / 2 - pixelOffsetY + dy * tileSize;

          // Solo cargar tiles que intersectan con el canvas
          if (
            drawX + tileSize < 0 ||
            drawX > canvasWidth ||
            drawY + tileSize < 0 ||
            drawY > canvasHeight
          ) {
            continue;
          }

          // Validar coordenadas de tile
          if (tileX < 0 || tileX >= n || tileY < 0 || tileY >= n) {
            continue;
          }

          const promise = new Promise<void>((tileResolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";

            img.onload = () => {
              ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
              tileResolve();
            };

            img.onerror = () => {
              // Si falla, dibujar un placeholder gris
              ctx.fillStyle = "#e5e7eb";
              ctx.fillRect(drawX, drawY, tileSize, tileSize);
              tileResolve();
            };

            const tilesBase = API_CONFIG.tilesBase || "";
            img.src = `${tilesBase}/tiles/v2/carto-light/${zoom}/${tileX}/${tileY}.png?v=${TILES_VERSION}`;
          });

          tileLoadPromises.push(promise);
        }
      }

      // Esperar a que todos los tiles se carguen o timeout
      const timeout = new Promise<void>((r) => setTimeout(r, 8000));
      Promise.race([Promise.all(tileLoadPromises), timeout]).then(() => {
        // Dibujar marcador exactamente en el centro del canvas
        const markerX = canvasWidth / 2;
        const markerY = canvasHeight / 2;

        // Sombra del pin
        ctx.beginPath();
        ctx.ellipse(markerX, markerY + 3, 8, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();

        // Cuerpo del pin (círculo)
        ctx.beginPath();
        ctx.arc(markerX, markerY - 18, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626"; // Rojo para mayor visibilidad
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Punto central blanco
        ctx.beginPath();
        ctx.arc(markerX, markerY - 18, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Punta del pin (triángulo)
        ctx.beginPath();
        ctx.moveTo(markerX - 10, markerY - 10);
        ctx.lineTo(markerX, markerY + 2);
        ctx.lineTo(markerX + 10, markerY - 10);
        ctx.fillStyle = "#dc2626";
        ctx.fill();

        resolve(canvas.toDataURL("image/png"));
      });
    } catch (error) {
      console.error("Error generando mapa:", error);
      resolve(null);
    }
  });
}

/**
 * Genera y descarga un PDF con el detalle de un incidente
 * Incluye branding de Caminos de las Sierras
 */
export async function exportIncidentToPDF(
  incident: Incident,
  generatedBy?: string,
  polygonName?: string,
  polygonGroup?: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cargar logo y mapa en paralelo
  const [logoBase64, mapImage] = await Promise.all([
    loadLogoAsBase64(),
    generateMapImage(incident.location.lat, incident.location.lng, 15),
  ]);

  let yPos = 10;

  // === HEADER CON BRANDING ===
  // Banda superior verde
  doc.setFillColor(...BRAND_COLORS.green);
  doc.rect(0, 0, pageWidth, 8, "F");

  // Banda amarilla delgada
  doc.setFillColor(...BRAND_COLORS.yellow);
  doc.rect(0, 8, pageWidth, 3, "F");

  yPos = 18;

  // Logo (si está disponible)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 12, yPos, 35, 18);
  }

  // Título del reporte
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE INCIDENTE", logoBase64 ? 55 : 15, yPos + 8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_COLORS.textMuted);
  const headerX = logoBase64 ? 55 : 15;
  const generatedText = `Generado: ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`;
  doc.text(generatedText, headerX, yPos + 15);
  if (generatedBy) {
    doc.text(`Por: ${generatedBy}`, headerX, yPos + 20);
  }

  yPos = generatedBy ? 48 : 45;

  // === LÍNEA SEPARADORA ===
  doc.setDrawColor(...BRAND_COLORS.green);
  doc.setLineWidth(1);
  doc.line(15, yPos, pageWidth - 15, yPos);

  yPos += 10;

  // === TIPO DE INCIDENTE ===
  doc.setTextColor(...BRAND_COLORS.green);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(translateIncidentType(incident.type), 15, yPos);

  // Badge de estado
  const estado = incident.isActive ? "ACTIVO" : "INACTIVO";
  const estadoColor = incident.isActive
    ? BRAND_COLORS.green
    : BRAND_COLORS.textMuted;
  doc.setFillColor(...estadoColor);
  doc.roundedRect(pageWidth - 40, yPos - 6, 25, 8, 2, 2, "F");
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(7);
  doc.text(estado, pageWidth - 27.5, yPos - 1, { align: "center" });

  yPos += 7;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(translateIncidentSubtype(incident.subtype), 15, yPos);

  yPos += 5;
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(8);
  doc.text(`ID: ${incident.uuid}`, 15, yPos);

  yPos += 10;

  // === MAPA (si está disponible) ===
  if (mapImage) {
    doc.setTextColor(...BRAND_COLORS.greenDark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ubicación en Mapa", 15, yPos);
    yPos += 5;

    // Mantener proporción del canvas (500x400 = 5:4)
    const mapWidth = pageWidth - 30; // ~180mm
    const mapHeight = mapWidth * (400 / 500); // Mantener proporción 5:4 = ~144mm, limitamos a 70mm
    const actualMapHeight = Math.min(mapHeight, 70);
    const actualMapWidth = actualMapHeight * (500 / 400); // Ajustar ancho proporcionalmente
    const mapX = (pageWidth - actualMapWidth) / 2; // Centrar horizontalmente
    doc.addImage(mapImage, "PNG", mapX, yPos, actualMapWidth, actualMapHeight);

    // Borde del mapa
    doc.setDrawColor(...BRAND_COLORS.green);
    doc.setLineWidth(0.5);
    doc.rect(mapX, yPos, actualMapWidth, actualMapHeight);

    yPos += actualMapHeight + 8;
  }

  // === UBICACIÓN VIAL ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Ubicación Vial", 15, yPos);

  yPos += 6;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (incident.nearestKmName) {
    const route = incident.nearestKmRoute ? `${incident.nearestKmRoute} - ` : "";
    const km = incident.nearestKmName.split(" - ").pop() || incident.nearestKmName;
    doc.text(`${route}${km}`, 15, yPos);
    
    // Subtexto con la calle original si existe
    if (incident.street) {
      yPos += 5;
      doc.setTextColor(...BRAND_COLORS.textMuted);
      doc.setFontSize(9);
      doc.text(incident.street, 15, yPos);
    }
  } else {
    doc.text(incident.street || "Sin calle especificada", 15, yPos);
  }

  if (incident.city) {
    yPos += 5;
    doc.setTextColor(...BRAND_COLORS.textMuted);
    doc.setFontSize(9);
    doc.text(`${incident.city}, ${incident.country || "Argentina"}`, 15, yPos);
  }

  yPos += 5;
  doc.setFontSize(8);
  doc.text(
    `Coordenadas: ${incident.location.lat.toFixed(6)}, ${incident.location.lng.toFixed(6)}`,
    15,
    yPos,
  );

  yPos += 10;

  // === FECHA Y HORA ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha y Hora del Reporte", 15, yPos);

  yPos += 6;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fecha = new Date(incident.createdAt).toLocaleString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  doc.text(fecha, 15, yPos);

  yPos += 10;

  // === MÉTRICAS DE WAZE ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Métricas de Verificación (Waze)", 15, yPos);

  yPos += 7;

  // Cuadros de métricas con colores corporativos
  const boxWidth = 55;
  const boxHeight = 20;
  const boxY = yPos;

  // Experiencia del reportador (Verde)
  doc.setFillColor(220, 252, 231); // Verde muy claro
  doc.roundedRect(15, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...BRAND_COLORS.green);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, boxY, boxWidth, boxHeight, 3, 3, "S");
  doc.setTextColor(...BRAND_COLORS.green);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${incident.reliability?.toFixed(1) || "N/A"}/10`,
    15 + boxWidth / 2,
    boxY + 8,
    { align: "center" },
  );
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Exp. Reportador", 15 + boxWidth / 2, boxY + 14, {
    align: "center",
  });

  // Verificado por comunidad (Amarillo)
  doc.setFillColor(254, 249, 195); // Amarillo muy claro
  doc.roundedRect(75, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...BRAND_COLORS.yellow);
  doc.roundedRect(75, boxY, boxWidth, boxHeight, 3, 3, "S");
  doc.setTextColor(161, 98, 7); // Amarillo oscuro
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${incident.confidence?.toFixed(1) || "N/A"}/10`,
    75 + boxWidth / 2,
    boxY + 8,
    { align: "center" },
  );
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Verif. Comunidad", 75 + boxWidth / 2, boxY + 14, {
    align: "center",
  });

  // Confirmaciones (Verde oscuro)
  doc.setFillColor(209, 250, 229); // Verde claro
  doc.roundedRect(135, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...BRAND_COLORS.greenDark);
  doc.roundedRect(135, boxY, boxWidth, boxHeight, 3, 3, "S");
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${incident.thumbsUp || 0}`, 135 + boxWidth / 2, boxY + 8, {
    align: "center",
  });
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Confirmaciones", 135 + boxWidth / 2, boxY + 14, {
    align: "center",
  });

  yPos = boxY + boxHeight + 10;

  // === INFORMACIÓN ADICIONAL ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Información Adicional", 15, yPos);

  yPos += 6;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const polyDisplay = polygonName || incident.polygonId || "N/A";
  doc.text(`Polígono: ${polyDisplay}`, 15, yPos);
  if (polygonGroup && polygonGroup !== "Sin Grupo") {
    yPos += 5;
    doc.text(`Grupo: ${polygonGroup}`, 15, yPos);
  }
  yPos += 5;
  doc.text(
    `Reportado por: ${incident.reportBy || "Usuario anónimo"}`,
    15,
    yPos,
  );

  // Descripción
  if (incident.description) {
    yPos += 7;
    doc.setTextColor(...BRAND_COLORS.greenDark);
    doc.setFont("helvetica", "bold");
    doc.text("Descripción:", 15, yPos);
    yPos += 5;
    doc.setTextColor(...BRAND_COLORS.textDark);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(incident.description, pageWidth - 30);
    doc.text(splitText, 15, yPos);
    yPos += splitText.length * 4;
  }

  // === ENLACES ===
  yPos += 8;
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(8);
  doc.text("Enlaces externos:", 15, yPos);
  yPos += 4;
  doc.setTextColor(...BRAND_COLORS.green);
  doc.textWithLink(
    `Google Maps: maps.google.com/?q=${incident.location.lat},${incident.location.lng}`,
    15,
    yPos,
    {
      url: `https://www.google.com/maps?q=${incident.location.lat},${incident.location.lng}`,
    },
  );
  yPos += 4;
  doc.textWithLink(
    `Waze: waze.com/ul?ll=${incident.location.lat},${incident.location.lng}`,
    15,
    yPos,
    {
      url: `https://www.waze.com/ul?ll=${incident.location.lat},${incident.location.lng}&navigate=yes`,
    },
  );

  // === FOOTER ===
  // Banda inferior
  doc.setFillColor(...BRAND_COLORS.yellow);
  doc.rect(0, pageHeight - 12, pageWidth, 3, "F");
  doc.setFillColor(...BRAND_COLORS.green);
  doc.rect(0, pageHeight - 9, pageWidth, 9, "F");

  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(8);
  doc.text(
    "Caminos de las Sierras S.A. - Sistema de Seguridad Vial",
    pageWidth / 2,
    pageHeight - 4,
    { align: "center" },
  );

  // Guardar PDF
  const fileName = `incidente_${incident.uuid.substring(0, 8)}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Genera y descarga un PDF con el detalle de un siniestro vial (RoadAccident)
 */
export async function exportAccidentToPDF(
  accident: RoadAccident,
  polygonName?: string,
  polygonGroup?: string,
  generatedBy?: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const [logoBase64, mapImage] = await Promise.all([
    loadLogoAsBase64(),
    generateMapImage(accident.location_lat, accident.location_lng, 15),
  ]);

  let yPos = 10;

  // === HEADER ===
  doc.setFillColor(...BRAND_COLORS.green);
  doc.rect(0, 0, pageWidth, 8, "F");
  doc.setFillColor(...BRAND_COLORS.yellow);
  doc.rect(0, 8, pageWidth, 3, "F");

  yPos = 18;

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 12, yPos, 35, 18);
  }

  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE SINIESTRO VIAL", logoBase64 ? 55 : 15, yPos + 8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_COLORS.textMuted);
  const accHeaderX = logoBase64 ? 55 : 15;
  doc.text(`Generado: ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`, accHeaderX, yPos + 15);
  if (generatedBy) {
    doc.text(`Por: ${generatedBy}`, accHeaderX, yPos + 20);
  }

  yPos = generatedBy ? 48 : 45;
  doc.setDrawColor(...BRAND_COLORS.green);
  doc.setLineWidth(1);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // === TIPO Y SEVERIDAD ===
  const subtypeLabels: Record<string, string> = {
    ACCIDENT_MINOR: "Accidente Leve",
    ACCIDENT_MAJOR: "Accidente Grave",
    ACCIDENT_CONSTRUCTION: "En Construcción",
    NO_SUBTYPE: "Accidente",
    ROAD_CLOSED_EVENT: "Calle Cerrada",
  };
  const typeLabel = accident.subtype
    ? subtypeLabels[accident.subtype] || accident.subtype.replace(/_/g, " ")
    : "Siniestro Vial";

  doc.setTextColor(...BRAND_COLORS.green);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabel, 15, yPos);

  if (accident.severity) {
    const sevColor: [number, number, number] =
      accident.severity >= 4 ? [220, 38, 38] : accident.severity >= 3 ? [234, 88, 12] : [59, 130, 246];
    doc.setFillColor(...sevColor);
    doc.roundedRect(pageWidth - 45, yPos - 6, 30, 8, 2, 2, "F");
    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(7);
    doc.text(`Nivel ${accident.severity}`, pageWidth - 30, yPos - 1, { align: "center" });
  }

  yPos += 5;
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(8);
  doc.text(`ID: ${accident.id}`, 15, yPos);
  yPos += 10;

  // === MAPA ===
  if (mapImage) {
    doc.setTextColor(...BRAND_COLORS.greenDark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ubicación en Mapa", 15, yPos);
    yPos += 5;

    const mapWidth = pageWidth - 30;
    const mapHeight = mapWidth * (400 / 500);
    const actualMapHeight = Math.min(mapHeight, 70);
    const actualMapWidth = actualMapHeight * (500 / 400);
    const mapX = (pageWidth - actualMapWidth) / 2;
    doc.addImage(mapImage, "PNG", mapX, yPos, actualMapWidth, actualMapHeight);
    doc.setDrawColor(...BRAND_COLORS.green);
    doc.setLineWidth(0.5);
    doc.rect(mapX, yPos, actualMapWidth, actualMapHeight);
    yPos += actualMapHeight + 8;
  }

  // === UBICACIÓN VIAL ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Ubicación Vial", 15, yPos);
  yPos += 6;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  if (accident.waze_data?.nearestKmName) {
    const route = accident.waze_data.nearestKmRoute ? `${accident.waze_data.nearestKmRoute} - ` : "";
    const km = accident.waze_data.nearestKmName.split(" - ").pop() || accident.waze_data.nearestKmName;
    doc.text(`${route}${km}`, 15, yPos);
    if (accident.street) {
      yPos += 5;
      doc.setTextColor(...BRAND_COLORS.textMuted);
      doc.setFontSize(9);
      doc.text(accident.street, 15, yPos);
    }
  } else {
    doc.text(accident.street || "Sin calle especificada", 15, yPos);
  }
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text(
    `Coordenadas: ${accident.location_lat.toFixed(6)}, ${accident.location_lng.toFixed(6)}`,
    15,
    yPos,
  );
  yPos += 10;

  // === FECHA ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha y Hora del Siniestro", 15, yPos);
  yPos += 6;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fecha = new Date(accident.accident_at).toLocaleString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  doc.text(fecha, 15, yPos);
  yPos += 10;

  // === MÉTRICAS ===
  const reliability = accident.waze_data?.reliability;
  const confidence = accident.waze_data?.confidence;
  const thumbsUp = accident.waze_data?.nThumbsUp || accident.waze_data?.thumbsUp || 0;

  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Métricas de Verificación (Waze)", 15, yPos);
  yPos += 7;

  const boxWidth = 55;
  const boxHeight = 20;
  const boxY = yPos;

  doc.setFillColor(220, 252, 231);
  doc.roundedRect(15, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...BRAND_COLORS.green);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, boxY, boxWidth, boxHeight, 3, 3, "S");
  doc.setTextColor(...BRAND_COLORS.green);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${reliability != null ? Number(reliability).toFixed(1) : "N/A"}/10`, 15 + boxWidth / 2, boxY + 8, { align: "center" });
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Exp. Reportador", 15 + boxWidth / 2, boxY + 14, { align: "center" });

  doc.setFillColor(254, 249, 195);
  doc.roundedRect(75, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...BRAND_COLORS.yellow);
  doc.roundedRect(75, boxY, boxWidth, boxHeight, 3, 3, "S");
  doc.setTextColor(161, 98, 7);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${confidence != null ? Number(confidence).toFixed(1) : "N/A"}/5`, 75 + boxWidth / 2, boxY + 8, { align: "center" });
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Verif. Comunidad", 75 + boxWidth / 2, boxY + 14, { align: "center" });

  doc.setFillColor(209, 250, 229);
  doc.roundedRect(135, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...BRAND_COLORS.greenDark);
  doc.roundedRect(135, boxY, boxWidth, boxHeight, 3, 3, "S");
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${thumbsUp}`, 135 + boxWidth / 2, boxY + 8, { align: "center" });
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Confirmaciones", 135 + boxWidth / 2, boxY + 14, { align: "center" });

  yPos = boxY + boxHeight + 10;

  // === INFORMACIÓN ADICIONAL ===
  doc.setTextColor(...BRAND_COLORS.greenDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Información Adicional", 15, yPos);
  yPos += 6;
  doc.setTextColor(...BRAND_COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.text(`Polígono: ${polygonName || accident.polygon_id || "N/A"}`, 15, yPos);
  if (polygonGroup && polygonGroup !== "Sin Grupo") {
    yPos += 5;
    doc.text(`Grupo: ${polygonGroup}`, 15, yPos);
  }
  yPos += 5;
  doc.text(`Reportado por: ${accident.waze_data?.reportBy || "Usuario anónimo"}`, 15, yPos);

  if (accident.description) {
    yPos += 7;
    doc.setTextColor(...BRAND_COLORS.greenDark);
    doc.setFont("helvetica", "bold");
    doc.text("Descripción:", 15, yPos);
    yPos += 5;
    doc.setTextColor(...BRAND_COLORS.textDark);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(accident.description, pageWidth - 30);
    doc.text(splitText, 15, yPos);
    yPos += splitText.length * 4;
  }

  if (accident.operator_notes) {
    yPos += 7;
    doc.setTextColor(...BRAND_COLORS.greenDark);
    doc.setFont("helvetica", "bold");
    doc.text("Notas del Operador:", 15, yPos);
    yPos += 5;
    doc.setTextColor(...BRAND_COLORS.textDark);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(accident.operator_notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
    yPos += splitNotes.length * 4;
  }

  // === CLIMA ===
  const w = accident.weather_data;
  if (w && Object.keys(w).length > 0) {
    yPos += 8;
    doc.setTextColor(...BRAND_COLORS.greenDark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Condiciones Climáticas", 15, yPos);
    yPos += 6;
    doc.setTextColor(...BRAND_COLORS.textDark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (w.temperature_celsius != null) {
      doc.text(`Temperatura: ${w.temperature_celsius}°C`, 15, yPos);
      yPos += 5;
    }
    if (w.precipitation_mm != null) {
      doc.text(`Precipitación: ${w.precipitation_mm}mm`, 15, yPos);
      yPos += 5;
    }
    if (w.wind_speed_kmh != null) {
      doc.text(`Viento: ${w.wind_speed_kmh} km/h`, 15, yPos);
      yPos += 5;
    }
    if (w.visibility_meters != null) {
      doc.text(`Visibilidad: ${(w.visibility_meters / 1000).toFixed(1)} km`, 15, yPos);
      yPos += 5;
    }
    if (w.weather_description) {
      doc.text(`Condición: ${w.weather_description}`, 15, yPos);
      yPos += 5;
    }
  }

  // === ENLACES ===
  yPos += 5;
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFontSize(8);
  doc.text("Enlaces externos:", 15, yPos);
  yPos += 4;
  doc.setTextColor(...BRAND_COLORS.green);
  doc.textWithLink(
    `Google Maps: maps.google.com/?q=${accident.location_lat},${accident.location_lng}`,
    15, yPos,
    { url: `https://www.google.com/maps?q=${accident.location_lat},${accident.location_lng}` },
  );
  yPos += 4;
  doc.textWithLink(
    `Waze: waze.com/ul?ll=${accident.location_lat},${accident.location_lng}`,
    15, yPos,
    { url: `https://www.waze.com/ul?ll=${accident.location_lat},${accident.location_lng}&navigate=yes` },
  );

  // === FOOTER ===
  doc.setFillColor(...BRAND_COLORS.yellow);
  doc.rect(0, pageHeight - 12, pageWidth, 3, "F");
  doc.setFillColor(...BRAND_COLORS.green);
  doc.rect(0, pageHeight - 9, pageWidth, 9, "F");
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(8);
  doc.text(
    "Caminos de las Sierras S.A. - Sistema de Seguridad Vial",
    pageWidth / 2,
    pageHeight - 4,
    { align: "center" },
  );

  const fileName = `siniestro_${accident.id.substring(0, 8)}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
