import React, { useEffect, useMemo, useRef, useCallback } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useDangerZones } from "@/hooks/useDangerZones";
import { useDangerZoneStore } from "@/stores/useDangerZoneStore";
import { DangerZone } from "@panel-waze/types";

const FILL_ID = "dz-fill";
const HIGHLIGHT_ID = "dz-highlight";
const LINE_ID = "dz-line";
const LABEL_ID = "dz-label";

const SEVERITY_LABELS: Record<string, string> = {
  high: "Alta",
  critical: "Crítica",
  extreme: "Extrema",
};

/** Paleta exclusiva por severidad (Amarillo -> Naranja -> Rojo). */
const SEVERITY_HEX: Record<string, string> = {
  high: "#FACC15",      // yellow-400
  critical: "#F97316",  // orange-500
  extreme: "#EF4444",   // red-500
};

export const DangerZoneLayer: React.FC = () => {
  const { current: map } = useMap();
  const { data: zones = [] } = useDangerZones();
  const showZones = useDangerZoneStore((s) => s.showZones);
  const isDrawing = useDangerZoneStore((s) => s.isDrawing);
  const selectedZone = useDangerZoneStore((s) => s.selectedZone);
  const hiddenZoneIds = useDangerZoneStore((s) => s.hiddenZoneIds);
  const hoveredZoneId = useDangerZoneStore((s) => s.hoveredZoneId);
  const selectZone = useDangerZoneStore((s) => s.selectZone);
  const setHoveredZone = useDangerZoneStore((s) => s.setHoveredZone);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: zones
      .filter((z) => z.geometry?.coordinates && !hiddenZoneIds.has(z.id))
      .filter(
        (z) =>
          !(isDrawing && selectedZone && z.id === selectedZone.id),
      )
      .map((z) => ({
        type: "Feature" as const,
        geometry: z.geometry as GeoJSON.Polygon,
        properties: {
          id: z.id,
          name: z.name,
          severity: z.severity,
          // Color fijo por severidad: ignoramos zone.color para que la criticidad
          // sea siempre reconocible a simple vista (amarillo/naranja/rojo).
          color: SEVERITY_HEX[z.severity] || SEVERITY_HEX.high,
        },
      })),
  }), [zones, hiddenZoneIds, isDrawing, selectedZone?.id]);

  const highlightFilter = useMemo(
    () => ["==", ["get", "id"], hoveredZoneId || ""],
    [hoveredZoneId],
  );

  const visibility = showZones ? "visible" : "none";

  /** MapLibre a veces no repinta etiquetas/colores solo con el prop `data` del <Source>. */
  useEffect(() => {
    if (!map) return;
    const raw = map.getMap().getSource("danger-zones-src") as unknown as
      | maplibregl.GeoJSONSource
      | undefined;
    if (raw && typeof raw.setData === "function") {
      raw.setData(geojson);
    }
  }, [map, geojson]);

  // Eventos de hover y clic sobre la capa fill
  const onFillEnter = useCallback((e: any) => {
    if (!map) return;
    map.getCanvas().style.cursor = "pointer";
    const id = e.features?.[0]?.properties?.id;
    if (id) setHoveredZone(id);
  }, [map, setHoveredZone]);

  const onFillLeave = useCallback(() => {
    if (!map) return;
    map.getCanvas().style.cursor = "";
    setHoveredZone(null);
  }, [map, setHoveredZone]);

  const onFillClick = useCallback((e: any) => {
    if (!map) return;
    const feat = e.features?.[0];
    if (!feat) return;
    const zoneId = feat.properties?.id;
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    selectZone(zone);

    if (popupRef.current) popupRef.current.remove();
    const severity = SEVERITY_LABELS[zone.severity] || zone.severity;
    const sevHex = SEVERITY_HEX[zone.severity] || SEVERITY_HEX.high;
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "260px",
    })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div style="font-family:system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${sevHex};box-shadow:0 0 6px ${sevHex};"></span>
            <strong style="font-size:13px;color:#1e293b;">${zone.name}</strong>
          </div>
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">
            Severidad: <span style="font-weight:700;color:${sevHex};">${severity}</span>
          </div>
          ${zone.description ? `<div style="font-size:11px;color:#475569;margin-bottom:4px;">${zone.description}</div>` : ""}
          ${zone.protocol ? `<div style="font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px;"><strong>Protocolo:</strong> ${zone.protocol}</div>` : ""}
        </div>
      `)
      .addTo(map.getMap() as unknown as maplibregl.Map);
  }, [map, zones, selectZone]);

  // Registrar eventos imperativa (react-map-gl no soporta onMouseEnter en Layer)
  useEffect(() => {
    if (!map) return;
    const m = map.getMap();

    const enter = (e: any) => onFillEnter(e);
    const leave = () => onFillLeave();
    const click = (e: any) => onFillClick(e);

    m.on("mouseenter", FILL_ID, enter);
    m.on("mouseleave", FILL_ID, leave);
    m.on("click", FILL_ID, click);

    return () => {
      m.off("mouseenter", FILL_ID, enter);
      m.off("mouseleave", FILL_ID, leave);
      m.off("click", FILL_ID, click);
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    };
  }, [map, onFillEnter, onFillLeave, onFillClick]);

  if (zones.length === 0) return null;

  return (
    <Source id="danger-zones-src" type="geojson" data={geojson}>
      {/* Relleno base: color y opacidad por severidad */}
      <Layer
        id={FILL_ID}
        type="fill"
        paint={{
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "match", ["get", "severity"],
            "extreme", 0.42,
            "critical", 0.3,
            "high", 0.18,
            0.18,
          ],
        }}
        layout={{ visibility }}
      />
      {/* Relleno hover/selección */}
      <Layer
        id={HIGHLIGHT_ID}
        type="fill"
        filter={highlightFilter as any}
        paint={{
          "fill-color": ["get", "color"],
          "fill-opacity": 0.55,
        }}
        layout={{ visibility }}
      />
      {/* Borde: grosor y patron por severidad para distinguir sin depender del color */}
      <Layer
        id={LINE_ID}
        type="line"
        paint={{
          "line-color": ["get", "color"],
          "line-width": [
            "match", ["get", "severity"],
            "extreme", 4,
            "critical", 3,
            "high", 2,
            2,
          ],
          "line-dasharray": [
            "match", ["get", "severity"],
            "extreme", ["literal", [1, 0]],
            "critical", ["literal", [1, 0]],
            "high", ["literal", [2, 1]],
            ["literal", [2, 1]],
          ],
        }}
        layout={{ visibility }}
      />
      {/* Etiqueta: color por severidad, halo oscuro para legibilidad */}
      <Layer
        id={LABEL_ID}
        type="symbol"
        layout={{
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-anchor": "center",
          "text-allow-overlap": false,
          visibility,
        }}
        paint={{
          "text-color": ["get", "color"],
          "text-halo-color": "#0B0B12",
          "text-halo-width": 1.6,
        }}
      />
    </Source>
  );
};
