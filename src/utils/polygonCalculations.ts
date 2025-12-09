import type { Polygon, Incident, TrafficJam, PolygonStats } from '../types';
import { PolygonState, Severity } from '../types';

/**
 * Utilidades para cálculos relacionados con polígonos
 * Optimizado para performance con memoización cuando sea necesario
 */

/**
 * Determina el estado de un polígono basado en incidentes y atascos
 */
export const calculatePolygonState = (
    polygon: Polygon,
    incidents: Incident[],
    jams: TrafficJam[]
): PolygonState => {
    const polygonIncidents = incidents.filter(inc => inc.polygonId === polygon.id);
    const polygonJams = jams.filter(jam => jam.polygonId === polygon.id);

    // Si hay incidentes críticos o atascos críticos -> HIGH
    const hasCritical =
        polygonIncidents.some(inc => inc.severity === Severity.CRITICAL) ||
        polygonJams.some(jam => jam.severity === Severity.CRITICAL);

    if (hasCritical) return PolygonState.HIGH;

    // Si hay incidentes HIGH o múltiples MEDIUM -> HIGH
    const hasHighIncidents = polygonIncidents.some(inc => inc.severity === Severity.HIGH);
    const mediumIncidents = polygonIncidents.filter(inc => inc.severity === Severity.MEDIUM).length;
    const highJams = polygonJams.filter(jam => jam.severity === Severity.HIGH).length;

    if (hasHighIncidents || highJams > 0 || mediumIncidents >= 2) {
        return PolygonState.HIGH;
    }

    // Si hay algún incidente o atasco medium -> MEDIUM
    const hasMedium =
        polygonIncidents.some(inc => inc.severity === Severity.MEDIUM) ||
        polygonJams.some(jam => jam.severity === Severity.MEDIUM);

    if (hasMedium || polygonIncidents.length > 0 || polygonJams.length > 0) {
        return PolygonState.MEDIUM;
    }

    // Sin incidentes ni atascos -> LOW (fluido)
    return PolygonState.LOW;
};

/**
 * Actualiza todos los polígonos con su estado calculado
 */
export const updatePolygonStates = (
    polygons: Polygon[],
    incidents: Incident[],
    jams: TrafficJam[]
): Polygon[] => {
    return polygons.map(polygon => ({
        ...polygon,
        state: calculatePolygonState(polygon, incidents, jams),
    }));
};

/**
 * Calcula estadísticas completas de un polígono
 */
export const calculatePolygonStats = (
    polygon: Polygon,
    incidents: Incident[],
    jams: TrafficJam[]
): PolygonStats => {
    const polygonIncidents = incidents.filter(inc => inc.polygonId === polygon.id);
    const polygonJams = jams.filter(jam => jam.polygonId === polygon.id);

    const criticalIncidents = polygonIncidents.filter(
        inc => inc.severity === Severity.CRITICAL || inc.severity === Severity.HIGH
    ).length;

    const averageSpeed = polygonJams.length > 0
        ? polygonJams.reduce((sum, jam) => sum + jam.speed, 0) / polygonJams.length
        : null;

    const totalDelay = polygonJams.reduce((sum, jam) => sum + jam.delay, 0);

    return {
        polygonId: polygon.id,
        totalIncidents: polygonIncidents.length,
        criticalIncidents,
        averageSpeed,
        totalDelay,
        state: calculatePolygonState(polygon, incidents, jams),
        lastUpdate: new Date(),
    };
};

/**
 * Verifica si un punto está dentro de un polígono (algoritmo ray-casting)
 */
export const isPointInPolygon = (
    point: { lat: number; lng: number },
    polygon: Polygon
): boolean => {
    const { lat, lng } = point;
    const coords = polygon.geometry.coordinates[0];

    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const [xi, yi] = coords[i];
        const [xj, yj] = coords[j];

        const intersect = ((yi > lat) !== (yj > lat))
            && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
};

/**
 * Obtiene el color del polígono según su estado
 */
export const getPolygonColor = (state: PolygonState): string => {
    switch (state) {
        case PolygonState.LOW:
            return '#22c55e'; // Verde
        case PolygonState.MEDIUM:
            return '#eab308'; // Amarillo
        case PolygonState.HIGH:
            return '#ef4444'; // Rojo
        default:
            return '#9ca3af'; // Gris por defecto
    }
};

/**
 * Obtiene la opacidad del polígono para el fill
 */
export const getPolygonOpacity = (state: PolygonState): number => {
    switch (state) {
        case PolygonState.LOW:
            return 0.2;
        case PolygonState.MEDIUM:
            return 0.35;
        case PolygonState.HIGH:
            return 0.5;
        default:
            return 0.15;
    }
};

/**
 * Formatea el delay en texto legible
 */
export const formatDelay = (delayInSeconds: number): string => {
    if (delayInSeconds < 60) {
        return `${delayInSeconds}s`;
    }
    const minutes = Math.floor(delayInSeconds / 60);
    const seconds = delayInSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

/**
 * Ordena polígonos por severidad (críticos primero)
 */
export const sortPolygonsBySeverity = (polygons: Polygon[]): Polygon[] => {
    const order = {
        [PolygonState.HIGH]: 0,
        [PolygonState.MEDIUM]: 1,
        [PolygonState.LOW]: 2,
    };

    return [...polygons].sort((a, b) => order[a.state] - order[b.state]);
};
