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
 * Obtiene el color del polígono (color único genérico)
 */
export const getPolygonColor = (state: PolygonState): string => {
    // Color único genérico para todos los polígonos
    return '#3b82f6'; // Azul genérico
};

/**
 * Obtiene la opacidad del polígono (opacidad fija)
 */
export const getPolygonOpacity = (state: PolygonState): number => {
    // Opacidad fija para todos los polígonos
    return 0.3;
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

