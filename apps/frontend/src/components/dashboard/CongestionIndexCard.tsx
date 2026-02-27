import React, { useMemo } from "react";
import {
  JAM_LEVEL_TRANSLATIONS,
  JAM_LEVEL_DESCRIPTIONS,
} from "../../utils/wazeTranslations";
import { useTvtMetricsByPolygon, type TvtMetrics } from "../../hooks/useWazeData";

interface CongestionIndexCardProps {
  polygonId: string;
}

/**
 * Resumen de Tráfico — solo datos del feed TVT (Traffic View Technology)
 *
 * Fuente: https://support.google.com/waze/partners/answer/13658466
 *
 * usersOnJams: [{wazersCount, jamLevel}]
 *   Usuarios Waze por nivel de congestión (0–4).
 *
 * lengthOfJams: [{jamLevel, jamLength}]
 *   Longitud total de atascos en metros por nivel (1–5).
 *
 * No incluye: speed, delay, street, line (esos datos vienen del feed principal).
 */
export const CongestionIndexCard: React.FC<CongestionIndexCardProps> = ({
  polygonId,
}) => {
  const { data: tvtMetrics } = useTvtMetricsByPolygon(polygonId);

  const summary = useMemo(() => {
    return buildTvtSummary(tvtMetrics || null);
  }, [tvtMetrics]);

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
        {/* KPIs del TVT */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-3">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold">Extensión total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatLength(data.tvtTotalJamLength)}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">lengthOfJams</p>
          </div>
          <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-3">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold">Usuarios en ruta</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{data.tvtWazersTotal}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">wazers (usersOnJams)</p>
          </div>
        </div>

        {/* Descripción operativa */}
        <div className={`${colors.bg} rounded-lg px-3 py-2`}>
          <p className={`text-xs ${colors.text} font-medium`}>
            {status.description}
          </p>
        </div>

        {/* Longitud de Atascos por Nivel (TVT lengthOfJams) */}
        {data.tvtLengthEntries.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center justify-between">
              <span>Longitud por Nivel (TVT)</span>
              <span className="text-gray-400 font-normal normal-case">
                {formatLength(data.tvtTotalJamLength)} total
              </span>
            </div>

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

        {/* Usuarios Waze en ruta (TVT usersOnJams) */}
        {data.tvtWazersTotal > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center justify-between">
              <span>Usuarios por Nivel</span>
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

        {/* Referencia de niveles */}
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
// FUNCIONES AUXILIARES — Solo TVT
// ═══════════════════════════════════════════════════════

interface TvtSummaryData {
  hasData: boolean;
  congestionIndex: number;
  tvtLengthEntries: Array<{ level: number; length: number }>;
  tvtTotalJamLength: number;
  tvtUsersEntries: Array<{ level: number; count: number }>;
  tvtWazersTotal: number;
  hasRoadClosure: boolean;
  hasStandstill: boolean;
}

function buildTvtSummary(tvt: TvtMetrics | null): TvtSummaryData | { hasData: false } {
  const tvtLengthEntries: Array<{ level: number; length: number }> = [];
  const tvtUsersEntries: Array<{ level: number; count: number }> = [];
  let tvtTotalJamLength = 0;
  let tvtWazersTotal = 0;

  if (tvt) {
    if (tvt.lengthOfJams && Array.isArray(tvt.lengthOfJams)) {
      for (const item of tvt.lengthOfJams) {
        if (item.jamLength > 0) {
          tvtLengthEntries.push({ level: item.jamLevel, length: item.jamLength });
          tvtTotalJamLength += item.jamLength;
        }
      }
      tvtLengthEntries.sort((a, b) => b.level - a.level);
    }

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

  if (tvtTotalJamLength === 0 && tvtWazersTotal === 0) {
    return { hasData: false };
  }

  const congestionIndex = estimateCongestionFromTvt(tvtLengthEntries, tvtTotalJamLength);
  const hasRoadClosure = tvtLengthEntries.some((e) => e.level === 5 && e.length > 0);
  const hasStandstill = tvtLengthEntries.some((e) => e.level === 4 && e.length > 0);

  return {
    hasData: true,
    congestionIndex,
    tvtLengthEntries,
    tvtTotalJamLength,
    tvtUsersEntries,
    tvtWazersTotal,
    hasRoadClosure,
    hasStandstill,
  };
}

function estimateCongestionFromTvt(
  entries: Array<{ level: number; length: number }>,
  totalLength: number,
): number {
  if (totalLength === 0) return 0;
  const weights: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
  let weightedSum = 0;
  for (const e of entries) {
    weightedSum += (e.length / totalLength) * (weights[e.level] || 0);
  }
  return Math.round(Math.min(100, weightedSum));
}

function getOperationalStatus(data: TvtSummaryData): { emoji: string; label: string; description: string } {
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
    description: "Congestión severa. Tránsito denso con demoras significativas.",
  };
  if (data.congestionIndex >= 50) return {
    emoji: "🟡",
    label: "MODERADO",
    description: "Tránsito lento. Demoras moderadas, monitorear evolución.",
  };
  if (data.congestionIndex >= 25) return {
    emoji: "🟢",
    label: "LEVE",
    description: "Demora leve. Leve reducción de velocidad.",
  };
  return {
    emoji: "✅",
    label: "FLUIDO",
    description: "Sin demoras. Circulación a velocidad nominal.",
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

function getLevelColor(level: number): string {
  if (level >= 5) return "bg-gray-800 dark:bg-gray-600";
  if (level >= 4) return "bg-red-700 dark:bg-red-600";
  if (level >= 3) return "bg-red-500 dark:bg-red-500";
  if (level >= 2) return "bg-orange-500 dark:bg-orange-500";
  if (level >= 1) return "bg-yellow-400 dark:bg-yellow-400";
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
