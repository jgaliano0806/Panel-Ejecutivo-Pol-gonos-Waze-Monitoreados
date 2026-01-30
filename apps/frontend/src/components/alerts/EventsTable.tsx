import React from "react";
import { BlockingAnalysisItem } from "../../hooks/useWazeData";
import {
  getIncidentDescription,
  getIncidentColor,
} from "../../utils/wazeTranslations";
import { WazeIcon } from "../ui/WazeIcon";
import { MapPin, ExternalLink } from "lucide-react";

interface EventsTableProps {
  analyses: BlockingAnalysisItem[];
  onViewMap: (analysis: BlockingAnalysisItem) => void;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  analyses,
  onViewMap,
}) => {
  return (
    <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">
          <tr>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Ubicación</th>
            <th className="px-4 py-3">Tiempo</th>
            <th className="px-4 py-3 text-right">Demora</th>
            <th className="px-4 py-3 text-right">Impacto</th>
            <th className="px-4 py-3 text-center">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
          {analyses.map((analysis) => {
            const description = getIncidentDescription(
              analysis.incident.type,
              analysis.incident.subtype,
            );

            const timestamp = new Date(analysis.incident.timestamp);

            return (
              <tr
                key={analysis.incident.id}
                className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <WazeIcon
                        type={analysis.incident.type}
                        subtype={analysis.incident.subtype}
                        size="sm"
                      />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {description}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span
                        className="text-gray-900 dark:text-gray-200 font-medium truncate max-w-[200px]"
                        title={analysis.incident.street}
                      >
                        {analysis.incident.street ||
                          analysis.incident.description ||
                          analysis.polygonName ||
                          "Ubicación en mapa"}
                      </span>
                      {analysis.incident.city && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {analysis.incident.city}
                        </span>
                      )}
                      {analysis.polygonName && (
                        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 truncate max-w-[200px]">
                          {analysis.polygonName}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {timestamp.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono font-medium ${analysis.delay.totalDelayMinutes > 15 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    {Math.round(analysis.delay.totalDelayMinutes)} min
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs font-bold text-gray-700 dark:text-gray-300">
                    {analysis.impactScore}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onViewMap(analysis)}
                    className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors"
                    title="Ver en mapa"
                  >
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
