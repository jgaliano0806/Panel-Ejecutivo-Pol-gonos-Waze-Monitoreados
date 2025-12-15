import type { Polygon } from '../types';

/**
 * Utilidades para trabajar con polígonos
 * Estas funciones ahora trabajan con los datos reales del backend
 */

/**
 * Busca un polígono por ID en un array de polígonos
 */
export const getPolygonById = (polygons: Polygon[], id: string): Polygon | undefined => {
    return polygons.find(p => p.id === id);
};

/**
 * Obtiene todos los grupos únicos de un array de polígonos
 */
export const getPolygonGroups = (polygons: Polygon[]): string[] => {
    return Array.from(new Set(polygons.map(p => p.group)));
};

