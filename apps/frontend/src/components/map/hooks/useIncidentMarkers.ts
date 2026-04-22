/**
 * useIncidentMarkers.ts — Hook para gestionar marcadores HTML de incidentes
 * en el mapa MapLibre.
 *
 * Optimizaciones respecto al código original en MapLibreMap.tsx:
 * - Cachea iconSrc por type+subtype para evitar encodeURIComponent repetido
 * - Usa firma (signature) para skip updates innecesarios
 * - Limpia marcadores huérfanos eficientemente
 */
import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { MapRef } from "react-map-gl/maplibre";
import type { Incident } from "../../../types";
import {
  getWazePartnerHubIconUrl,
  getWazeIconSvg,
} from "../../../utils/wazeIcons";

interface UseIncidentMarkersOptions {
  mapRef: React.RefObject<MapRef>;
  mapLoaded: boolean;
  showWazeIncidents: boolean;
  incidents: Incident[];
  isDark: boolean;
  onIncidentClick: (incident: Incident) => void;
  applyPulseToMarker: (markerId: string | null) => void;
}

/** Caché de iconos por type+subtype para evitar encodeURIComponent repetido. */
const iconSrcCache = new Map<string, { src: string; dataUri: string }>();

function getIconSrc(type: string, subtype?: string): { src: string; dataUri: string } {
  const cacheKey = `${type}|${subtype ?? ""}`;
  const cached = iconSrcCache.get(cacheKey);
  if (cached) return cached;

  const iconUrl = getWazePartnerHubIconUrl(type, subtype);
  const svgContent = getWazeIconSvg(type, subtype);
  const encodedSvg = encodeURIComponent(svgContent);
  const dataUri = `data:image/svg+xml;utf8,${encodedSvg}`;
  const src = iconUrl || dataUri;

  const result = { src, dataUri };
  iconSrcCache.set(cacheKey, result);
  return result;
}

/**
 * Hook que gestiona la creación, actualización y limpieza de marcadores
 * HTML de incidentes Waze en el mapa MapLibre.
 *
 * Devuelve la referencia al Map<string, Marker> para uso externo
 * (ej: pulse de notificaciones).
 */
export function useIncidentMarkers({
  mapRef,
  mapLoaded,
  showWazeIncidents,
  incidents,
  isDark,
  onIncidentClick,
  applyPulseToMarker,
}: UseIncidentMarkersOptions): React.RefObject<Map<string, maplibregl.Marker>> {
  const markersMapRef = useRef(new window.Map<string, maplibregl.Marker>());
  /** Siempre el feed actual para clics en marcadores (evita cierres obsoletos). */
  const incidentsLatestRef = useRef(incidents);
  incidentsLatestRef.current = incidents;

  // Referencia estable al callback de click
  const onClickRef = useRef(onIncidentClick);
  onClickRef.current = onIncidentClick;

  const pulseRef = useRef(applyPulseToMarker);
  pulseRef.current = applyPulseToMarker;

  useEffect(() => {
    const markersMap = markersMapRef.current;

    if (!mapLoaded || !showWazeIncidents) {
      markersMap.forEach((m) => m.remove());
      markersMap.clear();
      return;
    }
    const map = mapRef.current?.getMap?.() as unknown as maplibregl.Map | undefined;
    if (!map) return;

    const currentIds = new Set(incidents.map((i) => i.id));

    // Limpiar marcadores de incidentes que ya no existen
    markersMap.forEach((m, id) => {
      if (!currentIds.has(id)) {
        m.remove();
        markersMap.delete(id);
      }
    });

    // Crear o actualizar marcadores
    incidents.forEach((inc) => {
      const { src, dataUri } = getIconSrc(inc.type, inc.subtype);
      const sig = `${inc.type}|${inc.subtype ?? ""}|${inc.location.lng}|${inc.location.lat}|${src}`;

      const existing = markersMap.get(inc.id);
      if (existing) {
        existing.setLngLat([inc.location.lng, inc.location.lat]);
        const el = existing.getElement();
        if (el.getAttribute("data-waze-sig") === sig) return;
        el.setAttribute("data-waze-sig", sig);
        el.setAttribute(
          "aria-label",
          `Incidente: ${inc.type}${inc.subtype ? `, ${inc.subtype}` : ""}`,
        );
        const img = el.querySelector("img");
        if (img) {
          img.onerror = () => {
            img.onerror = null;
            img.src = dataUri;
          };
          img.src = src;
        }
        return;
      }

      // Crear nuevo marcador
      const el = document.createElement("div");
      el.setAttribute("data-waze-sig", sig);
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
          />
        </div>
      `;
      const imgNew = el.querySelector("img");
      if (imgNew) {
        imgNew.onerror = () => {
          imgNew.onerror = null;
          imgNew.src = dataUri;
        };
      }

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

      const incidentId = inc.id;
      const handleActivate = () => {
        const cur = incidentsLatestRef.current.find((i) => i.id === incidentId);
        if (!cur?.location) return;
        pulseRef.current(inc.id);
        onClickRef.current(cur);
        map.flyTo({
          center: [cur.location.lng, cur.location.lat],
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
  }, [mapLoaded, showWazeIncidents, incidents, isDark, mapRef]);

  return markersMapRef;
}
