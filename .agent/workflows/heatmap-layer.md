---
description: heatmap-layer Capa heatmap de riesgos
---

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface RiskHeatmapProps {
  scores: Array<{ lat: number; lon: number; score: number }>;
  visible?: boolean;
}

export function RiskHeatmap({ scores, visible = true }: RiskHeatmapProps) {
  const map = useMap();

  useEffect(() => {
    if (!visible || !scores.length) return;

    const heatData = scores.map(s => [
      s.lat,
      s.lon,
      s.score / 100  // Normalizar 0-1
    ] as [number, number, number]);

    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 35,
      maxZoom: 13,
      gradient: {
        0.0: '#22c55e',  // LOW - verde
        0.2: '#84cc16',  //
        0.4: '#eab308',  // MODERATE - amarillo
        0.6: '#f97316',  // HIGH - naranja
        0.8: '#ef4444',  // CRITICAL - rojo
        1.0: '#991b1b',  // SEVERE - rojo oscuro
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, scores, visible]);

  return null;
}
Configuración:

radius: 25px de influencia
blur: 35 para suavizar
maxZoom: 13 (no mostrar en zoom muy cercano)
