---
description: leaflet-map Configurar mapa base Leaflet
---

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: LatLngTuple = [-31.4135, -64.1811]; // Córdoba
const DEFAULT_ZOOM = 12;

export function MapView() {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Layers */}
      <PolygonsLayer />
      <WazeAlertsLayer />
      <RiskHeatmap />
    </MapContainer>
  );
}
Importante:

Importar leaflet.css
Parent div debe tener height fija
useMap() hook dentro de MapContainer
Cleanup layers en useEffect
