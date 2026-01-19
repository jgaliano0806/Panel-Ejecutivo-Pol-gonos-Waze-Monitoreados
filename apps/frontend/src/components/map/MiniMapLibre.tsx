import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import { useThemeStore } from "../../stores/useThemeStore";
import {
  getWazeIconSvg,
  getWazePartnerHubIconUrl,
} from "../../utils/wazeIcons";

interface MarkerData {
  lat: number;
  lng: number;
  id?: string;
  popup?: React.ReactNode;
  icon?: string;
  type?: string;
  subtype?: string;
  color?: string;
  size?: number; // pixel diameter
}

// ... (PolygonData and PolylineData interfaces unchanged)

interface PolygonData {
  id?: string;
  points: [number, number][]; // [lat, lng]
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
}

interface PolylineData {
  id?: string;
  points: [number, number][]; // [lat, lng]
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: number[];
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "bevel" | "round" | "miter";
}

interface MiniMapLibreProps {
  center: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  polygons?: PolygonData[];
  polylines?: PolylineData[];
  height?: string;
  className?: string;
  onMarkerClick?: (marker: MarkerData) => void;
}

/**
 * Componente ligero de MapLibre para modales y minimapas
 * Proporciona funcionalidad básica de mapa sin la complejidad del mapa principal
 */
export const MiniMapLibre: React.FC<MiniMapLibreProps> = ({
  center,
  zoom = 15,
  markers = [],
  polygons = [],
  polylines = [],
  height = "400px",
  className = "",
  onMarkerClick,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const shapesRef = useRef<string[]>([]); // To track added shape source/layer IDs
  const [mapLoaded, setMapLoaded] = useState(false);

  // Obtener tema actual
  const isDark = useThemeStore((state: { isDark: boolean }) => state.isDark);

  // STYLE DINÁMICO (Carto Vector Tiles)
  const mapStyleUrl = isDark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyleUrl, // Usar estilo Carto
      center: [center[1], center[0]], // MapLibre usa [lng, lat]
      zoom: zoom,
      attributionControl: { compact: true },
    });

    // Agregar controles de navegación
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Solo inicializar una vez

  // Actualizar estilo cuando cambia el tema
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyleUrl);
    }
  }, [isDark]);

  // Actualizar centro cuando cambia
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: [center[1], center[0]],
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [center, zoom, mapLoaded]);

  // Actualizar marcadores
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remover marcadores existentes
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Agregar nuevos marcadores
    markers.forEach((markerData) => {
      if (!map.current) return;

      const markerSize =
        markerData.size || (markerData.icon || markerData.type ? 40 : 30);

      // Crear elemento HTML para el marcador
      const el = document.createElement("div");
      el.className = "custom-mini-marker";
      el.style.width = `${markerSize}px`;
      el.style.height = `${markerSize}px`;
      el.style.cursor = "pointer";

      // Si es un círculo simple (sin icono), centrarlo mejor
      if (!markerData.icon && !markerData.type) {
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
      }

      // Si hay type/subtype, generar SVG local o URL
      if (markerData.type) {
        const iconUrl = getWazePartnerHubIconUrl(
          markerData.type,
          markerData.subtype
        );
        const svgContent = getWazeIconSvg(markerData.type, markerData.subtype);
        const encodedSvg = encodeURIComponent(svgContent);
        const dataUri = `data:image/svg+xml;utf8,${encodedSvg}`;

        // Usar URL primaria, fallback a SVG inline
        const src = iconUrl || dataUri;

        el.innerHTML = `
          <div class="waze-marker-icon" style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">
            <img
              src="${src}"
              alt="${markerData.subtype || markerData.type}"
              style="width: 100%; height: 100%; object-fit: contain;"
              onerror="this.onerror=null; this.src='${dataUri}';"
            />
          </div>
        `;
      }
      // Si hay icono personalizado clásico (URL explícita)
      else if (markerData.icon) {
        el.innerHTML = `
          <div class="waze-marker-icon" style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: 3px solid ${markerData.color || "#eab308"};
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <img
              src="${markerData.icon}"
              alt="marker"
              style="width: ${Math.round(
                markerSize * 0.55
              )}px; height: ${Math.round(
          markerSize * 0.55
        )}px; object-fit: contain;"
              onerror="this.onerror=null; this.src='https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons/alerts/hazard.svg';"
            />
          </div>
        `;
      } else {
        // Marcador por defecto
        el.innerHTML = `
          <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            background: ${markerData.color || "#3b82f6"};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            opacity: 0.8;
          "></div>
        `;
      }

      // Crear marcador
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current);

      // Agregar popup si existe
      if (markerData.popup) {
        const popupContainer = document.createElement("div");

        // Usar createRoot de React 18
        const root = createRoot(popupContainer);

        // Envolver en un contenedor con estilos básicos para el tema
        root.render(
          <div className={isDark ? "dark" : ""}>
            <div className={`${isDark ? "text-gray-100" : "text-gray-800"}`}>
              {markerData.popup}
            </div>
          </div>
        );

        const popup = new maplibregl.Popup({
          offset: 25,
          className: isDark ? "dark-popup" : "", // Clase para estilos globales si existen
          closeButton: false, // Opcional: quitar botón de cierre si se prefiere
        }).setDOMContent(popupContainer);

        // Hack para estilos oscuros directos en el DOM del popup (ya que css global puede no estar)
        if (isDark) {
          popup.on("open", () => {
            const content = popup
              .getElement()
              .querySelector(".maplibregl-popup-content");
            if (content instanceof HTMLElement) {
              content.style.backgroundColor = "#2a3042"; // veltrix-card
              content.style.borderColor = "#32394e";
              content.style.color = "#fff";
            }
            const tip = popup
              .getElement()
              .querySelector(".maplibregl-popup-tip");
            if (tip instanceof HTMLElement) {
              tip.style.borderTopColor = "#2a3042";
            }
          });
        }

        marker.setPopup(popup);
      }

      // Evento click
      if (onMarkerClick) {
        el.addEventListener("click", () => {
          onMarkerClick(markerData);
        });
      }

      markersRef.current.push(marker);
    });

    // Ajustar vista si es necesario (si hay marcadores pero no shapes, o si se desea auto-zoom)
    // Por ahora mantenemos comportamiento simple: fitBounds si hay markers > 1
    if (
      markers.length > 1 &&
      map.current &&
      polygons.length === 0 &&
      polylines.length === 0
    ) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((m) => {
        bounds.extend([m.lng, m.lat]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [markers, mapLoaded, onMarkerClick]);

  // Actualizar Polígonos y Polilíneas
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Limpiar shapes anteriores
    shapesRef.current.forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });
    shapesRef.current = [];

    // Renderizar Polígonos
    polygons.forEach((poly, index) => {
      if (!map.current) return;
      const id = poly.id || `polygon-${index}`;
      const sourceId = `source-${id}`;

      const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [poly.points.map((p) => [p[1], p[0]])], // [lng, lat]
        },
      };

      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      // Layer de relleno
      map.current.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: sourceId,
        layout: {},
        paint: {
          "fill-color": poly.fillColor || poly.color || "#3b82f6",
          "fill-opacity": poly.fillOpacity || 0.2,
        },
      });

      // Layer de borde
      map.current.addLayer({
        id: `${id}-line`,
        type: "line",
        source: sourceId,
        layout: {},
        paint: {
          "line-color": poly.color || "#3b82f6",
          "line-width": poly.weight || 3,
        },
      });

      shapesRef.current.push(`${id}-fill`, `${id}-line`, sourceId);
    });

    // Renderizar Polilíneas
    polylines.forEach((line, index) => {
      if (!map.current) return;
      const id = line.id || `polyline-${index}`;
      const sourceId = `source-${id}`;

      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: line.points.map((p) => [p[1], p[0]]), // [lng, lat]
        },
      };

      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.current.addLayer({
        id: id,
        type: "line",
        source: sourceId,
        layout: {
          "line-cap": line.lineCap || "round",
          "line-join": line.lineJoin || "round",
        },
        paint: {
          "line-color": line.color || "#3b82f6",
          "line-width": line.weight || 3,
          "line-opacity": line.opacity || 1.0,
          "line-dasharray": line.dashArray || undefined,
        },
      });

      shapesRef.current.push(id, sourceId);
    });
  }, [polygons, polylines, mapLoaded]);

  return (
    <div
      ref={mapContainer}
      className={`mini-maplibre-container ${className}`}
      style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
    />
  );
};
