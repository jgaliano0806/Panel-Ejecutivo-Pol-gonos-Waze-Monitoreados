/**
 * Dashboard de Análisis de Riesgos Multifactorial
 * Con filtros por grupo, nivel de riesgo y visualización de tramos individuales
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    TrendingUp,
    Minus,
    ShieldAlert,
    CheckCircle2,
    Filter,
    RefreshCw,
    CloudRain,
    Car,
    Gauge,
    Clock,
    AlertCircle as AlertIcon,
    X,
    MapPin,
    Thermometer,
    Wind,
    Droplets,
    Eye,
} from 'lucide-react';
import {
    useRiskSummary,
    useRiskScores,
    useCalculateAllScores,
    useRiskGroups
} from '../hooks/useRiskScoring';
import { usePolygonWeather } from '../hooks/useWeather';

import type { RiskScore, GroupRiskSummary } from '../hooks/useRiskScoring';

// Traducción de niveles de riesgo
const RISK_LEVEL_LABELS: Record<string, string> = {
    LOW: 'Bajo',
    MODERATE: 'Moderado',
    HIGH: 'Alto',
    CRITICAL: 'Crítico',
    SEVERE: 'Severo',
};

export const RiskDashboard: React.FC = () => {
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedPolygon, setSelectedPolygon] = useState<RiskScore | null>(null);
    const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<'traffic' | 'incidents' | 'weather' | null>(null);
    const [modalPolygonId, setModalPolygonId] = useState<string | null>(null);

    const { data: summaryData, isLoading: summaryLoading } = useRiskSummary();
    const { data: scoresData, isLoading: scoresLoading } = useRiskScores(selectedGroup || undefined);
    const { data: groupsData } = useRiskGroups();
    const calculateMutation = useCalculateAllScores();

    const allGroups = groupsData?.groups || [];

    // Filtrar scores por nivel de riesgo seleccionado
    const filteredScores = useMemo(() => {
        if (!scoresData?.scores) return [];
        if (!selectedRiskLevel) return scoresData.scores;
        return scoresData.scores.filter(s => s.risk_level === selectedRiskLevel);
    }, [scoresData?.scores, selectedRiskLevel]);

    const handleRecalculate = async () => {
        try {
            await calculateMutation.mutateAsync();
        } catch (error) {
            console.error('Error recalculando scores:', error);
        }
    };

    const handleRiskLevelFilter = (level: string | null) => {
        setSelectedRiskLevel(level);
        setSelectedPolygon(null);
    };

    const openFactorModal = (type: 'traffic' | 'incidents' | 'weather', polygonId: string) => {
        setActiveModal(type);
        setModalPolygonId(polygonId);
    };

    if (summaryLoading && !summaryData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando análisis de riesgos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-[1900px] mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-red-500"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">
                                Análisis de Riesgos Multifactorial
                            </h1>
                            <p className="text-gray-600">
                                Sistema de scoring basado en tráfico, incidentes, clima, velocidad y demoras
                            </p>
                        </div>
                        <motion.button
                            onClick={handleRecalculate}
                            disabled={calculateMutation.isPending}
                            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw className={`w-5 h-5 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
                                {calculateMutation.isPending ? 'Calculando...' : 'Recalcular'}
                            </div>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Estado Global de Riesgos - Clickeable */}
                <GlobalRiskOverview
                    summaries={summaryData?.summaries || []}
                    selectedLevel={selectedRiskLevel}
                    onLevelSelect={handleRiskLevelFilter}
                />

                {/* Filtro activo */}
                {selectedRiskLevel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between"
                    >
                        <p className="text-primary-800 font-semibold">
                            Mostrando tramos con riesgo: <span className="font-black">{RISK_LEVEL_LABELS[selectedRiskLevel]}</span>
                            {' '}({filteredScores.length} tramo{filteredScores.length !== 1 ? 's' : ''})
                        </p>
                        <button
                            onClick={() => handleRiskLevelFilter(null)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Quitar filtro
                        </button>
                    </motion.div>
                )}

                {/* Filtros y Vista Principal */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Sidebar: Filtros por Grupo */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="col-span-3 space-y-4"
                    >
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Filter className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-bold text-gray-900">Filtrar por Grupo</h2>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedGroup(null);
                                    setSelectedPolygon(null);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all ${
                                    selectedGroup === null
                                        ? 'bg-primary-100 text-primary-900 font-bold'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Todos los Grupos
                            </button>

                            <div className="space-y-1 max-h-[600px] overflow-y-auto">
                                {allGroups.map((group) => {
                                    const summary = summaryData?.summaries.find(s => s.group_name === group);
                                    return (
                                        <button
                                            key={group}
                                            onClick={() => {
                                                setSelectedGroup(group);
                                                setSelectedPolygon(null);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                                                selectedGroup === group
                                                    ? 'bg-primary-100 text-primary-900 font-bold'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm truncate">{group}</span>
                                                {summary && summary.critical_polygons > 0 && (
                                                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                                                        {summary.critical_polygons}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>

                    {/* Main Content: Lista de Tramos */}
                    <div className="col-span-9 space-y-4">
                        {scoresLoading && !scoresData ? (
                            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
                                <p className="text-gray-600">Cargando datos...</p>
                            </div>
                        ) : (
                            <>
                                {/* Header de tramos */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white rounded-xl shadow-md p-4"
                                >
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {selectedGroup ? `Tramos de ${selectedGroup}` : 'Todos los Tramos'}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {filteredScores.length} tramo(s) {selectedRiskLevel ? `con riesgo ${RISK_LEVEL_LABELS[selectedRiskLevel].toLowerCase()}` : 'monitoreado(s)'}
                                    </p>
                                </motion.div>

                                {/* Lista de tramos */}
                                <div className="grid gap-4">
                                    {filteredScores.length === 0 ? (
                                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                            <p className="text-gray-600 text-lg">
                                                No hay tramos con este nivel de riesgo
                                            </p>
                                        </div>
                                    ) : (
                                        filteredScores.map((score, index) => (
                                            <PolygonRiskCard
                                                key={score.polygon_id}
                                                score={score}
                                                index={index}
                                                isSelected={selectedPolygon?.polygon_id === score.polygon_id}
                                                onClick={() => setSelectedPolygon(score)}
                                                onFactorClick={openFactorModal}
                                            />
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Modales */}
                <AnimatePresence>
                    {activeModal === 'traffic' && modalPolygonId && (
                        <TrafficInfoModal
                            polygonId={modalPolygonId}
                            polygonName={filteredScores.find(s => s.polygon_id === modalPolygonId)?.polygon_name || ''}
                            jamCount={filteredScores.find(s => s.polygon_id === modalPolygonId)?.raw_data?.total_jams || 0}
                            onClose={() => setActiveModal(null)}
                        />
                    )}
                    {activeModal === 'incidents' && modalPolygonId && (
                        <IncidentsInfoModal
                            polygonId={modalPolygonId}
                            polygonName={filteredScores.find(s => s.polygon_id === modalPolygonId)?.polygon_name || ''}
                            incidentCount={filteredScores.find(s => s.polygon_id === modalPolygonId)?.raw_data?.total_incidents || 0}
                            onClose={() => setActiveModal(null)}
                        />
                    )}
                    {activeModal === 'weather' && modalPolygonId && (
                        <WeatherDetailModal
                            polygonId={modalPolygonId}
                            onClose={() => setActiveModal(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Panel Detallado del Tramo Seleccionado */}
                <AnimatePresence>
                    {selectedPolygon && (
                        <PolygonDetailPanel
                            score={selectedPolygon}
                            onClose={() => setSelectedPolygon(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ============================================================================
// Componente: Resumen Global de Riesgos (Clickeable)
// ============================================================================

interface GlobalRiskOverviewProps {
    summaries: GroupRiskSummary[];
    selectedLevel: string | null;
    onLevelSelect: (level: string | null) => void;
}

const GlobalRiskOverview: React.FC<GlobalRiskOverviewProps> = ({ summaries, selectedLevel, onLevelSelect }) => {
    const totalPolygons = summaries.reduce((sum, s) => sum + s.polygon_count, 0);

    const distributionTotal = summaries.reduce((acc, s) => ({
        low: acc.low + s.risk_distribution.low,
        moderate: acc.moderate + s.risk_distribution.moderate,
        high: acc.high + s.risk_distribution.high,
        critical: acc.critical + s.risk_distribution.critical,
        severe: acc.severe + s.risk_distribution.severe,
    }), { low: 0, moderate: 0, high: 0, critical: 0, severe: 0 });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-6 gap-4"
        >
            <RiskStatCard
                label="Tramos Monitoreados"
                value={totalPolygons}
                icon={CheckCircle2}
                color="blue"
                isSelected={selectedLevel === null}
                onClick={() => onLevelSelect(null)}
            />
            <RiskStatCard
                label="Riesgo Bajo"
                value={distributionTotal.low}
                icon={CheckCircle2}
                color="green"
                levelKey="LOW"
                isSelected={selectedLevel === 'LOW'}
                onClick={() => onLevelSelect(selectedLevel === 'LOW' ? null : 'LOW')}
            />
            <RiskStatCard
                label="Riesgo Moderado"
                value={distributionTotal.moderate}
                icon={Minus}
                color="yellow"
                levelKey="MODERATE"
                isSelected={selectedLevel === 'MODERATE'}
                onClick={() => onLevelSelect(selectedLevel === 'MODERATE' ? null : 'MODERATE')}
            />
            <RiskStatCard
                label="Riesgo Alto"
                value={distributionTotal.high}
                icon={TrendingUp}
                color="orange"
                levelKey="HIGH"
                isSelected={selectedLevel === 'HIGH'}
                onClick={() => onLevelSelect(selectedLevel === 'HIGH' ? null : 'HIGH')}
            />
            <RiskStatCard
                label="Riesgo Crítico"
                value={distributionTotal.critical}
                icon={AlertTriangle}
                color="red"
                levelKey="CRITICAL"
                isSelected={selectedLevel === 'CRITICAL'}
                onClick={() => onLevelSelect(selectedLevel === 'CRITICAL' ? null : 'CRITICAL')}
            />
            <RiskStatCard
                label="Riesgo Severo"
                value={distributionTotal.severe}
                icon={ShieldAlert}
                color="purple"
                levelKey="SEVERE"
                isSelected={selectedLevel === 'SEVERE'}
                onClick={() => onLevelSelect(selectedLevel === 'SEVERE' ? null : 'SEVERE')}
            />
        </motion.div>
    );
};

// ============================================================================
// Componente: Tarjeta de Estadística de Riesgo
// ============================================================================

interface RiskStatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple';
    levelKey?: string;
    isSelected?: boolean;
    onClick?: () => void;
}

const RiskStatCard: React.FC<RiskStatCardProps> = ({ label, value, icon: Icon, color, isSelected, onClick }) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600 border-blue-400',
        green: 'from-green-500 to-green-600 border-green-400',
        yellow: 'from-yellow-500 to-yellow-600 border-yellow-400',
        orange: 'from-orange-500 to-orange-600 border-orange-400',
        red: 'from-red-500 to-red-600 border-red-400',
        purple: 'from-purple-500 to-purple-600 border-purple-400',
    };

    const borderColors = {
        blue: 'border-blue-400',
        green: 'border-green-400',
        yellow: 'border-yellow-400',
        orange: 'border-orange-400',
        red: 'border-red-400',
        purple: 'border-purple-400',
    };

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all border-l-4 ${borderColors[color]} ${
                isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-black text-gray-900">{value}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{label}</p>
            {value > 0 && (
                <p className="text-xs text-primary-600 mt-1 font-medium">Clic para filtrar</p>
            )}
        </motion.div>
    );
};

// ============================================================================
// Componente: Card de Tramo con Risk Score
// ============================================================================

interface PolygonRiskCardProps {
    score: RiskScore;
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onFactorClick: (type: 'traffic' | 'incidents' | 'weather', polygonId: string) => void;
}

const PolygonRiskCard: React.FC<PolygonRiskCardProps> = ({ score, index, isSelected, onClick, onFactorClick }) => {
    const riskConfig = {
        LOW: {
            color: 'green',
            bgColor: 'bg-green-50',
            textColor: 'text-green-900',
            borderColor: 'border-green-500',
            label: 'Bajo',
            description: 'Condiciones normales de circulación'
        },
        MODERATE: {
            color: 'yellow',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-900',
            borderColor: 'border-yellow-500',
            label: 'Moderado',
            description: 'Situación que requiere atención'
        },
        HIGH: {
            color: 'orange',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-900',
            borderColor: 'border-orange-500',
            label: 'Alto',
            description: 'Situación complicada con posibles afectaciones'
        },
        CRITICAL: {
            color: 'red',
            bgColor: 'bg-red-50',
            textColor: 'text-red-900',
            borderColor: 'border-red-500',
            label: 'Crítico',
            description: 'Requiere intervención inmediata'
        },
        SEVERE: {
            color: 'purple',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-900',
            borderColor: 'border-purple-500',
            label: 'Severo',
            description: 'Crisis operacional - máxima prioridad'
        },
    };

    const config = riskConfig[score.risk_level];

    // Generar descripciones de factores
    const getFactorDescription = (factor: 'traffic' | 'incident' | 'speed' | 'delay') => {
        const rawData = score.raw_data;
        if (!rawData) return 'Sin datos';

        switch(factor) {
            case 'traffic':
                return rawData.total_jams > 0
                    ? `${rawData.total_jams} atasco${rawData.total_jams > 1 ? 's' : ''} activo${rawData.total_jams > 1 ? 's' : ''}`
                    : 'Sin atascos';

            case 'incident':
                return rawData.total_incidents > 0
                    ? `${rawData.total_incidents} incidente${rawData.total_incidents > 1 ? 's' : ''} reportado${rawData.total_incidents > 1 ? 's' : ''}`
                    : 'Sin incidentes';

            case 'speed':
                if (!rawData.avg_speed) return 'Sin datos de velocidad';
                const speed = Math.round(rawData.avg_speed);
                if (speed < 20) return `${speed} km/h - Muy lento`;
                if (speed < 40) return `${speed} km/h - Lento`;
                if (speed < 60) return `${speed} km/h - Moderado`;
                return `${speed} km/h - Fluido`;

            case 'delay':
                const delayMin = Math.round((rawData.avg_delay || 0) / 60);
                return delayMin > 0
                    ? `${delayMin} min de demora promedio`
                    : 'Sin demoras significativas';
        }
    };

    const getWeatherDescription = () => {
        if (score.weather_score === 0) return 'Condiciones climáticas normales';
        if (score.weather_score >= 80) return 'Condiciones muy adversas';
        if (score.weather_score >= 60) return 'Condiciones adversas';
        if (score.weather_score >= 40) return 'Condiciones desfavorables';
        if (score.weather_score >= 20) return 'Condiciones de precaución';
        return 'Condiciones normales';
    };

    const generateDetailedRiskExplanation = () => {
        const parts: string[] = [];

        // Análisis de tráfico
        if (score.traffic_score >= 80) {
            parts.push(`Congestión severa con ${score.raw_data?.total_jams || 0} atascos activos que bloquean el tránsito normal`);
        } else if (score.traffic_score >= 50) {
            parts.push(`Alta congestión detectada (${score.raw_data?.total_jams || 0} atascos) que ralentiza la circulación`);
        }

        // Análisis de incidentes
        if (score.incident_score >= 80) {
            parts.push(`Múltiples incidentes graves (${score.raw_data?.total_incidents || 0}) afectando la vía`);
        } else if (score.incident_score >= 50) {
            parts.push(`Incidentes reportados (${score.raw_data?.total_incidents || 0}) que pueden causar demoras`);
        }

        // Análisis de velocidad
        if (score.speed_score >= 80) {
            const speed = score.raw_data?.avg_speed ? Math.round(score.raw_data.avg_speed) : 0;
            parts.push(`Velocidad promedio muy baja (${speed} km/h) indicando bloqueo parcial`);
        } else if (score.speed_score >= 50) {
            const speed = score.raw_data?.avg_speed ? Math.round(score.raw_data.avg_speed) : 0;
            parts.push(`Velocidad reducida (${speed} km/h) por debajo del flujo normal`);
        }

        // Análisis de demoras
        if (score.delay_score >= 60) {
            const delay = Math.round((score.raw_data?.avg_delay || 0) / 60);
            parts.push(`Demoras significativas de ${delay} minutos en promedio para atravesar el tramo`);
        }

        // Análisis climático
        if (score.weather_score >= 50) {
            parts.push('Condiciones meteorológicas adversas que afectan la visibilidad o adherencia');
        }

        if (parts.length === 0) {
            return 'El tramo presenta condiciones normales de circulación. Los factores de riesgo se encuentran dentro de los parámetros aceptables.';
        }

        return parts.join('. ') + '. Se recomienda monitoreo continuo y posible intervención según evolución.';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-xl shadow-lg p-6 transition-all border-2 ${
                isSelected ? 'border-primary-500 shadow-xl' : 'border-transparent hover:shadow-xl'
            }`}
        >
            <div className="space-y-4">
                {/* Header - Sin score duplicado */}
                <div className="flex items-start justify-between cursor-pointer" onClick={onClick}>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <MapPin className={`w-5 h-5 text-${config.color}-600`} />
                            <h3 className="text-lg font-bold text-gray-900">{score.polygon_name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 ml-8">{score.group_name}</p>
                    </div>

                    {/* Badge de nivel de riesgo */}
                    <div className={`px-4 py-2 rounded-lg ${config.bgColor} border-2 ${config.borderColor}`}>
                        <div className={`text-sm font-black ${config.textColor} uppercase`}>
                            Riesgo {config.label}
                        </div>
                    </div>
                </div>

                {/* Descripción del riesgo */}
                <div className={`p-3 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}>
                    <p className={`text-sm font-bold ${config.textColor}`}>
                        {config.description}
                    </p>
                    {score.raw_data && (
                        <p className="text-xs text-gray-700 mt-1">
                            {score.raw_data.conditions_summary}
                        </p>
                    )}
                </div>

                {/* Factores descriptivos - Grid 2x3 clickeable */}
                <div className="grid grid-cols-3 gap-3">
                    <ClickableFactorBadge
                        icon={Car}
                        label="Tráfico"
                        description={getFactorDescription('traffic')}
                        severity={score.traffic_score}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (score.raw_data && score.raw_data.total_jams > 0) {
                                onFactorClick('traffic', score.polygon_id);
                            }
                        }}
                        clickable={score.raw_data ? score.raw_data.total_jams > 0 : false}
                    />
                    <ClickableFactorBadge
                        icon={AlertIcon}
                        label="Incidentes"
                        description={getFactorDescription('incident')}
                        severity={score.incident_score}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (score.raw_data && score.raw_data.total_incidents > 0) {
                                onFactorClick('incidents', score.polygon_id);
                            }
                        }}
                        clickable={score.raw_data ? score.raw_data.total_incidents > 0 : false}
                    />
                    <ClickableFactorBadge
                        icon={CloudRain}
                        label="Clima"
                        description={getWeatherDescription()}
                        severity={score.weather_score}
                        onClick={(e) => {
                            e.stopPropagation();
                            onFactorClick('weather', score.polygon_id);
                        }}
                        clickable={true}
                    />
                    <ClickableFactorBadge
                        icon={Gauge}
                        label="Velocidad"
                        description={getFactorDescription('speed')}
                        severity={score.speed_score}
                        clickable={false}
                    />
                    <ClickableFactorBadge
                        icon={Clock}
                        label="Demoras"
                        description={getFactorDescription('delay')}
                        severity={score.delay_score}
                        clickable={false}
                    />
                    {/* Celda vacía para mantener grid 3x2 */}
                    <div className="p-3 rounded-lg bg-gray-50 border-2 border-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500 font-medium">
                            Puntuación: {Math.round(score.final_risk_score)}/100
                        </span>
                    </div>
                </div>

                {/* Análisis detallado del riesgo - Siempre visible con más detalle */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Análisis Detallado del Riesgo
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                        {generateDetailedRiskExplanation()}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================================================
// Componente: Badge de Factor Clickeable
// ============================================================================

interface ClickableFactorBadgeProps {
    icon: React.ElementType;
    label: string;
    description: string;
    severity: number;
    onClick?: (e: React.MouseEvent) => void;
    clickable: boolean;
}

const ClickableFactorBadge: React.FC<ClickableFactorBadgeProps> = ({
    icon: Icon,
    label,
    description,
    severity,
    onClick,
    clickable
}) => {
    const getColor = (val: number) => {
        if (val >= 80) return 'text-red-600 bg-red-100 border-red-300';
        if (val >= 60) return 'text-orange-600 bg-orange-100 border-orange-300';
        if (val >= 40) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
        return 'text-green-600 bg-green-100 border-green-300';
    };

    return (
        <motion.div
            onClick={clickable ? onClick : undefined}
            className={`p-3 rounded-lg border-2 ${getColor(severity)} transition-all ${
                clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''
            }`}
            whileHover={clickable ? { scale: 1.02 } : {}}
            whileTap={clickable ? { scale: 0.98 } : {}}
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{label}</span>
            </div>
            <p className="text-xs font-semibold leading-tight">
                {description}
            </p>
            {clickable && (
                <p className="text-[10px] mt-1 opacity-70">Clic para detalles</p>
            )}
        </motion.div>
    );
};

// ============================================================================
// Componente: Modal de Detalle del Clima
// ============================================================================

interface WeatherDetailModalProps {
    polygonId: string;
    onClose: () => void;
}

const WeatherDetailModal: React.FC<WeatherDetailModalProps> = ({ polygonId, onClose }) => {
    const { data: weatherData, isLoading } = usePolygonWeather(polygonId);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CloudRain className="w-6 h-6 text-cyan-600" />
                        Condiciones Climáticas
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Cargando datos meteorológicos...</p>
                    </div>
                ) : weatherData ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <WeatherInfoCard
                                icon={Thermometer}
                                label="Temperatura"
                                value={`${weatherData.temperature_celsius?.toFixed(1) || '--'}°C`}
                                subvalue={`Sensación: ${weatherData.temperature_feels_like?.toFixed(1) || '--'}°C`}
                            />
                            <WeatherInfoCard
                                icon={Droplets}
                                label="Precipitación"
                                value={`${weatherData.precipitation_mm?.toFixed(1) || '0'} mm`}
                                subvalue={`Prob: ${weatherData.precipitation_probability || 0}%`}
                            />
                            <WeatherInfoCard
                                icon={Wind}
                                label="Viento"
                                value={`${weatherData.wind_speed_kmh?.toFixed(0) || '--'} km/h`}
                                subvalue={`Ráfagas: ${weatherData.wind_gusts_kmh?.toFixed(0) || '--'} km/h`}
                            />
                            <WeatherInfoCard
                                icon={Eye}
                                label="Visibilidad"
                                value={`${((weatherData.visibility_meters || 10000) / 1000).toFixed(1)} km`}
                                subvalue={weatherData.weather_description || 'Sin datos'}
                            />
                        </div>

                        {weatherData.is_freezing_risk && (
                            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                <p className="text-blue-800 font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Riesgo de congelamiento detectado
                                </p>
                                <p className="text-blue-700 text-sm mt-1">
                                    Temperatura de carretera: {weatherData.road_temperature_celsius?.toFixed(1) || '--'}°C
                                </p>
                            </div>
                        )}

                        {weatherData.has_weather_alert && (
                            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                                <p className="text-amber-800 font-bold">
                                    Alerta Meteorológica: {weatherData.alert_severity}
                                </p>
                                <p className="text-amber-700 text-sm mt-1">
                                    {weatherData.alert_description}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <CloudRain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No hay datos meteorológicos disponibles</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Los datos se actualizan periódicamente
                        </p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// ============================================================================
// Componente: Card de Info del Clima
// ============================================================================

interface WeatherInfoCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    subvalue: string;
}

const WeatherInfoCard: React.FC<WeatherInfoCardProps> = ({ icon: Icon, label, value, subvalue }) => (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200">
        <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-bold text-gray-700">{label}</span>
        </div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-xs text-gray-600 mt-1">{subvalue}</p>
    </div>
);

// ============================================================================
// Componente: Panel Detallado de Tramo
// ============================================================================

interface PolygonDetailPanelProps {
    score: RiskScore;
    onClose: () => void;
}

const PolygonDetailPanel: React.FC<PolygonDetailPanelProps> = ({ score, onClose }) => {
    const riskLabels: Record<string, string> = {
        LOW: 'Bajo',
        MODERATE: 'Moderado',
        HIGH: 'Alto',
        CRITICAL: 'Crítico',
        SEVERE: 'Severo'
    };

    const categoryLabels: Record<string, string> = {
        normal: 'Normal',
        incident_zone: 'Zona de Incidentes',
        weather_hazard: 'Riesgo Climático',
        traffic_congestion: 'Congestión de Tráfico',
        mixed: 'Múltiples Factores'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl rounded-t-3xl p-8 z-50 max-h-[60vh] overflow-y-auto"
        >
            <div className="max-w-[1800px] mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">{score.polygon_name}</h2>
                        <p className="text-gray-600">{score.group_name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="grid grid-cols-5 gap-4">
                    <DetailFactorCard
                        title="Tráfico y Congestión"
                        score={score.traffic_score}
                        icon={Car}
                        color="blue"
                    />
                    <DetailFactorCard
                        title="Incidentes"
                        score={score.incident_score}
                        icon={AlertIcon}
                        color="red"
                    />
                    <DetailFactorCard
                        title="Condiciones Climáticas"
                        score={score.weather_score}
                        icon={CloudRain}
                        color="cyan"
                    />
                    <DetailFactorCard
                        title="Velocidad y Fluidez"
                        score={score.speed_score}
                        icon={Gauge}
                        color="green"
                    />
                    <DetailFactorCard
                        title="Demoras"
                        score={score.delay_score}
                        icon={Clock}
                        color="purple"
                    />
                </div>

                <div className="mt-6 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Categoría de Riesgo</h3>
                    <p className="text-gray-700">
                        <span className="font-bold">{categoryLabels[score.risk_category] || score.risk_category}</span>
                        {' '}- Nivel: <span className="font-bold">{riskLabels[score.risk_level]}</span>
                        {score.alert_triggered && (
                            <span className="ml-4 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                                ALERTA ACTIVA
                            </span>
                        )}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================================================
// Componente: Card Detallado de Factor
// ============================================================================

interface DetailFactorCardProps {
    title: string;
    score: number;
    icon: React.ElementType;
    color: string;
}

const DetailFactorCard: React.FC<DetailFactorCardProps> = ({ title, score, icon: Icon, color }) => {
    return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200">
            <div className={`p-3 rounded-lg bg-${color}-100 w-fit mb-3`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">{title}</h4>
            <div className="text-4xl font-black text-gray-900">{Math.round(score)}</div>
            <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600`}
                />
            </div>
        </div>
    );
};

// ============================================================================
// Componente: Modal de Info de Tráfico
// ============================================================================

interface TrafficInfoModalProps {
    polygonId: string;
    polygonName: string;
    jamCount: number;
    onClose: () => void;
}

const TrafficInfoModal: React.FC<TrafficInfoModalProps> = ({ polygonId, polygonName, jamCount, onClose }) => {
    const navigate = useNavigate();

    const handleViewOnMap = () => {
        onClose();
        // Navegar al dashboard con el polígono seleccionado y filtro de jams
        navigate('/', {
            state: {
                selectedPolygonId: polygonId,
                filterType: 'jams'
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Car className="w-6 h-6 text-blue-600" />
                        Tráfico - {polygonName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                        <div className="text-center">
                            <div className="text-5xl font-black text-blue-600 mb-2">{jamCount}</div>
                            <p className="text-blue-800 font-bold">
                                Atasco{jamCount !== 1 ? 's' : ''} Activo{jamCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-700">
                            <strong>Información:</strong> Los atascos se detectan en tiempo real a través
                            del sistema Waze. Cada atasco representa una zona donde la velocidad del
                            tráfico está significativamente reducida.
                        </p>
                    </div>

                    <button
                        onClick={handleViewOnMap}
                        className="block w-full text-center py-3 px-4 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Ver en el Mapa Principal
                        </div>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================================================
// Componente: Modal de Info de Incidentes
// ============================================================================

interface IncidentsInfoModalProps {
    polygonId: string;
    polygonName: string;
    incidentCount: number;
    onClose: () => void;
}

const IncidentsInfoModal: React.FC<IncidentsInfoModalProps> = ({ polygonId, polygonName, incidentCount, onClose }) => {
    const navigate = useNavigate();

    const handleViewOnMap = () => {
        onClose();
        // Navegar al dashboard con el polígono seleccionado y filtro de alertas
        navigate('/', {
            state: {
                selectedPolygonId: polygonId,
                filterType: 'alerts'
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertIcon className="w-6 h-6 text-red-600" />
                        Incidentes - {polygonName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                        <div className="text-center">
                            <div className="text-5xl font-black text-red-600 mb-2">{incidentCount}</div>
                            <p className="text-red-800 font-bold">
                                Incidente{incidentCount !== 1 ? 's' : ''} Reportado{incidentCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-700 mb-3">
                            <strong>Tipos de incidentes:</strong>
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                <span>Accidentes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                <span>Obras en vía</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                <span>Peligros</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span>Cortes de vía</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleViewOnMap}
                        className="block w-full text-center py-3 px-4 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Ver en el Mapa Principal
                        </div>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default RiskDashboard;
