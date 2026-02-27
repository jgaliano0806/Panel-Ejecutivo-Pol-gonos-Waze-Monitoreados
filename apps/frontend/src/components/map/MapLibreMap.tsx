import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  startTransition,
} from "react";
import { createPortal } from "react-dom";
import Map, {
  Source,
  Layer,
  NavigationControl,
  MapRef,
  Popup,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TrafficJam, Incident, Polygon, PolygonState } from "../../types";

import {
  getWazePartnerHubIconUrl,
  getWazeIconSvg,
} from "../../utils/wazeIcons";
import {
  getIncidentDescription,
  getMainTypeTranslation,
} from "../../utils/wazeTranslations";
import { formatStreetName } from "../../lib/utils";
import { useThemeStore } from "../../stores/useThemeStore";
import {
  X,
  ShieldCheck,
  Navigation,
  Car,
  Gauge,
  Timer,
  Route,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIncidentDetail } from "../../hooks/useIncidentsModule";
import { IncidentDetailModal } from "../incidents/IncidentDetailModal";
import { exportIncidentToPDF } from "../../lib/pdf-export";
import { useAuthStore } from "../../stores/useAuthStore";

// Configuración inicial
const INITIAL_VIEW_STATE = {
  longitude: -64.1888, // Córdoba
  latitude: -31.4201,
  zoom: 12,
  pitch: 40,
  bearing: 0,
};

// Función para convertir grados a dirección cardinal
const getCardinalDirection = (degrees: number): string => {
  if (degrees === null || degrees === undefined) return "Desconocido";

  // Normalizar a 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  // Definir rangos para 16 direcciones
  const directions = [
    { min: 348.75, max: 360, label: "Norte" },
    { min: 0, max: 11.25, label: "Norte" },
    { min: 11.25, max: 33.75, label: "Norte a Este" },
    { min: 33.75, max: 56.25, label: "Noreste" },
    { min: 56.25, max: 78.75, label: "Este a Norte" },
    { min: 78.75, max: 101.25, label: "Este" },
    { min: 101.25, max: 123.75, label: "Este a Sur" },
    { min: 123.75, max: 146.25, label: "Sureste" },
    { min: 146.25, max: 168.75, label: "Sur a Este" },
    { min: 168.75, max: 191.25, label: "Sur" },
    { min: 191.25, max: 213.75, label: "Sur a Oeste" },
    { min: 213.75, max: 236.25, label: "Suroeste" },
    { min: 236.25, max: 258.75, label: "Oeste a Sur" },
    { min: 258.75, max: 281.25, label: "Oeste" },
    { min: 281.25, max: 303.75, label: "Oeste a Norte" },
    { min: 303.75, max: 326.25, label: "Noroeste" },
    { min: 326.25, max: 348.75, label: "Norte a Oeste" },
  ];

  const direction = directions.find(
    (d) => normalized >= d.min && normalized < d.max,
  );
  return direction ? direction.label : "Desconocido";
};

interface MapLibreMapProps {
  polygons?: Polygon[];
  jams?: TrafficJam[]; // Congestiones (Jams reales)
  trafficFlow?: TrafficJam[]; // TVT (Flujo general)
  incidents?: Incident[];
  className?: string;
  onPolygonClick?: (id: string) => void;
  selectedPolygon?: string | null;
  selectedGroup?: string | null;
  selectedIncidentId?: string | null;
  forcedIncident?: any | null;
  // Props para filtros de polígonos en el sidebar del mapa
  allPolygons?: Polygon[];
  onPolygonChange?: (polygonId: string | null) => void;
  onGroupChange?: (groupId: string, active: boolean) => void;
  showWazeIncidents?: boolean; // Controlar visibilidad de iconos Waze
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
  allPolygons: _allPolygons,
  onPolygonChange: _onPolygonChange,
  onGroupChange: _onGroupChange,
  showWazeIncidents = true,
}) => {
  const mapRef = useRef<MapRef>(null);
  const incidentMarkersRef = useRef(
    new window.Map<string, maplibregl.Marker>(),
  );
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedJam, setSelectedJam] = useState<any>(null);
  const [detailIncidentId, setDetailIncidentId] = useState<string | null>(null);
  const { data: detailIncident } = useIncidentDetail(detailIncidentId);

  // Estado para capas (Tráfico sigue siendo interno por ahora, a menos que el sidebar lo quiera controlar también)
  const [showTraffic] = useState(true);

  // Estados para sub-capas de tráfico
  // const [showFlowLayer, setShowFlowLayer] = useState(true);
  // const [showJamsLayer, setShowJamsLayer] = useState(true);
  // const [showRoadClosures, setShowRoadClosures] = useState(true);
  const showFlowLayer = true;
  const showJamsLayer = true;
  const showRoadClosures = true;

  // Estado para controlar si el mapa está cargado
  const [mapLoaded, setMapLoaded] = useState(false);

  // DEBUG: Verificar datos de entrada
  useEffect(() => {
    if (incidents.length > 0) {
      console.log(`🗺️ MapLibre received ${incidents.length} incidents.`);
      const first = incidents[0];
      console.log(
        "📍 Sample incident location:",
        first.location,
        "Type:",
        first.type,
      );
      if (isNaN(first.location.lat) || isNaN(first.location.lng)) {
        console.error(
          "❌ CRITICAL: Invalid coordinates detected in map data!",
          first,
        );
      }
    } else {
      console.log("🗺️ MapLibre received 0 incidents.");
    }
  }, [incidents]);

  // Efecto para Zoom al polígono seleccionado
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || (!selectedPolygon && !selectedGroup))
      return;
    const map = mapRef.current.getMap();

    if (selectedPolygon) {
      const polygon = polygons.find((p) => p.id === selectedPolygon);
      if (polygon && polygon.geometry.coordinates[0].length > 0) {
        const coords = polygon.geometry.coordinates[0];
        // Calcular bounds manualmente
        let minLng = 180,
          maxLng = -180,
          minLat = 90,
          maxLat = -90;
        coords.forEach((coord: any) => {
          // Waze geoJSON a veces es [lng, lat], a veces {x,y}
          const lng = Array.isArray(coord) ? coord[0] : coord.x;
          const lat = Array.isArray(coord) ? coord[1] : coord.y;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });

        const bounds = new maplibregl.LngLatBounds(
          [minLng, minLat],
          [maxLng, maxLat],
        );

        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    }
  }, [selectedPolygon, selectedGroup, polygons, mapLoaded]);

  // Efecto para enfocar incidente seleccionado externamente (Notificaciones)
  useEffect(() => {
    // Si no hay ID ni objeto forzado, retornar
    if (
      !mapRef.current ||
      !mapLoaded ||
      (!selectedIncidentId && !forcedIncident)
    )
      return;

    // Pequeño delay para asegurar que el mapa esté estable
    const timer = setTimeout(() => {
      let incidentDetails = null;
      let location = null;

      // Helper simple para validar coords
      const isValidCoord = (lat: any, lng: any) =>
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) &&
        !isNaN(lng);

      // Estrategia 1: Usar incidente forzado (viene de notificación, puede ser histórico)
      if (forcedIncident) {
        incidentDetails = forcedIncident;
        console.log(
          "🔍 forcedIncident structure:",
          JSON.stringify(forcedIncident, null, 2),
        );

        // Intento 1: location: { lat, lng }
        if (
          forcedIncident.location &&
          isValidCoord(forcedIncident.location.lat, forcedIncident.location.lng)
        ) {
          location = forcedIncident.location;
        }
        // Intento 2: location: { x, y } (Waze raw)
        else if (
          forcedIncident.location &&
          isValidCoord(forcedIncident.location.y, forcedIncident.location.x)
        ) {
          location = {
            lat: forcedIncident.location.y,
            lng: forcedIncident.location.x,
          };
        }
        // Intento 3: Top level lat/lng
        else if (isValidCoord(forcedIncident.lat, forcedIncident.lng)) {
          location = { lat: forcedIncident.lat, lng: forcedIncident.lng };
        }
        // Intento 4: Top level latitude/longitude
        else if (
          isValidCoord(forcedIncident.latitude, forcedIncident.longitude)
        ) {
          location = {
            lat: forcedIncident.latitude,
            lng: forcedIncident.longitude,
          };
        }
      }
      // Estrategia 2: Buscar en feed activo
      else if (selectedIncidentId) {
        const found = incidents.find((i) => i.id === selectedIncidentId);
        if (found) {
          incidentDetails = found;
          location = found.location;
        }
      }

      if (
        incidentDetails &&
        location &&
        isValidCoord(location.lat, location.lng)
      ) {
        console.log("📍 Focusing incident:", incidentDetails.id, location);

        // Reconstruir propiedades para Popup
        const properties = {
          id: incidentDetails.id,
          description:
            incidentDetails.description ||
            incidentDetails.reportDescription ||
            "Sin descripción",
          street:
            incidentDetails.street ||
            `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
          type: incidentDetails.type,
          subtype: incidentDetails.subtype || "",
          timestamp: incidentDetails.timestamp
            ? new Date(incidentDetails.timestamp).toISOString()
            : new Date().toISOString(),
          reportBy: incidentDetails.reportBy || "Wazer",
          nThumbsUp: incidentDetails.nThumbsUp || 0,
          confidence:
            typeof incidentDetails.confidence === "number"
              ? incidentDetails.confidence
              : Number(incidentDetails.confidence) || 0,
          magvar: incidentDetails.magvar || 0,
          iconId: `waze-${(incidentDetails.type || "hazard").toLowerCase()}`,
        };

        setSelectedIncident({
          lat: location.lat,
          lng: location.lng,
          properties,
        });

        if (mapRef.current) {
          try {
            mapRef.current.getMap().flyTo({
              center: [location.lng, location.lat],
              zoom: 16,
              duration: 1500,
              pitch: 50,
              essential: true,
            });
          } catch (err) {
            console.error("❌ Error flying to location:", err);
          }
        }
      } else {
        console.warn(
          "⚠️ Incident found but invalid location:",
          selectedIncidentId,
          location,
        );
      }
    }, 500); // Delay aumentado a 500ms para mayor seguridad

    return () => clearTimeout(timer);
  }, [selectedIncidentId, forcedIncident, incidents, mapLoaded]);

  const loadWazeIcon = (map: maplibregl.Map, iconId: string) => {
    if (map.hasImage(iconId)) return;
    const cleanId = iconId.replace(/^waze-/, "");
    const firstDashIndex = cleanId.indexOf("-");
    const type =
      firstDashIndex === -1 ? cleanId : cleanId.substring(0, firstDashIndex);
    const subtype =
      firstDashIndex === -1 ? undefined : cleanId.substring(firstDashIndex + 1);
    const svgString = getWazeIconSvg(type, subtype);
    if (!svgString) return;
    const img = new Image(64, 64);
    img.onload = () => {
      if (!map.hasImage(iconId)) {
        map.addImage(iconId, img, { sdf: false });
        map.triggerRepaint();
      }
    };
    img.src =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  };

  const COMMON_ICONS = [
    "waze-accident",
    "waze-jam",
    "waze-hazard",
    "waze-construction",
    "waze-roadclosed",
    "waze-road_closed",
    "waze-police",
    "waze-weatherhazard",
    "waze-pothole",
    "waze-hazard-hazard_on_road_construction",
    "waze-hazard-hazard_on_shoulder_car_stopped",
    "waze-hazard-hazard_on_road_pot_hole",
    "waze-road_closed-road_closed_event",
  ];

  const INTERACTIVE_LAYER_IDS = ["jams-core", "jam-labels-bg", "polygons-fill"];

  const onMapLoad = (e: any) => {
    const map = e.target;
    map.dragRotate.disable();
    COMMON_ICONS.forEach((id) => loadWazeIcon(map, id));
    map.on("styleimagemissing", (ev: any) => {
      const id = ev?.id;
      if (id && id.startsWith("waze-")) loadWazeIcon(map, id);
    });
  };

  // Click e interaccion via canvas mousedown/mouseup (no depende de dragPan ni de react-map-gl onClick)
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap?.() as maplibregl.Map | undefined;
    if (!map) return;
    const canvas = map.getCanvas();

    // Helper: query interactivas con try-catch
    const safeQuery = (px: [number, number], box = false) => {
      try {
        const layers = INTERACTIVE_LAYER_IDS.filter((id) => {
          try {
            return !!map.getLayer(id);
          } catch {
            return false;
          }
        });
        if (!layers.length) return [];
        if (box) {
          const h = 18;
          return map.queryRenderedFeatures(
            [
              [px[0] - h, px[1] - h],
              [px[0] + h, px[1] + h],
            ] as [[number, number], [number, number]],
            { layers },
          );
        }
        return map.queryRenderedFeatures(px, { layers });
      } catch {
        return [];
      }
    };

    // --- Cursor pointer ---
    const onMouseMove = (ev: maplibregl.MapMouseEvent) => {
      const hits = safeQuery([ev.point.x, ev.point.y]);
      canvas.style.cursor = hits.length > 0 ? "pointer" : "";
    };
    map.on("mousemove", onMouseMove);

    // --- Click via mousedown/mouseup en canvas (evita que dragPan se lo trague) ---
    let downPx: { x: number; y: number } | null = null;
    let downTime = 0;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // solo boton izquierdo
      downPx = { x: e.offsetX, y: e.offsetY };
      downTime = Date.now();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button !== 0 || !downPx) return;
      const dx = e.offsetX - downPx.x;
      const dy = e.offsetY - downPx.y;
      const dt = Date.now() - downTime;
      downPx = null;
      // Solo contar como click si movimiento < 24px y tiempo < 500ms
      if (Math.sqrt(dx * dx + dy * dy) > 24 || dt > 500) return;

      const px: [number, number] = [e.offsetX, e.offsetY];
      const features = safeQuery(px, true);
      if (!features.length) return;

      const jamF = features.find(
        (f: any) =>
          f.layer?.id === "jams-core" || f.layer?.id === "jam-labels-bg",
      );
      const polyF = features.find((f: any) => f.layer?.id === "polygons-fill");

      if (jamF) {
        const p = jamF.properties as any;
        const lngLat =
          p.midLng != null && p.midLat != null
            ? { lng: p.midLng, lat: p.midLat }
            : map.unproject([e.offsetX, e.offsetY]);
        setSelectedIncident(null);
        setSelectedJam({ lng: lngLat.lng, lat: lngLat.lat, properties: p });
        map.flyTo({
          center: [lngLat.lng, lngLat.lat],
          zoom: 15,
          duration: 800,
        });
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

  // Animación línea verde fluida: ciclar line-dasharray
  useEffect(() => {
    if (!mapLoaded || !showTraffic || !showFlowLayer) return;
    const ref = mapRef.current;
    const map = ref?.getMap?.() as maplibregl.Map | undefined;
    if (!map) return;

    const dashSteps = [
      [2, 4],
      [3, 3],
      [4, 2],
      [5, 1],
      [6, 0],
      [0, 6],
      [1, 5],
    ];
    let step = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (!map.getLayer("flow-fluid-line")) return;
        const [dash, gap] = dashSteps[step % dashSteps.length];
        map.setPaintProperty("flow-fluid-line", "line-dasharray", [dash, gap]);
        step++;
      }, 80);
    }, 200);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [mapLoaded, showTraffic, showFlowLayer]);

  // Renderizar incidentes como Markers HTML con reconciliacion (no destruye markers existentes)
  useEffect(() => {
    const markersMap = incidentMarkersRef.current;

    if (!mapLoaded || !showWazeIncidents) {
      markersMap.forEach((m) => m.remove());
      markersMap.clear();
      return;
    }
    const map = mapRef.current?.getMap?.() as maplibregl.Map | undefined;
    if (!map) return;

    // IDs actuales
    const currentIds = new Set(incidents.map((i) => i.id));

    // Quitar markers que ya no existen
    markersMap.forEach((m, id) => {
      if (!currentIds.has(id)) {
        m.remove();
        markersMap.delete(id);
      }
    });

    // Agregar solo markers nuevos
    incidents.forEach((inc) => {
      if (markersMap.has(inc.id)) return; // ya existe, no recrear

      const iconUrl = getWazePartnerHubIconUrl(inc.type, inc.subtype);
      const svgContent = getWazeIconSvg(inc.type, inc.subtype);
      const encodedSvg = encodeURIComponent(svgContent);
      const dataUri = `data:image/svg+xml;utf8,${encodedSvg}`;
      const src = iconUrl || dataUri;

      const el = document.createElement("div");
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.cursor = "pointer";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute(
        "aria-label",
        `Incidente: ${inc.type}${inc.subtype ? `, ${inc.subtype}` : ""}`,
      );
      el.style.touchAction = "manipulation";
      el.innerHTML = `
        <div style="
          width:36px;height:36px;
          border-radius:50%;
          background:#1e293b;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
          transition:transform 0.15s ease;
        ">
          <img src="${src}" alt="" role="presentation"
            style="width:30px;height:30px;object-fit:contain;pointer-events:none;"
            onerror="this.onerror=null;this.src='${dataUri}';"
          />
        </div>
      `;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const inner = el.firstElementChild as HTMLElement;
      if (!reducedMotion) {
        inner.addEventListener("mouseenter", () => {
          inner.style.transform = "scale(1.25)";
        });
        inner.addEventListener("mouseleave", () => {
          inner.style.transform = "";
        });
      }

      const handleActivate = () => {
        const timeMs =
          inc.timestamp instanceof Date
            ? inc.timestamp.getTime()
            : new Date(inc.timestamp).getTime();
        setSelectedJam(null);
        setSelectedIncident({
          lng: inc.location.lng,
          lat: inc.location.lat,
          properties: {
            id: inc.id,
            isNew: Date.now() - timeMs < 300000 ? 1 : 0,
            description: inc.description || "Sin descripción",
            street:
              inc.street ||
              `${inc.location.lat.toFixed(5)}, ${inc.location.lng.toFixed(5)}`,
            type: inc.type,
            subtype: inc.subtype || "",
            timestamp: inc.timestamp
              ? new Date(inc.timestamp).toISOString()
              : "",
            reportBy: inc.reportBy,
            reportRating: inc.reportRating,
            reliability: inc.reliability,
            confidence:
              typeof inc.confidence === "number"
                ? inc.confidence
                : Number(inc.confidence) || 0,
            magvar: (inc as any).magvar,
          },
        });
        map.flyTo({
          center: [inc.location.lng, inc.location.lat],
          zoom: 15,
          duration: 800,
        });
      };

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        handleActivate();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          handleActivate();
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([inc.location.lng, inc.location.lat])
        .addTo(map);

      markersMap.set(inc.id, marker);
    });
  }, [mapLoaded, showWazeIncidents, incidents, isDark]);

  // GeoJSON Memos (Polygons, Flow, Jams, Incidents)
  const polygonsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: polygons.map((p) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: p.geometry.coordinates },
        properties: {
          id: p.id,
          color:
            p.state === PolygonState.HIGH
              ? "#ef4444"
              : p.state === PolygonState.MEDIUM
                ? "#eab308"
                : "#22c55e",
        },
      })),
    }),
    [polygons],
  );

  const flowGeoJSON = useMemo(() => {
    const flowLines =
      trafficFlow.length > 0
        ? trafficFlow
        : jams.filter((j) => (j.speed || 0) > 20);
    return {
      type: "FeatureCollection",
      features: flowLines
        .filter((j) => {
          // Validar que la línea existe y tiene coordenadas válidas
          if (!j.line || j.line.length < 2) return false;
          return j.line.every(
            (p: { x: number; y: number }) =>
              p &&
              typeof p.x === "number" &&
              typeof p.y === "number" &&
              !isNaN(p.x) &&
              !isNaN(p.y) &&
              isFinite(p.x) &&
              isFinite(p.y),
          );
        })
        .map((jam) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: jam.line!.map((p: { x: number; y: number }) => [
              p.x,
              p.y,
            ]),
          },
          properties: {
            id: jam.id,
            speed: jam.speed || 0,
            delay: jam.delay || 0,
            length: jam.length || 0,
            street: jam.street || "Vía sin nombre",
            level: jam.level || 0,
            color: getFlowColor(jam.speed || 0),
            // Para flechas de dirección
            bearing: calculateBearing(jam.line),
          },
        })),
    };
  }, [trafficFlow, jams]);

  // Segmentos fluidos (speed >= 50): sin congestión = tráfico fluido → línea verde animada
  const flowFluidGeoJSON = useMemo(() => {
    const flowLines =
      trafficFlow.length > 0
        ? trafficFlow
        : jams.filter((j) => (j.speed || 0) > 20);
    const fluid = flowLines.filter((j) => (j.speed || 0) >= 50);
    return {
      type: "FeatureCollection",
      features: fluid
        .filter((j) => {
          if (!j.line || j.line.length < 2) return false;
          return j.line.every(
            (p: { x: number; y: number }) =>
              p &&
              typeof p.x === "number" &&
              typeof p.y === "number" &&
              !isNaN(p.x) &&
              !isNaN(p.y) &&
              isFinite(p.x) &&
              isFinite(p.y),
          );
        })
        .map((jam) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: jam.line!.map((p: { x: number; y: number }) => [
              p.x,
              p.y,
            ]),
          },
          properties: {
            id: jam.id,
            speed: jam.speed || 0,
            street: jam.street || "Vía sin nombre",
          },
        })),
    };
  }, [trafficFlow, jams]);

  const jamsGeoJSON = useMemo(() => {
    const congested = jams.filter(
      (j) => (j.level || 0) >= 2 || (j.speed || 0) <= 25,
    );
    return {
      type: "FeatureCollection",
      features: congested
        .filter((j) => {
          // Validar que la línea existe y tiene coordenadas válidas
          if (!j.line || j.line.length < 2) return false;
          // Verificar que todas las coordenadas son números válidos
          return j.line.every(
            (p: { x: number; y: number }) =>
              p &&
              typeof p.x === "number" &&
              typeof p.y === "number" &&
              !isNaN(p.x) &&
              !isNaN(p.y) &&
              isFinite(p.x) &&
              isFinite(p.y),
          );
        })
        .map((jam) => {
          // Calcular punto medio para el popup
          const midIndex = Math.floor(jam.line!.length / 2);
          const midPoint = jam.line![midIndex];

          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: jam.line!.map((p: { x: number; y: number }) => [
                p.x,
                p.y,
              ]),
            },
            properties: {
              id: jam.id,
              level: jam.level || 0,
              speed: jam.speed || 0,
              delay: jam.delay || 0,
              length: jam.length || 0,
              street: jam.street || "Vía sin nombre",
              city: jam.city || "",
              roadType: jam.roadType || 0,
              color: getJamColor(jam.level || 0, jam.speed || 0),
              // Punto medio para labels/popups
              midLng: midPoint?.x || 0,
              midLat: midPoint?.y || 0,
              // Label de velocidad
              speedLabel: `${Math.round(jam.speed || 0)} km/h`,
              // Severidad textual
              severityText: getJamSeverityText(jam.level || 0, jam.speed || 0),
            },
          };
        }),
    };
  }, [jams]);

  // GeoJSON para puntos de etiquetas de velocidad en atascos
  const jamLabelsGeoJSON = useMemo(() => {
    const congested = jams.filter(
      (j) => (j.level || 0) >= 3 || (j.speed || 0) <= 15,
    );
    return {
      type: "FeatureCollection",
      features: congested
        .filter((j) => {
          if (!j.line || j.line.length < 2) return false;
          const midIndex = Math.floor(j.line.length / 2);
          const midPoint = j.line[midIndex];
          // Validar que el punto medio tiene coordenadas válidas
          return (
            midPoint &&
            typeof midPoint.x === "number" &&
            typeof midPoint.y === "number" &&
            !isNaN(midPoint.x) &&
            !isNaN(midPoint.y) &&
            isFinite(midPoint.x) &&
            isFinite(midPoint.y)
          );
        })
        .map((jam) => {
          const midIndex = Math.floor(jam.line!.length / 2);
          const midPoint = jam.line![midIndex];
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [midPoint.x, midPoint.y],
            },
            properties: {
              id: jam.id,
              speed: jam.speed || 0,
              level: jam.level || 0,
              delay: jam.delay || 0,
              length: jam.length || 0,
              street: jam.street || "Vía sin nombre",
              speedLabel: `${Math.round(jam.speed || 0)}`,
              delayLabel:
                jam.delay > 60 ? `+${Math.round(jam.delay / 60)}min` : "",
            },
          };
        }),
    };
  }, [jams]);

  const incidentsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: incidents.map((inc) => {
        const timeMs =
          inc.timestamp instanceof Date
            ? inc.timestamp.getTime()
            : new Date(inc.timestamp).getTime();
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [inc.location.lng, inc.location.lat],
          },
          properties: {
            id: inc.id,
            isNew: Date.now() - timeMs < 300000 ? 1 : 0,
            iconId: `waze-${inc.type.toLowerCase()}${
              inc.subtype ? "-" + inc.subtype.toLowerCase() : ""
            }`,
            // Datos para Popup
            description: inc.description || "Sin descripción",
            street:
              inc.street ||
              `${inc.location.lat.toFixed(5)}, ${inc.location.lng.toFixed(5)}`,
            type: inc.type,
            subtype: inc.subtype || "",
            timestamp: inc.timestamp
              ? new Date(inc.timestamp).toISOString()
              : "",
            reportBy: inc.reportBy,
            nThumbsUp: inc.nThumbsUp || 0,
            confidence:
              typeof inc.confidence === "number"
                ? inc.confidence
                : Number(inc.confidence) || 0,
            magvar: inc.magvar,
          },
        };
      }),
    }),
    [incidents],
  );

  // GeoJSON para líneas de cierres de camino usando datos reales
  const roadClosureLinesGeoJSON = useMemo(() => {
    const closures = incidents.filter(
      (inc) =>
        inc.type.toLowerCase().includes("roadclosed") ||
        inc.type.toLowerCase().includes("road_closed"),
    );

    const features = closures.flatMap((closure) => {
      // Opción 1: Buscar jams con blockingAlertUuid coincidente
      let associatedJams = jams.filter(
        (jam) => jam.blockingAlertUuid === closure.id,
      );

      // Opción 2: Si no hay jams bloqueantes, buscar por calle y proximidad
      if (associatedJams.length === 0 && closure.street) {
        associatedJams = jams.filter((jam) => {
          if (!jam.line || jam.line.length < 2) return false;
          if (!jam.street || jam.street !== closure.street) return false;

          // Calcular distancia al primer punto del jam
          const jamStart = jam.line[0];
          const dx =
            (jamStart.x - closure.location.lng) *
            111320 *
            Math.cos((closure.location.lat * Math.PI) / 180);
          const dy = (jamStart.y - closure.location.lat) * 110540;
          const distance = Math.sqrt(dx * dx + dy * dy);

          return distance < 500; // 500 metros
        });
      }

      // Convertir jams asociados a features de línea roja
      return associatedJams
        .filter((jam) => {
          if (!jam.line || jam.line.length < 2) return false;
          // Validar coordenadas
          return jam.line.every(
            (p: { x: number; y: number }) =>
              p &&
              typeof p.x === "number" &&
              typeof p.y === "number" &&
              !isNaN(p.x) &&
              !isNaN(p.y) &&
              isFinite(p.x) &&
              isFinite(p.y),
          );
        })
        .map((jam) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: jam.line!.map((p: { x: number; y: number }) => [
              p.x,
              p.y,
            ]),
          },
          properties: {
            closureId: closure.id,
            jamId: jam.id,
            type: "road_closure",
            color: "#dc2626", // Rojo intenso para cierres
            street: jam.street || closure.street,
            method: jam.blockingAlertUuid ? "blocking_uuid" : "proximity",
          },
        }));
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [incidents, jams]);

  // Calcular bearing/dirección de una línea
  function calculateBearing(line?: Array<{ x: number; y: number }>): number {
    if (!line || line.length < 2) return 0;
    const start = line[0];
    const end = line[line.length - 1];
    const dLng = end.x - start.x;
    const dLat = end.y - start.y;
    return (Math.atan2(dLng, dLat) * 180) / Math.PI;
  }

  // Obtener texto de severidad del atasco
  function getJamSeverityText(level: number, speed: number): string {
    if (speed < 5 || level >= 5) return "Detenido";
    if (level >= 4 || speed < 10) return "Muy Lento";
    if (level >= 3 || speed < 20) return "Lento";
    if (level >= 2 || speed < 30) return "Moderado";
    return "Fluido";
  }

  // Funciones de color para flujo de tráfico (estilo Waze)
  function getFlowColor(speed: number): string {
    // Colores estilo Waze Traffic
    if (speed >= 65) return "#00c853"; // Verde brillante - flujo libre
    if (speed >= 50) return "#64dd17"; // Verde lima - buen flujo
    if (speed >= 35) return "#ffeb3b"; // Amarillo - flujo moderado
    if (speed >= 20) return "#ff9800"; // Naranja - flujo lento
    if (speed >= 10) return "#ff5722"; // Naranja oscuro - muy lento
    return "#d32f2f"; // Rojo - casi detenido
  }

  function getJamColor(level: number, speed: number): string {
    // Colores estilo Waze para congestión
    if (speed < 5 || level >= 5) return "#b71c1c"; // Rojo muy oscuro - detenido
    if (speed < 10 || level >= 4) return "#c62828"; // Rojo oscuro - muy lento
    if (speed < 20 || level >= 3) return "#e53935"; // Rojo - lento
    if (speed < 30 || level >= 2) return "#ff7043"; // Naranja rojizo - moderado
    return "#ffa726"; // Naranja - leve
  }

  // Nota: Se removió la animación dinámica de line-dasharray porque causaba errores
  // de MapLibre cuando las geometrías tenían coordenadas nulas o inválidas.
  // La capa jams-animated usa un dasharray estático que es más estable.

  // Basemap raster evita "unknown feature value" en tiles vectoriales del basemap Carto
  const mapStyle = useMemo(
    (): maplibregl.StyleSpecification => ({
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: isDark
            ? [
                "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
              ]
            : ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: isDark ? "© CARTO" : "© OpenStreetMap contributors",
        },
      },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }],
    }),
    [isDark],
  );

  return (
    <div
      className={`h-full w-full min-h-[500px] ${isDark ? "bg-[#222736]" : "bg-gray-100"} relative`}
      style={{ minHeight: "500px" }}
      role="region"
      aria-label="Mapa de incidentes y tráfico"
    >
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%", minHeight: "500px" }}
        mapStyle={mapStyle}
        attributionControl={false}
        clickTolerance={20}
        onLoad={(e: any) => {
          startTransition(() => {
            setMapLoaded(true);
            onMapLoad(e);
          });
        }}
      >
        <NavigationControl position="top-right" showCompass showZoom />

        {/* Polígonos */}
        <Source
          id="polygons-source"
          type="geojson"
          data={polygonsGeoJSON as any}
        >
          <Layer
            id="polygons-fill"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": isDark ? 0.1 : 0.2, // Más opaco en claro
            }}
          />
          <Layer
            id="polygons-border"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 1,
              "line-opacity": isDark ? 0.5 : 0.7,
            }}
          />
          {/* Resaltado de Polígono Seleccionado */}
          {selectedPolygon && (
            <Layer
              id="polygons-selected"
              type="line"
              filter={["==", ["get", "id"], selectedPolygon]}
              paint={{
                "line-color": "#6366f1", // Color Indigo de la marca
                "line-width": 4,
                "line-opacity": 1,
              }}
            />
          )}
          {selectedPolygon && (
            <Layer
              id="polygons-selected-fill"
              type="fill"
              filter={["==", ["get", "id"], selectedPolygon]}
              paint={{
                "fill-color": "#6366f1",
                "fill-opacity": isDark ? 0.25 : 0.35,
              }}
            />
          )}
        </Source>

        {/* Flujo de Tráfico - Capa base con gradiente */}
        {showTraffic && showFlowLayer && (
          <Source id="flow" type="geojson" data={flowGeoJSON as any}>
            {/* Capa de borde/sombra */}
            <Layer
              id="flow-line-border"
              type="line"
              paint={{
                "line-color": "#000000",
                "line-width": 7,
                "line-opacity": 0.15,
                "line-blur": 2,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            {/* Capa principal de flujo */}
            <Layer
              id="flow-line"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  3,
                  14,
                  5,
                  18,
                  8,
                ],
                "line-opacity": 0.9,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </Source>
        )}

        {/* Tráfico fluido (speed >= 50): línea verde animada = sin congestión */}
        {showTraffic && showFlowLayer && mapLoaded && (
          <Source id="flow-fluid" type="geojson" data={flowFluidGeoJSON as any}>
            <Layer
              id="flow-fluid-line"
              type="line"
              paint={{
                "line-color": "#00c853",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  4,
                  14,
                  6,
                  18,
                  10,
                ],
                "line-opacity": 0.95,
                "line-dasharray": [2, 4],
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </Source>
        )}

        {/* Jams/Atascos - Capas mejoradas con efecto Waze */}
        {showTraffic && showJamsLayer && mapLoaded && (
          <Source id="jams-source" type="geojson" data={jamsGeoJSON as any}>
            {/* Capa de glow exterior pulsante */}
            <Layer
              id="jams-outer-glow"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["get", "level"],
                  2,
                  12,
                  3,
                  16,
                  4,
                  20,
                  5,
                  26,
                ],
                "line-opacity": [
                  "interpolate",
                  ["linear"],
                  ["get", "level"],
                  2,
                  0.15,
                  5,
                  0.35,
                ],
                "line-blur": 6,
              }}
            />
            {/* Capa de glow interior */}
            <Layer
              id="jams-glow"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["get", "level"],
                  2,
                  8,
                  3,
                  10,
                  4,
                  14,
                  5,
                  18,
                ],
                "line-opacity": 0.5,
                "line-blur": 3,
              }}
            />
            {/* Capa núcleo - línea principal */}
            <Layer
              id="jams-core"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  ["interpolate", ["linear"], ["get", "level"], 2, 3, 5, 5],
                  14,
                  ["interpolate", ["linear"], ["get", "level"], 2, 4, 5, 7],
                  18,
                  ["interpolate", ["linear"], ["get", "level"], 2, 6, 5, 10],
                ],
                "line-opacity": 1,
              }}
            />
            {/* Patrón de línea animada para indicar dirección del flujo lento */}
            <Layer
              id="jams-animated"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#ffffff",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["get", "level"],
                  2,
                  1,
                  5,
                  2,
                ],
                "line-opacity": [
                  "interpolate",
                  ["linear"],
                  ["get", "level"],
                  2,
                  0.3,
                  5,
                  0.6,
                ],
                "line-dasharray": [0.5, 3],
              }}
            />
          </Source>
        )}

        {/* Etiquetas de velocidad en atascos severos - solo en zoom alto */}
        {showTraffic && showJamsLayer && mapLoaded && (
          <Source
            id="jam-labels-source"
            type="geojson"
            data={jamLabelsGeoJSON as any}
          >
            {/* Fondo del label */}
            <Layer
              id="jam-labels-bg"
              type="circle"
              minzoom={13}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  10,
                  16,
                  14,
                ],
                "circle-color": [
                  "case",
                  ["<", ["get", "speed"], 5],
                  "#b71c1c",
                  ["<", ["get", "speed"], 15],
                  "#c62828",
                  ["<", ["get", "speed"], 25],
                  "#e53935",
                  "#ff7043",
                ],
                "circle-opacity": 0.95,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
            {/* Texto de velocidad */}
            <Layer
              id="jam-labels-text"
              type="symbol"
              minzoom={13}
              layout={{
                "text-field": ["get", "speedLabel"],
                "text-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  9,
                  16,
                  12,
                ],
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
              }}
              paint={{
                "text-color": "#ffffff",
                "text-halo-color": "rgba(0,0,0,0.3)",
                "text-halo-width": 1,
              }}
            />
            {/* Label de demora (minutos extra) */}
            <Layer
              id="jam-delay-labels"
              type="symbol"
              minzoom={14}
              layout={{
                "text-field": ["get", "delayLabel"],
                "text-size": 10,
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"],
                "text-offset": [0, 1.8],
                "text-allow-overlap": false,
              }}
              paint={{
                "text-color": "#ffcdd2",
                "text-halo-color": "rgba(0,0,0,0.7)",
                "text-halo-width": 1,
              }}
            />
          </Source>
        )}

        {/* Líneas de cierres de camino (usando datos reales de jams) */}
        {showRoadClosures && (
          <Source
            id="road-closures"
            type="geojson"
            data={roadClosureLinesGeoJSON as any}
          >
            {/* Línea roja gruesa para el cierre */}
            <Layer
              id="road-closure-lines"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 8,
                "line-opacity": 0.85,
                "line-dasharray": [2, 3], // Línea punteada: 2 pixels línea, 3 pixels espacio
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            {/* Línea blanca punteada encima para contraste */}
            <Layer
              id="road-closure-dashed"
              type="line"
              paint={{
                "line-color": "#ffffff",
                "line-width": 3,
                "line-opacity": 0.7,
                "line-dasharray": [3, 3],
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </Source>
        )}

        {/* Incidentes se renderizan como Markers HTML (ver useEffect) */}

        {/* Popup de Atasco/Tráfico */}
        {selectedJam && (
          <Popup
            longitude={selectedJam.lng}
            latitude={selectedJam.lat}
            anchor="bottom"
            onClose={() => setSelectedJam(null)}
            closeButton={false}
            className="jam-popup"
            maxWidth="320px"
            style={{ zIndex: 99999 }}
          >
            <div
              className={`rounded-xl shadow-2xl overflow-hidden min-w-[280px] ${
                isDark ? "bg-veltrix-card text-white" : "bg-white text-gray-800"
              }`}
            >
              {/* Header con gradiente según severidad */}
              <div
                className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-veltrix-border"
                style={{
                  background: isDark
                    ? `linear-gradient(135deg, ${selectedJam.properties.color}30 0%, transparent 100%)`
                    : `linear-gradient(135deg, ${selectedJam.properties.color}20 0%, transparent 100%)`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2.5 rounded-xl shadow-lg"
                    style={{ backgroundColor: selectedJam.properties.color }}
                  >
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
                      Congestión de Tráfico
                    </p>
                    <h3 className="font-bold text-lg leading-tight">
                      {selectedJam.properties.street || "Vía"}
                    </h3>
                    {selectedJam.properties.city && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedJam.properties.city}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJam(null)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500"
                  aria-label="Cerrar detalle"
                  title="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Indicador de severidad visual */}
              <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Estado del tráfico
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: selectedJam.properties.color }}
                  >
                    {selectedJam.properties.severityText ||
                      getJamSeverityText(
                        selectedJam.properties.level,
                        selectedJam.properties.speed,
                      )}
                  </span>
                </div>
                {/* Barra de nivel de congestión */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, (selectedJam.properties.level || 1) * 20)}%`,
                      backgroundColor: selectedJam.properties.color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Fluido</span>
                  <span>Detenido</span>
                </div>
              </div>

              {/* Métricas principales */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {/* Velocidad */}
                <div className="text-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
                  <Gauge className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p
                    className="text-lg font-bold"
                    style={{ color: selectedJam.properties.color }}
                  >
                    {Math.round(selectedJam.properties.speed || 0)}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    km/h
                  </p>
                </div>
                {/* Demora */}
                <div className="text-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
                  <Timer className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedJam.properties.delay > 60
                      ? `+${Math.round(selectedJam.properties.delay / 60)}`
                      : `+${Math.round(selectedJam.properties.delay || 0)}`}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {selectedJam.properties.delay > 60 ? "min" : "seg"}
                  </p>
                </div>
                {/* Longitud */}
                <div className="text-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
                  <Route className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedJam.properties.length > 1000
                      ? (selectedJam.properties.length / 1000).toFixed(1)
                      : Math.round(selectedJam.properties.length || 0)}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {selectedJam.properties.length > 1000 ? "km" : "m"}
                  </p>
                </div>
              </div>

              {/* Footer con nivel de congestión Waze */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-veltrix-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    Nivel Waze:
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`w-3 h-3 rounded-sm ${
                          lvl <= (selectedJam.properties.level || 0)
                            ? ""
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                        style={{
                          backgroundColor:
                            lvl <= (selectedJam.properties.level || 0)
                              ? selectedJam.properties.color
                              : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-gray-400 font-mono text-[10px]">
                  Tipo vía: {selectedJam.properties.roadType || "-"}
                </span>
              </div>
            </div>
          </Popup>
        )}

        {/* Popup de Incidente */}
        {selectedIncident && (
          <Popup
            longitude={selectedIncident.lng}
            latitude={selectedIncident.lat}
            anchor="bottom"
            onClose={() => setSelectedIncident(null)}
            closeButton={false}
            className="incident-popup"
            maxWidth="350px"
            style={{ zIndex: 99999 }}
          >
            <div
              className={`rounded-xl shadow-2xl overflow-hidden min-w-[320px] ${
                isDark ? "bg-veltrix-card text-white" : "bg-white text-gray-800"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-veltrix-border bg-gray-50/50 dark:bg-zinc-900/50">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={getWazePartnerHubIconUrl(
                        selectedIncident.properties.type,
                        selectedIncident.properties.subtype,
                      )}
                      className="w-10 h-10 object-contain drop-shadow-md"
                      alt="icon"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
                      {selectedIncident.properties.street || "Ubicación"}
                    </p>
                    <h3 className="font-bold text-lg leading-tight">
                      {getIncidentDescription(
                        selectedIncident.properties.type,
                        selectedIncident.properties.subtype,
                      )}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500"
                  aria-label="Cerrar detalle"
                  title="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-4 space-y-4 text-sm">
                {/* Tabla de Informacion */}
                <div className="grid grid-cols-[110px_1fr] gap-y-3 gap-x-2">
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Tipo
                  </span>
                  <span className="font-medium">
                    {getMainTypeTranslation(selectedIncident.properties.type)}
                  </span>

                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Fecha de inicio
                  </span>
                  <span>
                    {selectedIncident.properties.timestamp
                      ? new Date(
                          selectedIncident.properties.timestamp,
                        ).toLocaleString("es-AR")
                      : "N/A"}
                  </span>

                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Descripción
                  </span>
                  <span className="leading-snug">
                    {selectedIncident.properties.description}
                  </span>

                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Informante
                  </span>
                  <span className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded w-fit text-blue-600 dark:text-blue-400">
                    {selectedIncident.properties.reportBy || "Wazer"}
                  </span>

                  {selectedIncident.properties.magvar !== undefined &&
                    selectedIncident.properties.magvar !== null && (
                      <>
                        <span className="font-medium text-gray-500 dark:text-gray-400">
                          Dirección
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Navigation
                            className="h-3.5 w-3.5 text-blue-500"
                            style={{
                              transform: `rotate(${selectedIncident.properties.magvar}deg)`,
                            }}
                          />
                          {getCardinalDirection(
                            selectedIncident.properties.magvar,
                          )}
                          <span className="text-gray-400 text-xs">
                            ({Math.round(selectedIncident.properties.magvar)}
                            °)
                          </span>
                        </span>
                      </>
                    )}

                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    ID
                  </span>
                  <span className="text-[10px] uppercase font-mono text-gray-400 break-all leading-tight">
                    {selectedIncident.properties.id}
                  </span>
                </div>
              </div>

              {/* Footer Status */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-veltrix-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <span className="w-3.5 h-3.5 flex items-center justify-center">
                      👍
                    </span>
                    {Number(selectedIncident?.properties?.nThumbsUp) || 0}{" "}
                    valoraciones
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-veltrix-bg rounded-full shadow-sm border border-gray-100 dark:border-veltrix-border">
                    <ShieldCheck className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">
                      Confianza:{" "}
                      {(() => {
                        const c = selectedIncident?.properties?.confidence;
                        if (c == null) return "N/A";
                        const n =
                          typeof c === "number" ? c : parseFloat(String(c));
                        return !Number.isNaN(n) ? `${n.toFixed(1)}/5` : "N/A";
                      })()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const incId = selectedIncident.properties.id;
                    setSelectedIncident(null);
                    setDetailIncidentId(incId);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Ver detalle completo
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Modal de detalle de incidente (renderizado en body via portal) */}
      {!!detailIncidentId &&
        !!detailIncident &&
        createPortal(
          <IncidentDetailModal
            incident={detailIncident}
            isOpen={true}
            onClose={() => setDetailIncidentId(null)}
            onViewOnMap={(incident) => {
              setDetailIncidentId(null);
              navigate(
                `/mapa?lat=${incident.location.lat}&lng=${incident.location.lng}&zoom=16&highlight=${incident.uuid}`,
              );
            }}
            onExportPDF={async (incident) => {
              try {
                // Acceso lazy: solo se lee cuando el usuario exporta
                const authUser = useAuthStore.getState().user;
                const userName = authUser
                  ? `${authUser.firstName} ${authUser.lastName}`.trim()
                  : undefined;
                await exportIncidentToPDF(incident, userName);
              } catch (error) {
                console.error("Error exportando PDF:", error);
              }
            }}
          />,
          document.body,
        )}
    </div>
  );
};
