import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

// Declaración de tipos para leaflet.heat
declare module 'leaflet' {
    function heatLayer(
        latlngs: Array<[number, number, number]> | Array<[number, number]>,
        options?: HeatMapOptions
    ): HeatLayer;

    interface HeatMapOptions {
        radius?: number;
        blur?: number;
        maxZoom?: number;
        max?: number;
        minOpacity?: number;
        gradient?: { [key: number]: string };
    }

    interface HeatLayer extends L.Layer {
        setLatLngs(latlngs: Array<[number, number, number]>): this;
        addLatLng(latlng: [number, number, number]): this;
        setOptions(options: HeatMapOptions): this;
        redraw(): this;
    }
}

interface RiskScore {
    lat: number;
    lon: number;
    score: number;
}

interface RiskHeatmapProps {
    scores: RiskScore[];
    visible?: boolean;
    radius?: number;
    blur?: number;
    maxZoom?: number;
}

/**
 * Componente de heatmap de riesgos
 * Visualiza scores de riesgo con gradiente de colores
 */
export function RiskHeatmap({
    scores,
    visible = true,
    radius = 25,
    blur = 35,
    maxZoom = 13
}: RiskHeatmapProps) {
    const map = useMap();
    const heatLayerRef = useRef<L.HeatLayer | null>(null);

    useEffect(() => {
        // Limpiar capa anterior si existe
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }

        // No crear si no es visible o no hay datos
        if (!visible || !scores || scores.length === 0) {
            return;
        }

        // Preparar datos del heatmap [lat, lon, intensity]
        const heatData = scores
            .filter(s =>
                typeof s.lat === 'number' &&
                typeof s.lon === 'number' &&
                typeof s.score === 'number' &&
                !isNaN(s.lat) &&
                !isNaN(s.lon) &&
                !isNaN(s.score)
            )
            .map(s => [
                s.lat,
                s.lon,
                Math.min(Math.max(s.score, 0), 100) / 100  // Normalizar 0-1
            ] as [number, number, number]);

        if (heatData.length === 0) {
            return;
        }

        // Crear capa de calor
        const heat = L.heatLayer(heatData, {
            radius,
            blur,
            maxZoom,
            minOpacity: 0.4,
            gradient: {
                0.0: '#22c55e',  // Verde - Bajo riesgo
                0.2: '#84cc16',  // Verde claro
                0.4: '#eab308',  // Amarillo - Moderado
                0.6: '#f97316',  // Naranja - Alto
                0.8: '#ef4444',  // Rojo - Crítico
                1.0: '#991b1b',  // Rojo oscuro - Severo
            },
        });

        heat.addTo(map);
        heatLayerRef.current = heat;

        // Cleanup al desmontar o cuando cambien las dependencias
        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        };
    }, [map, scores, visible, radius, blur, maxZoom]);

    // Este componente no renderiza nada visible directamente
    return null;
}

export default RiskHeatmap;
