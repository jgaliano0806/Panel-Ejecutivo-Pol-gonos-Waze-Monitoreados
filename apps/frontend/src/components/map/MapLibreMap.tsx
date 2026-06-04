import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  startTransition,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import Map, { NavigationControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "react-router-dom";

import { TrafficJam, Incident, Polygon } from "../../types";
import { useThemeStore } from "../../stores/useThemeStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useDangerZoneStore } from "../../stores/useDangerZoneStore";
import { useKilometers } from "../../hooks/useKilometers";
import { useIncidentDetail } from "../../hooks/useIncidentsModule";
import { IncidentDetailModal } from "../incidents/IncidentDetailModal";
import { exportIncidentToPDF } from "../../lib/pdf-export";
import { API_CONFIG } from "../../config/constants";
import { getWazeIconSvg } from "../../utils/wazeIcons";

import { MapContextMenu } from "./MapContextMenu";
import { DangerZoneEditor } from "./DangerZoneEditor";
import { DangerZoneLayer } from "./DangerZoneLayer";
import { DangerZonePanel } from "./DangerZonePanel";

import {
  INITIAL_VIEW_STATE,
  COMMON_ICONS,
  INTERACTIVE_LAYER_IDS,
} from "./mapUtils";

import {
  usePolygonsGeoJSON,
  useFlowGeoJSON,
  useFlowFluidGeoJSON,
  useJamsGeoJSON,
  useJamLabelsGeoJSON,
  useRoadClosuresGeoJSON,
  useKilometersGeoJSON,
} from "./hooks/useMapGeoJSON";

import { useIncidentMarkers } from "./hooks/useIncidentMarkers";

import { PolygonLayers } from "./layers/PolygonLayers";
import { TrafficFlowLayers } from "./layers/TrafficFlowLayers";
import { JamLayers } from "./layers/JamLayers";
import { RoadClosureLayers } from "./layers/RoadClosureLayers";
import { KilometerLayers } from "./layers/KilometerLayers";
import { JamPopup } from "./popups/JamPopup";
import { IncidentPopup } from "./popups/IncidentPopup";

interface MapLibreMapProps {
  polygons?: Polygon[];
  jams?: TrafficJam[];
  trafficFlow?: TrafficJam[];
  incidents?: Incident[];
  className?: string;
  onPolygonClick?: (id: string) => void;
  selectedPolygon?: string | null;
  selectedGroup?: string | null;
  selectedIncidentId?: string | null;
  forcedIncident?: any | null;
  onExternalIncidentFocusConsumed?: () => void;
  allowDangerZoneEdit?: boolean;
  allPolygons?: Polygon[];
  onPolygonChange?: (polygonId: string | null) => void;
  onGroupChange?: (groupId: string, active: boolean) => void;
  showWazeIncidents?: boolean;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  polygons = [],
  jams = [],
  trafficFlow = [],
  incidents = [],
  className: _className,
  onPolygonClick,
  selectedPolygon,
  selectedGroup,
  selectedIncidentId,
  forcedIncident,
  onExternalIncidentFocusConsumed,
  allowDangerZoneEdit = false,
  showWazeIncidents = true,
}) => {
  const mapRef = useRef<MapRef>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const pulsedMarkerIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const isDark = useThemeStore((state) => state.isDark);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedJam, setSelectedJam] = useState<any>(null);
  const [detailIncidentId, setDetailIncidentId] = useState<string | null>(null);
  const { data: detailIncident } = useIncidentDetail(detailIncidentId);

  const hasDangerZonePermission = useAuthStore((s) => s.hasPermission("danger_zones.edit"));
  const canEditDangerZones = allowDangerZoneEdit && hasDangerZonePermission;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lngLat: { lng: number; lat: number } } | null>(null);
  const setDrawing = useDangerZoneStore((s) => s.setDrawing);
  const addDrawingPoint = useDangerZoneStore((s) => s.addDrawingPoint);
  const selectZone = useDangerZoneStore((s) => s.selectZone);
  const setTempGeometry = useDangerZoneStore((s) => s.setTempGeometry);

  const [showTraffic] = useState(true);
  const showFlowLayer = true;
  const showJamsLayer = true;
  const showRoadClosures = true;

  // Hitos kilométricos
  const { data: kilometerMarkers = [] } = useKilometers(true);

  // ─── Enfocar incidente externo ("Ver en el mapa" / snackbar / notificaciones) ───
  useEffect(() => {
    if (!mapLoaded) return;
    if (!selectedIncidentId && !forcedIncident) return;

    const isValidNum = (v: any): v is number =>
      typeof v === "number" && isFinite(v) && !isNaN(v);

    const timer = setTimeout(() => {
      let lat: number | undefined;
      let lng: number | undefined;
      let incidentProps: any = null;

      // Prioridad 1: incidente forzado (viene de snackbar o módulo externo)
      if (forcedIncident) {
        incidentProps = forcedIncident;
        // Intento 1: location.lat / location.lng
        if (isValidNum(forcedIncident.location?.lat) && isValidNum(forcedIncident.location?.lng)) {
          lat = forcedIncident.location.lat;
          lng = forcedIncident.location.lng;
        // Intento 2: location.y / location.x (formato Waze raw)
        } else if (isValidNum(forcedIncident.location?.y) && isValidNum(forcedIncident.location?.x)) {
          lat = forcedIncident.location.y;
          lng = forcedIncident.location.x;
        // Intento 3: latitude / longitude en raíz
        } else if (isValidNum(forcedIncident.latitude) && isValidNum(forcedIncident.longitude)) {
          lat = forcedIncident.latitude;
          lng = forcedIncident.longitude;
        }
      }

      // Prioridad 2: buscar por ID en los incidentes activos del feed
      if ((lat === undefined || lng === undefined) && selectedIncidentId) {
        const found = incidents.find(
          (i) => i.id === selectedIncidentId || (i as any).uuid === selectedIncidentId,
        );
        if (found) {
          lat = found.location.lat;
          lng = found.location.lng;
          incidentProps = {
            id: found.id,
            description: found.description || "Sin descripción",
            street: found.street || `${found.location.lat.toFixed(5)}, ${found.location.lng.toFixed(5)}`,
            type: found.type,
            subtype: found.subtype || "",
            timestamp: found.timestamp ? new Date(found.timestamp).toISOString() : "",
            reportBy: found.reportBy,
            nThumbsUp: found.nThumbsUp || 0,
            confidence: typeof found.confidence === "number" ? found.confidence : Number(found.confidence) || 0,
            magvar: (found as any).magvar,
          };
        }
      }

      if (!isValidNum(lat) || !isValidNum(lng)) {
        console.warn("⚠️ focusIncident: coordenadas inválidas o no encontradas", { forcedIncident, selectedIncidentId });
        return;
      }

      console.log("📍 focusIncident: flyTo", { lat, lng, id: selectedIncidentId });

      // Abrir popup del incidente en el mapa
      if (incidentProps) {
        setSelectedJam(null);
        setSelectedIncident({ lat, lng, properties: incidentProps });
      }

      // Volar al incidente
      try {
        mapRef.current?.getMap().flyTo({
          center: [lng, lat],
          zoom: 16,
          duration: 1200,
          essential: true,
        });
      } catch (err) {
        console.error("❌ focusIncident: error en flyTo", err);
      }

      // Notificar al padre que ya fue consumido (evita re-trigger en re-renders)
      onExternalIncidentFocusConsumed?.();
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIncidentId, forcedIncident, mapLoaded]);

  // Memos de GeoJSON centralizados (recalculan solo si sus props cambian)
  const polygonsGeoJSON = usePolygonsGeoJSON(polygons);
  const flowGeoJSON = useFlowGeoJSON(trafficFlow, jams);
  const flowFluidGeoJSON = useFlowFluidGeoJSON(trafficFlow, jams);
  const jamsGeoJSON = useJamsGeoJSON(jams);
  const jamLabelsGeoJSON = useJamLabelsGeoJSON(jams);
  const roadClosuresGeoJSON = useRoadClosuresGeoJSON(incidents, jams);
  const kilometersGeoJSON = useKilometersGeoJSON(kilometerMarkers);

  // Efecto para escuchar flyto de zonas peligrosas
  useEffect(() => {
    const handler = (e: Event) => {
      const { geometry } = (e as CustomEvent).detail;
      if (!geometry?.coordinates?.[0] || !mapRef.current) return;
      const ring: [number, number][] = geometry.coordinates[0];
      const bounds = new maplibregl.LngLatBounds(ring[0], ring[0]);
      ring.forEach((c: [number, number]) => bounds.extend(c));
      mapRef.current.getMap().fitBounds(bounds as any, { padding: 80, maxZoom: 15, duration: 1200 });
    };
    window.addEventListener("dangerzone:flyto", handler);
    return () => window.removeEventListener("dangerzone:flyto", handler);
  }, []);

  // Inyectar animación pulse global (una vez)
  useEffect(() => {
    const styleId = "pulse-ring-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@keyframes pulse-ring { 0% { box-shadow: 0 0 0 3px rgba(59,130,246,0.6), 0 2px 8px rgba(0,0,0,0.5); } 70% { box-shadow: 0 0 0 10px rgba(59,130,246,0), 0 2px 8px rgba(0,0,0,0.3); } 100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.6), 0 2px 8px rgba(0,0,0,0.5); } }`;
    document.head.appendChild(style);
  }, []);

  // ResizeObserver para adaptar el canvas cuando cambian los menús
  useEffect(() => {
    if (!mapLoaded) return;
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => {
      const map = mapRef.current?.getMap?.();
      if (map) map.resize();
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [mapLoaded]);

  // Remover logs de dev de los incidentes para mejorar rendimiento en render
  if (import.meta.env.DEV && incidents.length > 0 && selectedIncident === "LOGGED_ONCE") {
    // Optionally log once, but avoid flooding CPU
  }

  // --- Manejo de la función ApplyPulseToMarker centralizada ---
  const incidentMarkersMapRef = useRef<Map<string, maplibregl.Marker> | null>(null);

  const applyPulseToMarker = useCallback((markerId: string | null) => {
    const markersMap = incidentMarkersMapRef.current;
    if (!markersMap) return;

    const prevId = pulsedMarkerIdRef.current;
    if (prevId && prevId !== markerId) {
      const prevMarker = markersMap.get(prevId);
      if (prevMarker) {
        const innerDiv = prevMarker.getElement().firstElementChild as HTMLElement | null;
        if (innerDiv) {
          innerDiv.style.animation = "";
          innerDiv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
        }
      }
    }

    if (markerId) {
      const marker = markersMap.get(markerId);
      if (marker) {
        const innerDiv = marker.getElement().firstElementChild as HTMLElement | null;
        if (innerDiv) {
          innerDiv.style.animation = "pulse-ring 1.5s ease-out infinite";
          innerDiv.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.6), 0 2px 8px rgba(0,0,0,0.5)";
        }
      }
    }
    pulsedMarkerIdRef.current = markerId;
  }, []);

  // Hook extractor para renderizar marcadores de incidentes
  const markersRef = useIncidentMarkers({
    mapRef,
    mapLoaded,
    showWazeIncidents,
    incidents,
    isDark,
    onIncidentClick: (inc) => {
      setSelectedJam(null);
      const timeMs = inc.timestamp instanceof Date ? inc.timestamp.getTime() : new Date(inc.timestamp).getTime();
      setSelectedIncident({
        lng: inc.location.lng,
        lat: inc.location.lat,
        properties: {
          id: inc.id,
          isNew: Date.now() - timeMs < 300000 ? 1 : 0,
          description: inc.description || "Sin descripción",
          street: inc.street || `${inc.location.lat.toFixed(5)}, ${inc.location.lng.toFixed(5)}`,
          type: inc.type,
          subtype: inc.subtype || "",
          timestamp: inc.timestamp ? new Date(inc.timestamp).toISOString() : "",
          reportBy: inc.reportBy,
          nThumbsUp: inc.nThumbsUp || 0,
          confidence: typeof inc.confidence === "number" ? inc.confidence : Number(inc.confidence) || 0,
          magvar: (inc as any).magvar,
        },
      });
    },
    applyPulseToMarker,
  });

  // Guardamos la referencia para el applyPulse interno
  useEffect(() => {
    incidentMarkersMapRef.current = markersRef.current;
  }, [markersRef]);

  // Zoom a polígono seleccionado
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || (!selectedPolygon && !selectedGroup)) return;
    const map = mapRef.current.getMap();
    if (selectedPolygon) {
      const polygon = polygons.find((p) => p.id === selectedPolygon);
      if (polygon && polygon.geometry.coordinates[0].length > 0) {
        const coords = polygon.geometry.coordinates[0];
        let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
        coords.forEach((coord: any) => {
          const lng = Array.isArray(coord) ? coord[0] : coord.x;
          const lat = Array.isArray(coord) ? coord[1] : coord.y;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, duration: 1000 });
      }
    }
  }, [selectedPolygon, selectedGroup, polygons, mapLoaded]);

  // Animación del dasharray de "flow-fluid-line". Cada setPaintProperty
  // dispara un repaint completo del layer → la mantenemos a 250ms y la
  // pausamos cuando la pestaña está oculta, el mapa se está moviendo
  // (pan/zoom/rotate) o el usuario prefiere movimiento reducido.
  useEffect(() => {
    if (!mapLoaded || !showTraffic || !showFlowLayer) return;
    const map = mapRef.current?.getMap?.() as maplibregl.Map | undefined;
    if (!map) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const dashSteps = [[2, 4], [3, 3], [4, 2], [5, 1], [6, 0], [0, 6], [1, 5]];
    let step = 0;
    let rAFId: number;
    let lastTime = performance.now();

    const animateDash = (time: DOMHighResTimeStamp) => {
      if (time - lastTime > 250) {
        const moving = map.isMoving() || map.isZooming() || map.isRotating();
        if (!document.hidden && !moving && map.getLayer("flow-fluid-line")) {
          const [dash, gap] = dashSteps[step % dashSteps.length];
          map.setPaintProperty("flow-fluid-line", "line-dasharray", [dash, gap]);
          step++;
        }
        lastTime = time;
      }
      rAFId = window.requestAnimationFrame(animateDash);
    };

    const timeoutId = setTimeout(() => {
      rAFId = window.requestAnimationFrame(animateDash);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (rAFId) window.cancelAnimationFrame(rAFId);
    };
  }, [mapLoaded, showTraffic, showFlowLayer]);

  // Carga de imagenes e inicializacion
  const loadWazeIcon = (map: maplibregl.Map, iconId: string) => {
    if (map.hasImage(iconId)) return;
    const cleanId = iconId.replace(/^waze-/, "");
    const firstDashIndex = cleanId.indexOf("-");
    const type = firstDashIndex === -1 ? cleanId : cleanId.substring(0, firstDashIndex);
    const subtype = firstDashIndex === -1 ? undefined : cleanId.substring(firstDashIndex + 1);
    let svgString = getWazeIconSvg(type, subtype);
    if (!svgString) return;

    const size = 64;
    if (!/<svg[^>]*\swidth=/i.test(svgString)) {
      svgString = svgString.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
    }

    const rasterize = async () => {
      if (map.hasImage(iconId)) return;
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      try {
        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(blob, { resizeWidth: size, resizeHeight: size, resizeQuality: "high" });
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(bitmap, 0, 0, size, size);
          bitmap.close?.();
          if (!map.hasImage(iconId)) {
            map.addImage(iconId, ctx.getImageData(0, 0, size, size), { pixelRatio: 2, sdf: false });
            map.triggerRepaint();
          }
          return;
        }
      } catch { /* ignorar */ }
      const url = URL.createObjectURL(blob);
      const img = new Image(size, size);
      img.decoding = "sync";
      img.onload = () => {
        try {
          if (map.hasImage(iconId)) return;
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, size, size);
          map.addImage(iconId, ctx.getImageData(0, 0, size, size), { pixelRatio: 2, sdf: false });
          map.triggerRepaint();
        } catch { /* rasterizado fallido: continuar sin icono custom */ } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    };
    void rasterize();
  };

  const onMapLoad = (e: any) => {
    const map = e.target;
    map.dragRotate.disable();
    COMMON_ICONS.forEach((id) => loadWazeIcon(map, id));
    map.on("styleimagemissing", (ev: any) => {
      const id = ev?.id;
      if (id && id.startsWith("waze-")) loadWazeIcon(map, id);
    });
  };

  // Interacción Canvas global
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap?.() as maplibregl.Map | undefined;
    if (!map) return;
    const canvas = map.getCanvas();

    const safeQuery = (px: [number, number], box = false) => {
      try {
        const layers = INTERACTIVE_LAYER_IDS.filter((id) => {
          try { return !!map.getLayer(id); } catch { return false; }
        });
        if (!layers.length) return [];
        if (box) {
          const h = 18;
          return map.queryRenderedFeatures([[px[0] - h, px[1] - h], [px[0] + h, px[1] + h]] as [[number, number], [number, number]], { layers });
        }
        return map.queryRenderedFeatures(px, { layers });
      } catch { return []; }
    };

    // mousemove se dispara ~60Hz; throttleamos a ~16fps (60ms) y solo
    // tocamos el DOM si el cursor cambia (evita layout-thrash).
    let lastMoveAt = 0;
    let currentCursor: "pointer" | "" = "";
    const onMouseMove = (ev: maplibregl.MapMouseEvent) => {
      const now = performance.now();
      if (now - lastMoveAt < 60) return;
      lastMoveAt = now;
      const hits = safeQuery([ev.point.x, ev.point.y]);
      const next: "pointer" | "" = hits.length > 0 ? "pointer" : "";
      if (next !== currentCursor) {
        canvas.style.cursor = next;
        currentCursor = next;
      }
    };
    map.on("mousemove", onMouseMove);

    let downPx: { x: number; y: number } | null = null;
    let downTime = 0;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      downPx = { x: e.offsetX, y: e.offsetY };
      downTime = Date.now();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button !== 0 || !downPx) return;
      const dx = e.offsetX - downPx.x;
      const dy = e.offsetY - downPx.y;
      const dt = Date.now() - downTime;
      downPx = null;
      if (Math.sqrt(dx * dx + dy * dy) > 24 || dt > 500) return;

      const px: [number, number] = [e.offsetX, e.offsetY];
      const features = safeQuery(px, true);
      if (!features.length) return;

      const jamF = features.find((f: any) => f.layer?.id === "jams-core" || f.layer?.id === "jam-labels-bg");
      const polyF = features.find((f: any) => f.layer?.id === "polygons-fill");

      if (jamF) {
        const p = jamF.properties as any;
        const lngLat = p.midLng != null && p.midLat != null ? { lng: p.midLng, lat: p.midLat } : map.unproject([e.offsetX, e.offsetY]);
        setSelectedIncident(null);
        setSelectedJam({ lng: lngLat.lng, lat: lngLat.lat, properties: p });
        map.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 15, duration: 800 });
      } else if (polyF && onPolygonClick) {
        onPolygonClick(polyF.properties.id);
        setSelectedIncident(null);
        setSelectedJam(null);
      }
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);

    return () => {
      map.off("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseup", onUp);
      canvas.style.cursor = "";
    };
  }, [mapLoaded, showWazeIncidents, onPolygonClick]);

  const tilesBase = API_CONFIG.tilesBase || "";
  const mapStyle = useMemo((): maplibregl.StyleSpecification => ({
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: isDark
          ? [`${tilesBase}/tiles/v2/carto-dark/{z}/{x}/{y}.png`]
          : [`${tilesBase}/tiles/v2/carto-light/{z}/{x}/{y}.png`],
        tileSize: 256,
        attribution: "© CARTO",
        minzoom: 0,
        maxzoom: 19,
      },
    },
    layers: [
      // Capa de fondo sólido: evita zócalos blancos/negros mientras los tiles cargan
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": isDark ? "#1a1b2e" : "#e8e0d8",
          "background-opacity": 1,
        },
      },
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        paint: { "raster-fade-duration": 200 },
      },
    ],
  }), [isDark, tilesBase]);

  return (
    <div
      ref={mapWrapperRef}
      className={`h-full w-full ${isDark ? "bg-[#1a1b2e]" : "bg-[#e8e0d8]"} relative`}
      role="region"
      aria-label="Mapa de incidentes y tráfico"
    >
      <Map
        mapLib={maplibregl}
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        attributionControl={false}
        clickTolerance={20}
        onContextMenu={(e: any) => {
          e.originalEvent.preventDefault();
          if (!canEditDangerZones) return;
          setContextMenu({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
            lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat }
          });
        }}
        onLoad={(e: any) => {
          startTransition(() => {
            setMapLoaded(true);
            onMapLoad(e);
          });
        }}
      >
        <DangerZoneLayer />
        {canEditDangerZones && mapRef.current && (
          <DangerZoneEditor map={mapRef.current.getMap() as unknown as maplibregl.Map} />
        )}
        <NavigationControl position="top-right" showCompass showZoom />

        <PolygonLayers polygonsGeoJSON={polygonsGeoJSON} selectedPolygon={selectedPolygon} isDark={isDark} />

        {showTraffic && showFlowLayer && (
          <TrafficFlowLayers flowGeoJSON={flowGeoJSON} flowFluidGeoJSON={flowFluidGeoJSON} mapLoaded={mapLoaded} />
        )}

        {showTraffic && showJamsLayer && mapLoaded && (
          <JamLayers jamsGeoJSON={jamsGeoJSON} jamLabelsGeoJSON={jamLabelsGeoJSON} />
        )}

        {showRoadClosures && (
          <RoadClosureLayers roadClosuresGeoJSON={roadClosuresGeoJSON} />
        )}

        <KilometerLayers kilometersGeoJSON={kilometersGeoJSON} isDark={isDark} />

        {selectedJam && (
          <JamPopup jam={selectedJam} isDark={isDark} onClose={() => setSelectedJam(null)} />
        )}

        {selectedIncident && (
          <IncidentPopup
            incident={selectedIncident}
            isDark={isDark}
            onClose={() => { applyPulseToMarker(null); setSelectedIncident(null); }}
            onViewDetail={(incId) => {
              applyPulseToMarker(null);
              setSelectedIncident(null);
              setDetailIncidentId(incId);
            }}
          />
        )}
      </Map>

      {!!detailIncidentId && !!detailIncident && createPortal(
        <IncidentDetailModal
          incident={detailIncident}
          isOpen={true}
          onClose={() => setDetailIncidentId(null)}
          onViewOnMap={(incident) => {
            setDetailIncidentId(null);
            navigate(`/mapa?lat=${incident.location.lat}&lng=${incident.location.lng}&zoom=16&highlight=${incident.uuid}`);
          }}
          onExportPDF={async (incident) => {
            try {
              const authUser = useAuthStore.getState().user;
              const userName = authUser ? `${authUser.firstName} ${authUser.lastName}`.trim() : undefined;
              await exportIncidentToPDF(incident, userName);
            } catch (error) {
              console.error("Error exportando PDF:", error);
            }
          }}
        />,
        document.body,
      )}

      {canEditDangerZones && contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCreateZone={() => {
            selectZone(null);
            setTempGeometry(null);
            setDrawing(true);
            addDrawingPoint([contextMenu.lngLat.lng, contextMenu.lngLat.lat]);
          }}
        />
      )}

      {canEditDangerZones && <DangerZonePanel />}
    </div>
  );
};
