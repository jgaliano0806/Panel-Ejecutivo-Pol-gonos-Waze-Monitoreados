import React from 'react';
import { AlertTriangle, Activity, TrendingUp, MapPin } from 'lucide-react';

interface GroupStat {
    group: string;
    polygonCount: number;
    alertCount: number;
    jamCount: number;
    criticalCount: number;
    fluidCount: number;
}

interface GroupStatsProps {
    stats: GroupStat[];
}

export const GroupStats: React.FC<GroupStatsProps> = ({ stats }) => {
    if (!stats || stats.length === 0) {
        return null;
    }

    // Ordenar por criticidad (más alertas + jams primero)
    const sortedStats = [...stats].sort((a, b) => {
        const aTotal = a.alertCount + a.jamCount;
        const bTotal = b.alertCount + b.jamCount;
        return bTotal - aTotal;
    });

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Estadísticas por Grupo
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {sortedStats.map((stat) => {
                    const totalIssues = stat.alertCount + stat.jamCount;
                    const fluidityPercent = stat.polygonCount > 0 
                        ? Math.round((stat.fluidCount / stat.polygonCount) * 100) 
                        : 0;
                    
                    return (
                        <div 
                            key={stat.group} 
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900 text-sm">{stat.group}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {stat.polygonCount} {stat.polygonCount === 1 ? 'polígono' : 'polígonos'}
                                    </p>
                                </div>
                                
                                {/* Badge de fluidez */}
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    fluidityPercent >= 80 
                                        ? 'bg-green-100 text-green-800' 
                                        : fluidityPercent >= 50 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {fluidityPercent}% fluido
                                </div>
                            </div>
                            
                            {/* Métricas */}
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <div className="bg-red-50 rounded px-2 py-1.5 text-center">
                                    <div className="text-lg font-bold text-red-700">{stat.alertCount}</div>
                                    <div className="text-xs text-red-600">Incidentes</div>
                                </div>
                                <div className="bg-orange-50 rounded px-2 py-1.5 text-center">
                                    <div className="text-lg font-bold text-orange-700">{stat.jamCount}</div>
                                    <div className="text-xs text-orange-600">Atascos</div>
                                </div>
                                <div className="bg-purple-50 rounded px-2 py-1.5 text-center">
                                    <div className="text-lg font-bold text-purple-700">{stat.criticalCount}</div>
                                    <div className="text-xs text-purple-600">Críticos</div>
                                </div>
                            </div>
                            
                            {/* Barra de progreso */}
                            {totalIssues > 0 && (
                                <div className="mt-3">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                                            style={{ width: `${Math.min((totalIssues / 20) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

