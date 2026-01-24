import React, { useMemo } from "react";
import type { TrafficJam } from "../../types";
import { getRoadTypeTranslation } from "../../utils/wazeTranslations";

interface RoadTypeStatsProps {
  jams: TrafficJam[];
}

interface RoadTypeStat {
  roadType: number;
  name: string;
  jamCount: number;
  avgSpeed: number;
  avgDelay: number;
  totalLength: number;
}

export const RoadTypeStats: React.FC<RoadTypeStatsProps> = ({ jams }) => {
  const stats = useMemo(() => {
    const grouped = new globalThis.Map<number, TrafficJam[]>();

    for (const jam of jams) {
      if (!jam.roadType) continue;
      if (!grouped.has(jam.roadType)) {
        grouped.set(jam.roadType, []);
      }
      grouped.get(jam.roadType)!.push(jam);
    }

    const statsArray: RoadTypeStat[] = [];

    for (const [roadType, roadJams] of grouped.entries()) {
      const totalSpeed = roadJams.reduce((sum, j) => sum + j.speed, 0);
      const totalDelay = roadJams.reduce((sum, j) => sum + j.delay, 0);
      const totalLength = roadJams.reduce((sum, j) => sum + j.length, 0);

      statsArray.push({
        roadType,
        name: getRoadTypeTranslation(roadType),
        jamCount: roadJams.length,
        avgSpeed: totalSpeed / roadJams.length,
        avgDelay: totalDelay / roadJams.length,
        totalLength,
      });
    }

    return statsArray.sort((a, b) => b.jamCount - a.jamCount).slice(0, 6);
  }, [jams]);

  if (stats.length === 0) return null;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        🛣️ Análisis por Tipo de Ruta
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">
                Tipo
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">
                Atascos
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">
                Vel. Prom.
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">
                Demora Prom.
              </th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">
                Long. Total
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr
                key={stat.roadType}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3 font-medium">{stat.name}</td>
                <td className="text-center py-2 px-3">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                    {stat.jamCount}
                  </span>
                </td>
                <td className="text-center py-2 px-3">
                  <span
                    className={`inline-block px-2 py-1 rounded font-semibold ${
                      stat.avgSpeed < 20
                        ? "bg-red-100 text-red-800"
                        : stat.avgSpeed < 40
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {stat.avgSpeed.toFixed(0)} km/h
                  </span>
                </td>
                <td className="text-center py-2 px-3">
                  {Math.round(stat.avgDelay / 60)} min
                </td>
                <td className="text-center py-2 px-3">
                  {(stat.totalLength / 1000).toFixed(1)} km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
