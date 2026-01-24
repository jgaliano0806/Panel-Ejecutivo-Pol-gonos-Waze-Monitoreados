import React from 'react';
import { AlertTriangle, Navigation } from 'lucide-react';

interface CriticalPolygon {
    id: string;
    name: string;
    group: string;
    state: 'low' | 'medium' | 'high';
    alertCount: number;
    jamCount: number;
}

interface TopCriticalProps {
    polygons: CriticalPolygon[];
    onPolygonClick?: (id: string) => void;
}

export const TopCritical: React.FC<TopCriticalProps> = ({ polygons, onPolygonClick }) => {
    if (!polygons || polygons.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Polígonos Críticos
                </h2>
                <div className="text-center py-8 text-gray-500">
                    <p>✅ No hay polígonos críticos en este momento</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Top Polígonos Críticos
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {polygons.map((poly, index) => {
                    const stateColors = {
                        high: 'border-red-300 bg-red-50',
                        medium: 'border-yellow-300 bg-yellow-50',
                        low: 'border-green-300 bg-green-50'
                    };

                    const stateBadgeColors = {
                        high: 'bg-red-600 text-white',
                        medium: 'bg-yellow-600 text-white',
                        low: 'bg-green-600 text-white'
                    };

                    const totalIssues = poly.alertCount + poly.jamCount;

                    return (
                        <div 
                            key={poly.id}
                            onClick={() => onPolygonClick?.(poly.id)}
                            className={`border-2 rounded-lg p-3 ${stateColors[poly.state]} hover:shadow-md transition-all cursor-pointer`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-2 flex-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        index < 3 
                                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md' 
                                            : 'bg-gray-300 text-gray-700'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                                            {poly.name}
                                        </h3>
                                        <p className="text-xs text-gray-600 mt-0.5">{poly.group}</p>
                                    </div>
                                </div>
                                
                                <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${stateBadgeColors[poly.state]}`}>
                                    {poly.state === 'high' ? 'Alto' : poly.state === 'medium' ? 'Medio' : 'Bajo'}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="font-semibold text-red-700">{poly.alertCount}</span>
                                    <span className="text-xs text-gray-600">alertas</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <span className="font-semibold text-orange-700">{poly.jamCount}</span>
                                    <span className="text-xs text-gray-600">atascos</span>
                                </div>
                                <div className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                    <Navigation className="w-3 h-3" />
                                    <span>Ver</span>
                                </div>
                            </div>
                            
                            {/* Indicador visual de intensidad */}
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-300 ${
                                        poly.state === 'high' 
                                            ? 'bg-gradient-to-r from-red-600 to-red-800' 
                                            : poly.state === 'medium'
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
                                            : 'bg-gradient-to-r from-green-500 to-green-600'
                                    }`}
                                    style={{ width: `${Math.min((totalIssues / 10) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

