/**
 * Heatmap de siniestros viales.
 *
 * - Mapa MapLibre con basemap raster (CARTO light/dark), polígonos RAC y
 *   mojones kilométricos como capas de referencia.
 * - Dos fuentes GeoJSON para los siniestros:
 *     1. `accidents-heat`: sin clustering, alimenta el `heatmap` a bajo zoom.
 *     2. `accidents-cluster`: con `cluster: true` + `clusterProperties`
 *        para agrupar y sumar por severidad. Al hacer zoom in/out MapLibre
 *        agrupa/desagrupa el conteo automáticamente.
 * - Al pasar el cursor por un clúster o por un punto individual se muestra
 *   un popup con el conteo total desglosado por severidad.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  Filter,
  Flame,
  Info,
  RefreshCcw,
} from "lucide-react";

import { useThemeStore } from "../stores/useThemeStore";
import { useKilometers } from "../hooks/useKilometers";
import {
  useAccidentsHeatmap,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  type HeatmapAccident,
  type SeverityBucket,
} from "../hooks/useAccidentsHeatmap";
import { DateTimeRangeFilter } from "../components/accidents/DateTimeRangeFilter";
import {
  clearHeatmapReturnView,
  readHeatmapReturnView,
  saveHeatmapReturnView,
} from "../lib/heatmapReturnView";
import { realCordobaPolygons } from "../data/mock/realCordobaPolygons";
import { API_CONFIG, TILES_VERSION } from "../config/constants";
import { INITIAL_VIEW_STATE } from "../components/map/mapUtils";

const HEATMAP_MAX_ZOOM_STOP = 15;
const HEATMAP_FADE_ZOOM = 14;
/** A partir de este zoom los clústeres se disuelven y aparecen puntos individuales. */
const CLUSTER_MAX_ZOOM = 13;
const CLUSTER_LAYER_ID = "accidents-clusters";
const CLUSTER_COUNT_LAYER_ID = "accidents-cluster-count";
const UNCLUSTERED_LAYER_ID = "accidents-unclustered";

const BUCKET_ORDER: SeverityBucket[] = [
  "grave",
  "moderado",
  "leve",
  "desconocido",
];
const ALL_BUCKETS: ReadonlySet<SeverityBucket> = new Set(BUCKET_ORDER);

/**
 * Waze suele reportar varios accidentes exactamente sobre la misma
 * intersección/rotonda, por lo que muchos puntos comparten lat/lng.
 * Sin dispersión visual, al hacer zoom máximo se ven como uno solo.
 *
 * Distribuye los puntos coincidentes en una pequeña espiral áurea
 * (~3 m de base) para que sean individualmente distinguibles y
 * clickeables al desagrupar el clúster.
 *
 * Devuelve `displayLng`/`displayLat` para renderizar; las coordenadas
 * originales se conservan por si el detalle las necesita.
 */
function distributeCoincidentPoints(
  accidents: HeatmapAccident[],
): Array<HeatmapAccident & { displayLat: number; displayLng: number }> {
  // Usar Object (no `new Map`) para no chocar con el componente `Map`
  // importado de react-map-gl en este mismo módulo.
  const groups: Record<string, HeatmapAccident[]> = Object.create(null);
  for (const a of accidents) {
    const key = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const baseRadiusDeg = 0.00003;
  const result: Array<
    HeatmapAccident & { displayLat: number; displayLng: number }
  > = [];

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.length === 1) {
      const a = group[0];
      result.push({ ...a, displayLat: a.lat, displayLng: a.lng });
      continue;
    }
    const latCosine = Math.cos((group[0].lat * Math.PI) / 180) || 1;
    group.forEach((a: HeatmapAccident, i: number) => {
      const angle = i * goldenAngle;
      const r = baseRadiusDeg * Math.sqrt(i);
      const dLat = r * Math.sin(angle);
      const dLng = (r * Math.cos(angle)) / latCosine;
      result.push({
        ...a,
        displayLat: a.lat + dLat,
        displayLng: a.lng + dLng,
      });
    });
  }
  return result;
}

type HoverInfo =
  | {
      kind: "cluster";
      lng: number;
      lat: number;
      total: number;
      severidad: Record<SeverityBucket, number>;
    }
  | {
      kind: "point";
      lng: number;
      lat: number;
      accident: HeatmapAccident;
    };

function daysAgoLocalIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function nowEndLocalIso(): string {
  const d = new Date();
  d.setSeconds(59, 999);
  return d.toISOString();
}

export function AccidentsHeatmapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const restoreRequested = searchParams.get("restore") === "1";
  const savedReturn = useMemo(
    () => (restoreRequested ? readHeatmapReturnView() : null),
    [restoreRequested],
  );

  const isDark = useThemeStore((s) => s.isDark);
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(
    () => savedReturn?.dateFrom ?? daysAgoLocalIso(365),
  );
  const [dateTo, setDateTo] = useState<string>(
    () => savedReturn?.dateTo ?? nowEndLocalIso(),
  );
  const [activeBuckets, setActiveBuckets] = useState<Set<SeverityBucket>>(
    () => {
      const buckets = savedReturn?.activeBuckets?.filter((b) =>
        ALL_BUCKETS.has(b),
      );
      return buckets && buckets.length > 0
        ? new Set(buckets)
        : new Set(ALL_BUCKETS);
    },
  );

  const { data: accidents = [], isLoading, refetch, isFetching } =
    useAccidentsHeatmap({ from: dateFrom, to: dateTo, limit: 5000 });
  const { data: kilometerMarkers = [] } = useKilometers(true);

  const filteredAccidents = useMemo(
    () => accidents.filter((a) => activeBuckets.has(a.bucket)),
    [accidents, activeBuckets],
  );

  // Dispersa puntos con coordenadas idénticas para que al hacer zoom
  // máximo se vean individualmente (Waze puede reportar varios
  // accidentes exactamente sobre la misma intersección/rotonda).
  const distributedAccidents = useMemo(
    () => distributeCoincidentPoints(filteredAccidents),
    [filteredAccidents],
  );

  const toggleBucket = (bucket: SeverityBucket) => {
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  const resetBuckets = () => setActiveBuckets(new Set(ALL_BUCKETS));

  const accidentsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: distributedAccidents.map((a) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [a.displayLng, a.displayLat],
        },
        properties: {
          id: a.id,
          bucket: a.bucket,
          severity: a.severity ?? 0,
          subtype: a.subtype ?? "",
          street: a.street ?? "",
          accident_at: a.accident_at,
          polygon_id: a.polygon_id ?? "",
          sev_leve: a.bucket === "leve" ? 1 : 0,
          sev_moderado: a.bucket === "moderado" ? 1 : 0,
          sev_grave: a.bucket === "grave" ? 1 : 0,
          sev_desconocido: a.bucket === "desconocido" ? 1 : 0,
          intensidad:
            a.bucket === "grave"
              ? 3
              : a.bucket === "moderado"
                ? 2
                : a.bucket === "leve"
                  ? 1
                  : 1,
        },
      })),
    };
  }, [distributedAccidents]);

  const polygonsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: realCordobaPolygons.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: p.geometry.coordinates as [number, number][][],
        },
        properties: { id: p.id, name: p.name ?? p.id },
      })),
    };
  }, []);

  const kilometersGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: kilometerMarkers.map((km) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [km.longitude, km.latitude],
        },
        properties: { name: km.name, route_name: km.route_name ?? "" },
      })),
    };
  }, [kilometerMarkers]);

  const tilesBase = API_CONFIG.tilesBase || "";
  const mapStyle = useMemo(
    () =>
      ({
        version: 8,
        // Necesario para capas `symbol` (conteo de clústeres y labels de mojones).
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          basemap: {
            type: "raster",
            tiles: isDark
              ? [
                  `${tilesBase}/tiles/v2/carto-dark/{z}/{x}/{y}.png?v=${TILES_VERSION}`,
                ]
              : [
                  `${tilesBase}/tiles/v2/carto-light/{z}/{x}/{y}.png?v=${TILES_VERSION}`,
                ],
            tileSize: 256,
            attribution: "© CARTO",
            minzoom: 0,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": isDark ? "#0f172a" : "#eef2f7",
            },
          },
          {
            id: "basemap",
            type: "raster",
            source: "basemap",
            paint: { "raster-fade-duration": 200 },
          },
        ],
      }) as maplibregl.StyleSpecification,
    [isDark, tilesBase],
  );

  // Ajustar vista: restaurar zoom/posición al volver del detalle,
  // o fitBounds a los siniestros en la primera carga.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (!mapLoaded || didFitRef.current) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (restoreRequested && savedReturn) {
      didFitRef.current = true;
      map.jumpTo({
        center: [savedReturn.lng, savedReturn.lat],
        zoom: savedReturn.zoom,
        bearing: savedReturn.bearing ?? 0,
        pitch: savedReturn.pitch ?? 0,
      });
      clearHeatmapReturnView();
      const next = new URLSearchParams(searchParams);
      next.delete("restore");
      setSearchParams(next, { replace: true });
      return;
    }

    if (accidents.length === 0) return;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const a of accidents) {
      if (a.lng < minLng) minLng = a.lng;
      if (a.lat < minLat) minLat = a.lat;
      if (a.lng > maxLng) maxLng = a.lng;
      if (a.lat > maxLat) maxLat = a.lat;
    }
    if (!Number.isFinite(minLng)) return;
    didFitRef.current = true;
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, maxZoom: 13, duration: 700 },
    );
  }, [
    mapLoaded,
    accidents,
    restoreRequested,
    savedReturn,
    searchParams,
    setSearchParams,
  ]);

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const features = event.features ?? [];
    if (features.length === 0) {
      setHover(null);
      return;
    }
    const cluster = features.find(
      (f) => f.layer?.id === CLUSTER_LAYER_ID && f.properties?.cluster,
    );
    if (cluster) {
      const props = cluster.properties as Record<string, unknown>;
      const total = Number(props.point_count ?? 0);
      const [lng, lat] = (cluster.geometry as GeoJSON.Point).coordinates;
      setHover({
        kind: "cluster",
        lng,
        lat,
        total,
        severidad: {
          leve: Number(props.sev_leve ?? 0),
          moderado: Number(props.sev_moderado ?? 0),
          grave: Number(props.sev_grave ?? 0),
          desconocido: Number(props.sev_desconocido ?? 0),
        },
      });
      return;
    }
    const point = features.find((f) => f.layer?.id === UNCLUSTERED_LAYER_ID);
    if (point) {
      const props = point.properties as Record<string, unknown>;
      const [lng, lat] = (point.geometry as GeoJSON.Point).coordinates;
      const bucket = String(props.bucket ?? "desconocido") as SeverityBucket;
      setHover({
        kind: "point",
        lng,
        lat,
        accident: {
          id: String(props.id ?? ""),
          lat,
          lng,
          severity: Number(props.severity ?? 0) || null,
          subtype: (props.subtype as string) || null,
          bucket,
          street: (props.street as string) || null,
          accident_at:
            (props.accident_at as string) || new Date().toISOString(),
          polygon_id: (props.polygon_id as string) || null,
        },
      });
      return;
    }
    setHover(null);
  };

  const handleClick = async (event: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const features = event.features ?? [];
    const cluster = features.find(
      (f) => f.layer?.id === CLUSTER_LAYER_ID && f.properties?.cluster,
    );
    if (cluster) {
      const clusterId = Number(cluster.properties?.cluster_id);
      const source = map.getSource("accidents-cluster") as unknown as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!source || !Number.isFinite(clusterId)) return;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const [lng, lat] = (cluster.geometry as GeoJSON.Point).coordinates;
        map.easeTo({ center: [lng, lat], zoom, duration: 500 });
      } catch {
        /* noop */
      }
      return;
    }
    const point = features.find((f) => f.layer?.id === UNCLUSTERED_LAYER_ID);
    if (point) {
      const id = String(point.properties?.id ?? "");
      if (!id) return;
      const center = map.getCenter();
      saveHeatmapReturnView({
        lng: center.lng,
        lat: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        dateFrom,
        dateTo,
        activeBuckets: Array.from(activeBuckets),
        accidentId: id,
        savedAt: Date.now(),
      });
      navigate(
        `/siniestros?accident=${encodeURIComponent(id)}&from=heatmap`,
      );
    }
  };

  const totalPorBucket = useMemo(() => {
    const buckets: Record<SeverityBucket, number> = {
      grave: 0,
      moderado: 0,
      leve: 0,
      desconocido: 0,
    };
    for (const a of accidents) buckets[a.bucket] += 1;
    return buckets;
  }, [accidents]);

  const isFilterActive = activeBuckets.size !== ALL_BUCKETS.size;
  const conteoLegibleTotal = accidents.length.toLocaleString("es-AR");
  const conteoLegibleVisible =
    filteredAccidents.length.toLocaleString("es-AR");

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="relative z-20 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:border-slate-800 dark:bg-slate-900/90 dark:supports-[backdrop-filter]:bg-slate-900/75">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent dark:via-red-500/35"
        />

        <div className="flex h-14 items-center gap-3 px-3 sm:gap-4 sm:px-4">
          {/* Identidad */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate("/siniestros")}
              aria-label="Volver al listado de siniestros"
              className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-offset-slate-900"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-sm shadow-red-500/20">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-base">
                  Mapa de calor de incidentes
                </h1>
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isFetching ? "animate-pulse bg-red-500" : "bg-emerald-500"
                    }`}
                    aria-hidden="true"
                  />
                  {isFetching
                    ? "Actualizando…"
                    : isFilterActive
                      ? `${conteoLegibleVisible} / ${conteoLegibleTotal}`
                      : `${conteoLegibleTotal} siniestros`}
                </span>
              </div>
              <p className="hidden truncate text-[11px] text-slate-500 dark:text-slate-400 sm:block">
                Densidad por zona · desglose por severidad en la leyenda
              </p>
            </div>
          </div>

          {/* Controles de período */}
          <div
            role="group"
            aria-label="Período del mapa de calor"
            className="flex shrink-0 items-center gap-2"
          >
            <DateTimeRangeFilter
              fromIso={dateFrom}
              toIso={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Actualizar mapa de calor"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-3 text-xs font-semibold text-white shadow-sm shadow-red-500/20 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {isFetching ? "…" : "Actualizar"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex-1 min-h-0">
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          initialViewState={{ ...INITIAL_VIEW_STATE, zoom: 10, pitch: 0 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
          attributionControl={false}
          onLoad={() => setMapLoaded(true)}
          onError={(e: { error?: Error }) => {
            console.error("[AccidentsHeatmap] MapLibre error:", e.error);
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          onClick={handleClick}
          interactiveLayerIds={[CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID]}
        >
          <NavigationControl position="top-right" showCompass showZoom />
          <ScaleControl position="bottom-right" unit="metric" />

          {/* Polígonos RAC — contorno de referencia */}
          <Source id="rac-polygons" type="geojson" data={polygonsGeoJSON}>
            <Layer
              id="rac-polygons-fill"
              type="fill"
              paint={{
                "fill-color": isDark ? "#38bdf8" : "#0284c7",
                "fill-opacity": 0.05,
              }}
            />
            <Layer
              id="rac-polygons-outline"
              type="line"
              paint={{
                "line-color": isDark ? "#38bdf8" : "#0284c7",
                "line-width": 1.5,
                "line-opacity": 0.6,
                "line-dasharray": [2, 2],
              }}
            />
          </Source>

          {/* Fuente sin clustering para el heatmap (bajo zoom). */}
          <Source id="accidents-heat" type="geojson" data={accidentsGeoJSON}>
            <Layer
              id="accidents-heat-layer"
              type="heatmap"
              maxzoom={HEATMAP_MAX_ZOOM_STOP}
              paint={{
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "intensidad"],
                  1,
                  0.4,
                  2,
                  0.75,
                  3,
                  1,
                ],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  0.6,
                  9,
                  1,
                  13,
                  2.5,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(0, 0, 255, 0)",
                  0.15,
                  "rgba(56, 189, 248, 0.5)",
                  0.35,
                  "rgba(250, 204, 21, 0.8)",
                  0.6,
                  "rgba(249, 115, 22, 0.9)",
                  0.85,
                  "rgba(220, 38, 38, 0.95)",
                  1,
                  "rgba(127, 29, 29, 1)",
                ],
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  6,
                  9,
                  20,
                  13,
                  40,
                ],
                "heatmap-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  HEATMAP_FADE_ZOOM,
                  0.85,
                  HEATMAP_MAX_ZOOM_STOP,
                  0,
                ],
              }}
            />
          </Source>

          {/* Fuente con clustering para conteos por severidad. */}
          <Source
            id="accidents-cluster"
            type="geojson"
            data={accidentsGeoJSON}
            cluster
            clusterRadius={48}
            clusterMaxZoom={CLUSTER_MAX_ZOOM}
            clusterProperties={{
              sev_leve: ["+", ["get", "sev_leve"]],
              sev_moderado: ["+", ["get", "sev_moderado"]],
              sev_grave: ["+", ["get", "sev_grave"]],
              sev_desconocido: ["+", ["get", "sev_desconocido"]],
            }}
          >
            <Layer
              id={CLUSTER_LAYER_ID}
              type="circle"
              filter={["has", "point_count"]}
              minzoom={HEATMAP_FADE_ZOOM - 3}
              maxzoom={CLUSTER_MAX_ZOOM + 1}
              paint={{
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  14,
                  10,
                  18,
                  50,
                  24,
                  200,
                  30,
                ],
                "circle-color": [
                  "case",
                  [">", ["get", "sev_grave"], 0],
                  "#dc2626",
                  [">", ["get", "sev_moderado"], 0],
                  "#f97316",
                  [">", ["get", "sev_leve"], 0],
                  "#facc15",
                  "#94a3b8",
                ],
                // Contadores semitransparentes: dejan ver el heatmap debajo
                // y se desvanecen al acercar, antes de ceder a los puntos.
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  HEATMAP_FADE_ZOOM - 3,
                  0.38,
                  CLUSTER_MAX_ZOOM - 1,
                  0.22,
                  CLUSTER_MAX_ZOOM,
                  0.08,
                ],
                "circle-stroke-width": 1.5,
                "circle-stroke-color": isDark
                  ? "rgba(15, 23, 42, 0.45)"
                  : "rgba(255, 255, 255, 0.55)",
                "circle-stroke-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  HEATMAP_FADE_ZOOM - 3,
                  0.55,
                  CLUSTER_MAX_ZOOM,
                  0.15,
                ],
              }}
            />
            <Layer
              id={CLUSTER_COUNT_LAYER_ID}
              type="symbol"
              filter={["has", "point_count"]}
              minzoom={HEATMAP_FADE_ZOOM - 3}
              maxzoom={CLUSTER_MAX_ZOOM + 1}
              layout={{
                "text-field": ["get", "point_count_abbreviated"],
                "text-size": 12,
                "text-font": ["Noto Sans Regular"],
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": "#ffffff",
                "text-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  HEATMAP_FADE_ZOOM - 3,
                  0.75,
                  CLUSTER_MAX_ZOOM,
                  0.25,
                ],
                "text-halo-color": "rgba(0,0,0,0.35)",
                "text-halo-width": 1,
              }}
            />
            <Layer
              id={UNCLUSTERED_LAYER_ID}
              type="circle"
              filter={["!", ["has", "point_count"]]}
              minzoom={CLUSTER_MAX_ZOOM}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  CLUSTER_MAX_ZOOM,
                  4,
                  15,
                  6,
                  18,
                  9,
                ],
                "circle-color": [
                  "match",
                  ["get", "bucket"],
                  "grave",
                  "#dc2626",
                  "moderado",
                  "#f97316",
                  "leve",
                  "#facc15",
                  "#94a3b8",
                ],
                "circle-stroke-width": 1.5,
                "circle-stroke-color": isDark ? "#0f172a" : "#ffffff",
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  CLUSTER_MAX_ZOOM,
                  0.55,
                  CLUSTER_MAX_ZOOM + 1,
                  0.95,
                ],
              }}
            />
          </Source>

          {/* Mojones kilométricos (referencia geográfica). */}
          {kilometersGeoJSON.features.length > 0 && (
            <Source id="km-markers" type="geojson" data={kilometersGeoJSON}>
              <Layer
                id="km-circles"
                type="circle"
                minzoom={12}
                paint={{
                  "circle-radius": 4,
                  "circle-color": "#06b6d4",
                  "circle-stroke-width": 1.5,
                  "circle-stroke-color": "#ffffff",
                  "circle-opacity": 0.8,
                }}
              />
              <Layer
                id="km-labels"
                type="symbol"
                minzoom={14}
                layout={{
                  "text-field": ["get", "name"],
                  "text-size": 10,
                  "text-offset": [0, 1.3],
                  "text-anchor": "top",
                  "text-font": ["Noto Sans Regular"],
                }}
                paint={{
                  "text-color": isDark ? "#67e8f9" : "#0891b2",
                  "text-halo-color": isDark
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(255,255,255,0.9)",
                  "text-halo-width": 1.2,
                }}
              />
            </Source>
          )}

          {hover ? (
            <Popup
              longitude={hover.lng}
              latitude={hover.lat}
              closeButton={false}
              closeOnClick={false}
              anchor="bottom"
              offset={16}
              className="!p-0"
            >
              {hover.kind === "cluster" ? (
                <ClusterTooltip
                  total={hover.total}
                  severidad={hover.severidad}
                />
              ) : (
                <PointTooltip accident={hover.accident} />
              )}
            </Popup>
          ) : null}
        </Map>

        <Legend
          totalPorBucket={totalPorBucket}
          loading={isLoading}
          activeBuckets={activeBuckets}
          onToggle={toggleBucket}
          onReset={resetBuckets}
          isFilterActive={isFilterActive}
        />
      </div>
    </div>
  );
}

function ClusterTooltip({
  total,
  severidad,
}: {
  total: number;
  severidad: Record<SeverityBucket, number>;
}) {
  const rows: Array<[SeverityBucket, number]> = (
    [
      ["grave", severidad.grave],
      ["moderado", severidad.moderado],
      ["leve", severidad.leve],
      ["desconocido", severidad.desconocido],
    ] as Array<[SeverityBucket, number]>
  ).filter(([, n]) => n > 0);
  return (
    <div className="min-w-[180px] p-2 text-xs text-slate-800">
      <p className="text-sm font-semibold">
        {total.toLocaleString("es-AR")} siniestros
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Clic para ampliar el grupo
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map(([bucket, count]) => (
          <li key={bucket} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[bucket] }}
              />
              {SEVERITY_LABELS[bucket]}
            </span>
            <span className="font-semibold tabular-nums">
              {count.toLocaleString("es-AR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PointTooltip({ accident }: { accident: HeatmapAccident }) {
  const fecha = new Date(accident.accident_at);
  const fechaTxt = Number.isNaN(fecha.getTime())
    ? "Sin fecha"
    : fecha.toLocaleString("es-AR");
  return (
    <div className="min-w-[200px] p-2 text-xs text-slate-800">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: SEVERITY_COLORS[accident.bucket] }}
        />
        <p className="text-sm font-semibold">
          {SEVERITY_LABELS[accident.bucket]}
        </p>
      </div>
      {accident.street ? (
        <p className="mt-1 text-slate-600">{accident.street}</p>
      ) : null}
      <p className="mt-1 text-slate-500">{fechaTxt}</p>
      {accident.severity ? (
        <p className="mt-1 text-slate-500">Severidad Waze: {accident.severity}</p>
      ) : null}
      <p className="mt-1 text-[11px] italic text-slate-400">
        Clic para ver el detalle
      </p>
    </div>
  );
}

function Legend({
  totalPorBucket,
  loading,
  activeBuckets,
  onToggle,
  onReset,
  isFilterActive,
}: {
  totalPorBucket: Record<SeverityBucket, number>;
  loading: boolean;
  activeBuckets: Set<SeverityBucket>;
  onToggle: (bucket: SeverityBucket) => void;
  onReset: () => void;
  isFilterActive: boolean;
}) {
  const order = BUCKET_ORDER;
  const total = order.reduce((acc, k) => acc + (totalPorBucket[k] ?? 0), 0);
  return (
    <aside
      aria-label="Filtro por gravedad del mapa de calor"
      className="pointer-events-auto absolute bottom-4 left-4 z-10 w-64 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 shadow-xl shadow-slate-900/5 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/85 dark:supports-[backdrop-filter]:bg-slate-900/70"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <Filter className="h-3 w-3" aria-hidden="true" />
          Gravedad
        </p>
        {isFilterActive ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-red-400 dark:hover:bg-red-500/10 dark:focus-visible:ring-offset-slate-900"
            aria-label="Restablecer filtro"
          >
            Ver todas
          </button>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            title="Total del período"
          >
            {loading ? "…" : total.toLocaleString("es-AR")}
            <span className="text-slate-400">total</span>
          </span>
        )}
      </div>
      <ul
        role="group"
        aria-label="Toggle de severidades"
        className="space-y-2 text-xs"
      >
        {order.map((bucket) => {
          const count = totalPorBucket[bucket] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = SEVERITY_COLORS[bucket];
          const isActive = activeBuckets.has(bucket);
          return (
            <li key={bucket}>
              <button
                type="button"
                onClick={() => onToggle(bucket)}
                aria-pressed={isActive}
                title={
                  isActive
                    ? `Ocultar ${SEVERITY_LABELS[bucket].toLowerCase()}`
                    : `Mostrar ${SEVERITY_LABELS[bucket].toLowerCase()}`
                }
                className={`w-full rounded-lg px-1.5 py-1 text-left transition-all duration-150 ease-out hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900 ${
                  isActive ? "" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/80 dark:ring-slate-900/80"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 0 1px ${color}55`,
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className={`font-medium ${
                        isActive ? "" : "line-through decoration-dotted"
                      }`}
                    >
                      {SEVERITY_LABELS[bucket]}
                    </span>
                  </span>
                  <span className="inline-flex items-baseline gap-1">
                    <span className="tabular-nums font-semibold">
                      {loading ? "…" : count.toLocaleString("es-AR")}
                    </span>
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {loading || total === 0 ? "" : `· ${pct}%`}
                    </span>
                  </span>
                </div>
                <div
                  className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${SEVERITY_LABELS[bucket]}: ${pct}%`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{
                      width: isActive ? `${pct}%` : "0%",
                      backgroundColor: color,
                    }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {activeBuckets.size === 0 ? (
        <p className="mt-2 rounded-lg bg-slate-100/80 px-2 py-1.5 text-[10px] leading-snug text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
          Ninguna gravedad seleccionada · el mapa queda vacío. Pulsá{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">
            Ver todas
          </span>{" "}
          o reactivá alguna opción.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-1.5 border-t border-slate-200/70 pt-2 text-[10px] leading-snug text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
          <Info
            className="mt-0.5 h-3 w-3 flex-none text-slate-400"
            aria-hidden="true"
          />
          <span>
            Zoom <span className="font-medium">in</span> desagrupa incidentes;
            zoom <span className="font-medium">out</span> los agrupa en
            clústeres.
          </span>
        </p>
      )}
    </aside>
  );
}

export default AccidentsHeatmapPage;
