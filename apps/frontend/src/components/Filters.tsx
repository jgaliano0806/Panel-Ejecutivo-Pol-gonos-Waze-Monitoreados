import React, { useMemo } from 'react';
import type { Polygon } from '../types';
import { getPolygonGroups } from '../utils/polygonHelpers';

interface FiltersProps {
    polygons: Polygon[];
    selectedPolygon: string | null;
    selectedGroup: string | null;
    onPolygonChange: (polygonId: string | null) => void;
    onGroupChange: (group: string | null) => void;
}

const Filters: React.FC<FiltersProps> = ({
    polygons,
    selectedPolygon,
    selectedGroup,
    onPolygonChange,
    onGroupChange,
}) => {
    // Calcular grupos únicos desde los polígonos reales y ordenarlos alfabéticamente
    const polygonGroups = useMemo(() => getPolygonGroups(polygons).sort(), [polygons]);

    const filteredPolygons = selectedGroup
        ? polygons.filter(p => p.group === selectedGroup).sort((a, b) => a.name.localeCompare(b.name))
        : polygons.sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
                <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Filtros:</span>
                </div>

                {/* Filtro por Grupo */}
                <div className="flex-1">
                    <select
                        value={selectedGroup || ''}
                        onChange={(e) => {
                            const value = e.target.value || null;
                            onGroupChange(value);
                            onPolygonChange(null); // Reset polygon selection
                        }}
                        className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        <option value="">Todos los grupos</option>
                        {polygonGroups.map(group => (
                            <option key={group} value={group}>
                                {group}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro por Polígono Individual */}
                <div className="flex-1">
                    <select
                        value={selectedPolygon || ''}
                        onChange={(e) => {
                            const value = e.target.value || null;
                            onPolygonChange(value);
                        }}
                        className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        <option value="">Seleccionar polígono</option>
                        {filteredPolygons.map(polygon => (
                            <option key={polygon.id} value={polygon.id}>
                                {polygon.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Clear Filters Button */}
                {(selectedPolygon || selectedGroup) && (
                    <button
                        onClick={() => {
                            onPolygonChange(null);
                            onGroupChange(null);
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Limpiar filtros
                    </button>
                )}

                {/* Count */}
                <div className="text-sm text-gray-500">
                    {filteredPolygons.length} de {polygons.length} polígonos
                </div>
            </div>
        </div>
    );
};

export default Filters;
