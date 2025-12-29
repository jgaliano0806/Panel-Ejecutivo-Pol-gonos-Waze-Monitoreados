import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import { useDailyStats, useWeeklyStats, useMonthlyStats } from '../hooks/useDailyStats';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

type Period = 'daily' | 'weekly' | 'monthly';

export const StatsPage: React.FC = () => {
    const [period, setPeriod] = useState<Period>('daily');
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    const { data: dailyData } = useDailyStats(dateRange.from, dateRange.to);
    const { data: weeklyData } = useWeeklyStats(dateRange.from, dateRange.to);
    const { data: monthlyData } = useMonthlyStats(dateRange.from, dateRange.to);

    const currentData = period === 'daily' ? dailyData : period === 'weekly' ? weeklyData : monthlyData;

    const fluidityChartData = {
        labels: currentData?.map(d => {
            if ('date' in d) return new Date(d.date).toLocaleDateString();
            if ('week' in d) return new Date(d.week).toLocaleDateString();
            if ('month' in d) return new Date(d.month).toLocaleDateString('es', { year: 'numeric', month: 'short' });
            return '';
        }) || [],
        datasets: [
            {
                label: 'Fluidez (%)',
                data: currentData?.map(d => d.avg_fluidity || 0) || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }
        ]
    };

    const speedChartData = {
        labels: currentData?.map(d => {
            if ('date' in d) return new Date(d.date).toLocaleDateString();
            if ('week' in d) return new Date(d.week).toLocaleDateString();
            if ('month' in d) return new Date(d.month).toLocaleDateString('es', { year: 'numeric', month: 'short' });
            return '';
        }) || [],
        datasets: [
            {
                label: 'Velocidad Promedio (km/h)',
                data: currentData?.map(d => d.avg_speed || 0) || [],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }
        ]
    };

    const incidentsChartData = {
        labels: currentData?.map(d => {
            if ('date' in d) return new Date(d.date).toLocaleDateString();
            if ('week' in d) return new Date(d.week).toLocaleDateString();
            if ('month' in d) return new Date(d.month).toLocaleDateString('es', { year: 'numeric', month: 'short' });
            return '';
        }) || [],
        datasets: [
            {
                label: 'Total Incidentes',
                data: currentData?.map(d => d.total_incidents || 0) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
            },
            {
                label: 'Total Congestiones',
                data: currentData?.map(d => d.total_jams || 0) || [],
                backgroundColor: 'rgba(251, 146, 60, 0.7)',
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    const latestStats = dailyData?.[0];
    const previousStats = dailyData?.[1];

    const calculateChange = (current?: number, previous?: number) => {
        if (!current || !previous) return null;
        return ((current - previous) / previous) * 100;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
                    <p className="text-gray-500 mt-1">Análisis de tendencias y métricas</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as Period)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                    </select>
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* KPIs del último día */}
            {latestStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Fluidez Promedio</span>
                            {calculateChange(latestStats.avg_fluidity_percentage, previousStats?.avg_fluidity_percentage) !== null && (
                                <div className={`flex items-center text-xs ${
                                    calculateChange(latestStats.avg_fluidity_percentage, previousStats?.avg_fluidity_percentage)! > 0
                                        ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {calculateChange(latestStats.avg_fluidity_percentage, previousStats?.avg_fluidity_percentage)! > 0
                                        ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
                                    }
                                    {Math.abs(calculateChange(latestStats.avg_fluidity_percentage, previousStats?.avg_fluidity_percentage)!).toFixed(1)}%
                                </div>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {latestStats.avg_fluidity_percentage?.toFixed(1)}%
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Velocidad Promedio</span>
                            {calculateChange(latestStats.avg_speed, previousStats?.avg_speed) !== null && (
                                <div className={`flex items-center text-xs ${
                                    calculateChange(latestStats.avg_speed, previousStats?.avg_speed)! > 0
                                        ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {calculateChange(latestStats.avg_speed, previousStats?.avg_speed)! > 0
                                        ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
                                    }
                                    {Math.abs(calculateChange(latestStats.avg_speed, previousStats?.avg_speed)!).toFixed(1)}%
                                </div>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {latestStats.avg_speed?.toFixed(0)} km/h
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Total Incidentes</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {latestStats.total_incidents}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {latestStats.critical_incidents} críticos
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Total Congestiones</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {latestStats.total_jams}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {latestStats.avg_jam_duration_minutes?.toFixed(0)} min promedio
                        </div>
                    </div>
                </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Tendencia de Fluidez</h2>
                    </div>
                    <div style={{ height: '300px' }}>
                        <Line data={fluidityChartData} options={chartOptions} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Velocidad Promedio</h2>
                    </div>
                    <div style={{ height: '300px' }}>
                        <Line data={speedChartData} options={chartOptions} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-red-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Incidentes y Congestiones</h2>
                    </div>
                    <div style={{ height: '300px' }}>
                        <Bar data={incidentsChartData} options={chartOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
};



