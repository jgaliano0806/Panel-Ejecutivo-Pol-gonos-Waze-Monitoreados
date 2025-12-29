/**
 * Configuración REAL de Polígonos de Waze
 * 67 Managed Areas con sus URLs individuales del feed de incidentes Y feeds TVT
 */

export interface RealPolygonConfig {
    id: string;
    name: string;
    feedUrl: string; // Feed de incidentes (alerts + jams)
    tvtFeedUrl?: string; // Feed TVT (Travel Time Traffic) - Opcional
    group?: string; // Se puede categorizar después
    coordinates?: { // Coordenadas aproximadas del centro del polígono
        lat: number;
        lon: number;
    };
}

import { realCordobaPolygons } from '../../src/data/mock/realCordobaPolygons';

/**
 * Función para calcular el centro de un polígono GeoJSON
 */
function calculatePolygonCenter(coordinates: number[][][]): { lat: number; lon: number } {
    if (!coordinates || coordinates.length === 0) {
        return { lat: -31.4201, lon: -64.1888 }; // Centro de Córdoba como fallback
    }

    const ring = coordinates[0]; // Primer anillo del polígono
    let sumLat = 0;
    let sumLon = 0;

    ring.forEach(coord => {
        sumLon += coord[0]; // lng
        sumLat += coord[1]; // lat
    });

    return {
        lat: sumLat / ring.length,
        lon: sumLon / ring.length
    };
}

/**
 * Convertir polígonos mock a configuración del backend con coordenadas calculadas
 */
export const REAL_POLYGONS: RealPolygonConfig[] = realCordobaPolygons.map(polygon => {
    const center = calculatePolygonCenter(polygon.geometry.coordinates);

    return {
        id: polygon.id,
        name: polygon.name,
        group: polygon.group || 'Sin Grupo',
        coordinates: {
            lat: center.lat,
            lon: center.lon
        },
        feedUrl: `https://www.waze.com/row-partnerhub-api/feeds?polygon_id=${polygon.id}`,
        tvtFeedUrl: `https://www.waze.com/row-partnerhub-api/tvt?polygon_id=${polygon.id}`
    };
});

// Helper para obtener polígono por ID
export const getRealPolygonById = (id: string): RealPolygonConfig | undefined => {
    return REAL_POLYGONS.find(p => p.id === id);
};

// Helper para obtener todos los IDs
export const getAllPolygonIds = (): string[] => {
    return REAL_POLYGONS.map(p => p.id);
};

// Helper para obtener todos los grupos únicos
export const getAllGroups = (): string[] => {
    const groups = new Set(REAL_POLYGONS.map(p => p.group || 'Sin Grupo'));
    return Array.from(groups).sort();
};

// Helper para obtener polígonos por grupo
export const getPolygonsByGroup = (group: string): RealPolygonConfig[] => {
    return REAL_POLYGONS.filter(p => p.group === group);
};

// Estadísticas de la configuración
export const POLYGON_STATS = {
    total: REAL_POLYGONS.length,
    groups: getAllGroups(),
    groupCount: getAllGroups().length,
    withTVT: REAL_POLYGONS.filter(p => p.tvtFeedUrl).length,
};
