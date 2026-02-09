import React, { useMemo } from "react";
import type { PolygonTrafficMetrics, TrafficJam } from "../../types";
import {
  JAM_LEVEL_TRANSLATIONS,
  JAM_LEVEL_DESCRIPTIONS,
} from "../../utils/wazeTranslations";
import { formatDelay } from "../../utils/polygonCalculations";
import { useTvtMetricsByPolygon, type TvtMetrics } from "../../hooks/useWazeData";

interface CongestionIndexCardProps {
  polygonId: string;
  metrics: PolygonTrafficMetrics | null;
  jams?: TrafficJam[];
}

/**
 * Resumen de Tráfico para operador de sala de control
 *
 * Basado en especificación oficial Waze Partners - Traffic View Feed:
 * https://support.google.com/waze/partners/answer/13658466
 *
 * ═══════════════════════════════════════════════════════
 * DATOS DEL TVT FEED (Traffic View Technology):
 * ═══════════════════════════════════════════════════════
 *
 * usersOnJams: [{wazersCount, jamLevel}]
 *   Cantidad de usuarios Waze (wazers) en cada nivel de congestión.
 *   - jamLevel 0: Sin demoras
 *   - jamLevel 1-3: Niveles crecientes de lentitud
 *   - jamLevel 4: Detenido (standstill)
 *
 * lengthOfJams: [{jamLevel, jamLength}]
 *   Longitud total de atascos (en metros) agrupados por nivel.
 *   - jamLevel 1-5 (level 5 = road closure / vía cerrada)
 *
 * jamLevel (Waze oficial):
 *   "A route's jam level scales directly with traffic congestion.
 *    Level 0 represents no delays, while levels 1 to 3 signify
 *    increasing traffic slowdown. Level 4 indicates standstill,
 *    and level 5 signifies a full road closure."
 *
 * - Level 0: Sin demoras (no delays)
 * - Level 1: Demora leve (increasing slowdown - light)
 * - Level 2: Tránsito lento (increasing slowdown - moderate)
 * - Level 3: Tránsito denso (increasing slowdown - heavy)
 * - Level 4: Detenido (standstill)
 * - Level 5: Vía cerrada (full road closure)
 */
export const CongestionIndexCard: React.FC<CongestionIndexCardProps> = ({
  polygonId,
  metrics,
  jams = [],
}) => {
  // Obtener datos TVT del feed oficial de Waze
  const { data: tvtMetrics } = useTvtMetricsByPolygon(polygonId);

  // ═══ RESUMEN COMBINADO: TVT + Jams + Backend metrics ═══
  const summary = useMemo(() => {
    return buildTrafficSummary(metrics, jams, tvtMetrics || null);
  }, [metrics, jams, tvtMetrics]);

  // ═══ SIN DATOS ═══
  if (!summary.hasData) {
    return (
      <div className="bg-white dark:bg-veltrix-bg/30 rounded-lg border border-gray-200 dark:border-veltrix-border p-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-veltrix-text uppercase mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Resumen de Tráfico (TVT)
        </h2>
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="text-2xl mb-1">🟢</div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Sin congestión detectada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              No hay atascos activos en este tramo
            </p>
          </div>
        </div>
      </div>
    );
  }

  const data = summary;
  const colors = getIndexColors(data.congestionIndex);
  const status = getOperationalStatus(data);

  return (
    <div className="bg-white dark:bg-veltrix-bg/30 rounded-lg border border-gray-200 dark:border-veltrix-border overflow-hidden">
      {/* Header con estado operativo */}
      <div className={`px-4 py-3 ${colors.bg} border-b border-gray-200 dark:border-veltrix-border`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-900 dark:text-veltrix-text uppercase flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Resumen de Tráfico (TVT)
          </h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.ring}`}>
            {status.emoji} {status.label}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ═══ SECCIÓN 1: Gauge de congestión + Velocidad ═══ */}
        {data.hasJamSegments && (
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className={`w-20 h-20 rounded-full border-[3px] ${colors.ring} flex items-center justify-center`}>
                <div className="text-center">
                  <div className={`text-2xl font-black ${colors.text}`}>
                    {data.congestionIndex}
                  </div>
                  <div className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">/ 100</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {data.avgSpeed}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">km/h promedio</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Mín</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{data.minSpeed} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Máx</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{data.maxSpeed} km/h</span>
                </div>
                {data.totalDelay > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Demora</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatDelay(data.totalDelay)}
                    </span>
                  </div>
                )}
                {data.totalJamLength > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Extensión</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {data.totalJamLength >= 1000
                        ? `${(data.totalJamLength / 1000).toFixed(1)} km`
                        : `${data.totalJamLength} m`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Descripción operativa */}
        <div className={`${colors.bg} rounded-lg px-3 py-2`}>
          <p className={`text-xs ${colors.text} font-medium`}>
            {status.description}
          </p>
        </div>

        {/* ═══ SECCIÓN 2: Datos del TVT Feed (lengthOfJams) ═══ */}
        {data.tvtLengthEntries.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center justify-between">
              <span>Longitud de Atascos por Nivel (TVT)</span>
              <span className="text-gray-400 font-normal normal-case">
                {formatLength(data.tvtTotalJamLength)} total
              </span>
            </div>

            {/* Barra visual de longitud por nivel */}
            {data.tvtTotalJamLength > 0 && (
              <div className="flex h-3 rounded-full overflow-hidden mb-2">
                {data.tvtLengthEntries.map(({ level, length }) => {
                  const pct = (length / data.tvtTotalJamLength) * 100;
                  return (
                    <div
                      key={level}
                      className={`${getLevelColor(level)} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`Nivel ${level}: ${JAM_LEVEL_TRANSLATIONS[String(level)] || ""} (${formatLength(length)})`}
                    />
                  );
                })}
              </div>
            )}

            {/* Detalle por nivel (TVT lengthOfJams) */}
            <div className="space-y-1">
              {data.tvtLengthEntries.map(({ level, length }) => (
                <div key={level} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span>{getLevelDot(level)}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      N{level} - {JAM_LEVEL_TRANSLATIONS[String(level)] || `Nivel ${level}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatLength(length)}
                    </span>
                    {data.tvtTotalJamLength > 0 && (
                      <span className="text-gray-400 w-8 text-right">
                        {Math.round((length / data.tvtTotalJamLength) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SECCIÓN 3: Usuarios Waze en ruta (TVT usersOnJams) ═══ */}
        {data.tvtWazersTotal > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center justify-between">
              <span>Usuarios Waze en Ruta</span>
              <span className="text-gray-400 font-normal normal-case flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                {data.tvtWazersTotal} wazers
              </span>
            </div>

            <div className="space-y-1">
              {data.tvtUsersEntries.map(({ level, count }) => (
                <div key={level} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span>{getLevelDot(level)}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      N{level} - {JAM_LEVEL_TRANSLATIONS[String(level)] || `Nivel ${level}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                    {data.tvtWazersTotal > 0 && (
                      <span className="text-gray-400 w-8 text-right">
                        {Math.round((count / data.tvtWazersTotal) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SECCIÓN 4: Distribución por Nivel Waze (segmentos individuales) ═══ */}
        {data.jamLevelEntries.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center justify-between">
              <span>Segmentos de Congestión</span>
              <span className="text-gray-400 font-normal normal-case">
                {data.totalJamSegments} segmento{data.totalJamSegments !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {[5, 4, 3, 2, 1, 0].map((level) => {
                const count = data.jamsByLevel[level] || 0;
                if (count === 0 || data.totalJamSegments === 0) return null;
                const pct = (count / data.totalJamSegments) * 100;
                return (
                  <div
                    key={level}
                    className={`${getLevelColor(level)} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`Nivel ${level}: ${JAM_LEVEL_TRANSLATIONS[String(level)] || ""} (${count})`}
                  />
                );
              })}
            </div>

            <div className="space-y-1">
              {data.jamLevelEntries.map(({ level, count }) => (
                <div key={level} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span>{getLevelDot(level)}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      N{level} - {JAM_LEVEL_TRANSLATIONS[String(level)] || `Nivel ${level}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                    <span className="text-gray-400 w-8 text-right">
                      {data.totalJamSegments > 0 ? Math.round((count / data.totalJamSegments) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SECCIÓN 5: Distribución de velocidades ═══ */}
        {data.hasJamSegments && data.totalSpeedPoints > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
              Distribución de Velocidades
            </div>
            <div className="space-y-1.5">
              {data.stoppedPoints > 0 && (
                <SpeedBar label="Detenido" range="< 10 km/h" count={data.stoppedPoints} total={data.totalSpeedPoints} color="bg-red-500" dot="🔴" />
              )}
              {data.slowPoints > 0 && (
                <SpeedBar label="Lento" range="10-20 km/h" count={data.slowPoints} total={data.totalSpeedPoints} color="bg-orange-500" dot="🟠" />
              )}
              {data.moderatePoints > 0 && (
                <SpeedBar label="Moderado" range="20-40 km/h" count={data.moderatePoints} total={data.totalSpeedPoints} color="bg-yellow-500" dot="🟡" />
              )}
              {data.fastPoints > 0 && (
                <SpeedBar label="Fluido" range="> 40 km/h" count={data.fastPoints} total={data.totalSpeedPoints} color="bg-green-500" dot="🟢" />
              )}
            </div>
          </div>
        )}

        {/* ═══ SECCIÓN 6: Tramo más comprometido ═══ */}
        {data.worstStreet && data.worstSpeed < 30 && (
          <div className={`rounded-lg px-3 py-2 border ${
            data.worstLevel >= 5
              ? "bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600"
              : data.worstLevel >= 4
                ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
                : "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30"
          }`}>
            <div className={`text-[10px] font-bold uppercase mb-0.5 ${
              data.worstLevel >= 5
                ? "text-gray-700 dark:text-gray-300"
                : "text-red-700 dark:text-red-400"
            }`}>
              {data.worstLevel >= 5 ? "Cierre de vía detectado" : "Tramo más comprometido"}
            </div>
            <div className="text-xs text-gray-900 dark:text-white font-medium">
              {data.worstStreet}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px]">
              {data.worstLevel < 5 && (
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {data.worstSpeed} km/h
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {getLevelDot(data.worstLevel)}{" "}
                {JAM_LEVEL_TRANSLATIONS[String(data.worstLevel)] || ""}
              </span>
              {data.worstLevel >= 5 && (
                <span className="text-gray-500 dark:text-gray-400 italic">
                  (Waze Level 5 - road closure)
                </span>
              )}
            </div>
          </div>
        )}

        {/* ═══ SECCIÓN 7: Nivel de descripción (tooltip informativo) ═══ */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <details className="group">
            <summary className="text-[10px] text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              ℹ️ Referencia de Niveles Waze (TVT Feed)
            </summary>
            <div className="mt-2 space-y-1 pl-4">
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <div key={level} className="text-[9px] text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{getLevelDot(level)} N{level}:</span>{" "}
                  {JAM_LEVEL_DESCRIPTIONS[String(level)] || ""}
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════

interface TrafficSummaryData {
  hasData: boolean;
  congestionIndex: number;
  // Velocidad (de segmentos individuales)
  avgSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  hasJamSegments: boolean;
  totalJamSegments: number;
  // Velocidades
  stoppedPoints: number;
  slowPoints: number;
  moderatePoints: number;
  fastPoints: number;
  totalSpeedPoints: number;
  // Demora/longitud de segmentos
  totalDelay: number;
  totalJamLength: number;
  // Segmentos por nivel
  jamsByLevel: Record<number, number>;
  jamLevelEntries: Array<{ level: number; count: number }>;
  // TVT: lengthOfJams
  tvtLengthEntries: Array<{ level: number; length: number }>;
  tvtTotalJamLength: number;
  // TVT: usersOnJams
  tvtUsersEntries: Array<{ level: number; count: number }>;
  tvtWazersTotal: number;
  // Peor tramo
  worstStreet: string | null;
  worstSpeed: number;
  worstLevel: number;
  // Flags especiales
  hasRoadClosure: boolean;
  hasStandstill: boolean;
}

function buildTrafficSummary(
  metrics: PolygonTrafficMetrics | null,
  jams: TrafficJam[],
  tvt: TvtMetrics | null,
): TrafficSummaryData | { hasData: false } {
  // ── TVT data ──
  const tvtLengthEntries: Array<{ level: number; length: number }> = [];
  const tvtUsersEntries: Array<{ level: number; count: number }> = [];
  let tvtTotalJamLength = 0;
  let tvtWazersTotal = 0;

  if (tvt) {
    // lengthOfJams: [{jamLevel, jamLength}] - levels 1-5
    if (tvt.lengthOfJams && Array.isArray(tvt.lengthOfJams)) {
      for (const item of tvt.lengthOfJams) {
        if (item.jamLength > 0) {
          tvtLengthEntries.push({ level: item.jamLevel, length: item.jamLength });
          tvtTotalJamLength += item.jamLength;
        }
      }
      tvtLengthEntries.sort((a, b) => b.level - a.level);
    }

    // usersOnJams: [{wazersCount, jamLevel}] - levels 0-4
    if (tvt.usersOnJams && Array.isArray(tvt.usersOnJams)) {
      for (const item of tvt.usersOnJams) {
        if (item.wazersCount > 0) {
          tvtUsersEntries.push({ level: item.jamLevel, count: item.wazersCount });
          tvtWazersTotal += item.wazersCount;
        }
      }
      tvtUsersEntries.sort((a, b) => b.level - a.level);
    }
  }

  // ── Jam segments data ──
  const hasJamSegments = jams.length > 0;
  let avgSpeed = 0, minSpeed = 0, maxSpeed = 0;
  let stoppedPoints = 0, slowPoints = 0, moderatePoints = 0, fastPoints = 0;
  const jamsByLevel: Record<number, number> = {};
  let totalDelay = 0, totalJamLength = 0;
  let worstStreet: string | null = null;
  let worstSpeed = 999;
  let worstLevel = 0;

  if (hasJamSegments) {
    const speeds = jams.map((j) => typeof j.speed === "string" ? parseFloat(j.speed) : j.speed);
    avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    minSpeed = Math.min(...speeds);
    maxSpeed = Math.max(...speeds);

    for (const jam of jams) {
      const speed = typeof jam.speed === "string" ? parseFloat(jam.speed) : jam.speed;
      if (speed < 10) stoppedPoints++;
      else if (speed < 20) slowPoints++;
      else if (speed < 40) moderatePoints++;
      else fastPoints++;

      const level = jam.level ?? 0;
      jamsByLevel[level] = (jamsByLevel[level] || 0) + 1;
      totalDelay += jam.delay || 0;
      totalJamLength += jam.length || 0;

      if (speed < worstSpeed) {
        worstSpeed = speed;
        worstStreet = jam.street || null;
        worstLevel = level;
      }
    }
  }

  // ── Metrics from backend ──
  if (metrics && metrics.totalJams > 0 && !hasJamSegments) {
    avgSpeed = metrics.avgSpeed ?? 0;
    minSpeed = metrics.minSpeed ?? 0;
    maxSpeed = metrics.maxSpeed ?? 0;
    stoppedPoints = metrics.stoppedPoints;
    slowPoints = metrics.slowPoints;
    moderatePoints = metrics.moderatePoints;
    fastPoints = metrics.fastPoints;
  }

  // ── Determinar si hay datos ──
  const hasAnyJamData = hasJamSegments || (metrics && metrics.totalJams > 0);
  const hasTvtData = tvtTotalJamLength > 0 || tvtWazersTotal > 0;

  if (!hasAnyJamData && !hasTvtData) {
    return { hasData: false };
  }

  // ── Congestion Index ──
  let congestionIndex: number;
  if (hasJamSegments || (metrics && metrics.totalJams > 0)) {
    const effectiveSpeed = avgSpeed || (metrics?.avgSpeed ?? 60);
    const freeFlowSpeed = 60;
    congestionIndex = Math.max(0, Math.min(100, Math.round(((freeFlowSpeed - effectiveSpeed) / freeFlowSpeed) * 100)));
  } else {
    // Solo datos TVT disponibles - estimar congestion desde lengthOfJams
    congestionIndex = estimateCongestionFromTvt(tvtLengthEntries, tvtTotalJamLength);
  }

  // ── Road closure / Standstill ──
  const hasRoadClosure = (jamsByLevel[5] || 0) > 0 ||
    tvtLengthEntries.some((e) => e.level === 5 && e.length > 0);
  const hasStandstill = (jamsByLevel[4] || 0) > 0 ||
    tvtLengthEntries.some((e) => e.level === 4 && e.length > 0);

  // ── Level entries (segmentos) ──
  const jamLevelEntries = Object.entries(jamsByLevel)
    .map(([level, count]) => ({ level: Number(level), count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.level - a.level);

  return {
    hasData: true,
    congestionIndex,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    minSpeed: Math.round(minSpeed),
    maxSpeed: Math.round(maxSpeed),
    hasJamSegments,
    totalJamSegments: jams.length || (metrics?.totalJams ?? 0),
    stoppedPoints,
    slowPoints,
    moderatePoints,
    fastPoints,
    totalSpeedPoints: stoppedPoints + slowPoints + moderatePoints + fastPoints,
    totalDelay,
    totalJamLength,
    jamsByLevel,
    jamLevelEntries,
    tvtLengthEntries,
    tvtTotalJamLength,
    tvtUsersEntries,
    tvtWazersTotal,
    worstStreet,
    worstSpeed: Math.round(worstSpeed === 999 ? 0 : worstSpeed),
    worstLevel,
    hasRoadClosure,
    hasStandstill,
  };
}

/**
 * Estima un índice de congestión (0-100) basado únicamente en datos del TVT feed.
 * Usa la longitud total de jams ponderada por nivel de severidad.
 */
function estimateCongestionFromTvt(
  entries: Array<{ level: number; length: number }>,
  totalLength: number,
): number {
  if (totalLength === 0) return 0;
  // Peso por nivel: level 1 = 20, 2 = 40, 3 = 60, 4 = 80, 5 = 100
  const weights: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
  let weightedSum = 0;
  for (const e of entries) {
    weightedSum += (e.length / totalLength) * (weights[e.level] || 0);
  }
  return Math.round(Math.min(100, weightedSum));
}

function getOperationalStatus(data: TrafficSummaryData): { emoji: string; label: string; description: string } {
  if (data.hasRoadClosure) return {
    emoji: "⛔",
    label: "VÍA CERRADA",
    description: "Cierre de vía detectado (Waze Level 5). Verificar alternativas de desvío.",
  };
  if (data.hasStandstill) return {
    emoji: "🔴",
    label: "DETENIDO",
    description: "Tránsito detenido (Waze Level 4 - standstill). Demoras severas.",
  };
  if (data.congestionIndex >= 80) return {
    emoji: "🟠",
    label: "SEVERO",
    description: "Congestión severa (Waze Level 3). Tránsito denso con demoras significativas.",
  };
  if (data.congestionIndex >= 50) return {
    emoji: "🟡",
    label: "MODERADO",
    description: "Tránsito lento (Waze Level 2). Demoras moderadas, monitorear evolución.",
  };
  if (data.congestionIndex >= 25) return {
    emoji: "🟢",
    label: "LEVE",
    description: "Demora leve (Waze Level 1). Leve reducción de velocidad.",
  };
  return {
    emoji: "✅",
    label: "FLUIDO",
    description: "Sin demoras (Waze Level 0). Circulación a velocidad nominal.",
  };
}

function getIndexColors(index: number) {
  if (index <= 30) return {
    ring: "border-green-400 dark:border-green-500",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  };
  if (index <= 60) return {
    ring: "border-yellow-400 dark:border-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
  };
  if (index <= 80) return {
    ring: "border-orange-400 dark:border-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  };
  return {
    ring: "border-red-400 dark:border-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  };
}

// Colores por nivel Waze (TVT feed spec oficial)
function getLevelColor(level: number): string {
  if (level >= 5) return "bg-gray-800 dark:bg-gray-600"; // Vía cerrada
  if (level >= 4) return "bg-red-700 dark:bg-red-600";   // Standstill
  if (level >= 3) return "bg-red-500 dark:bg-red-500";   // Denso
  if (level >= 2) return "bg-orange-500 dark:bg-orange-500"; // Lento
  if (level >= 1) return "bg-yellow-400 dark:bg-yellow-400"; // Leve
  return "bg-green-500 dark:bg-green-500";
}

function getLevelDot(level: number): string {
  if (level >= 5) return "⛔";
  if (level >= 4) return "🔴";
  if (level >= 3) return "🟠";
  if (level >= 2) return "🟡";
  if (level >= 1) return "🟡";
  return "🟢";
}

function formatLength(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Componente de barra de distribución de velocidades
 */
const SpeedBar: React.FC<{
  label: string;
  range: string;
  count: number;
  total: number;
  color: string;
  dot: string;
}> = ({ label, range, count, total, color, dot }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-gray-600 dark:text-gray-400">
          {dot} {label} ({range})
        </span>
        <span className="font-bold text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className={`${color} h-1.5 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
