import React from "react";
import {
  Incident,
  IncidentsPagination,
  translateIncidentType,
  translateIncidentSubtype,
  getIncidentTypeColor,
} from "@/hooks/useIncidentsModule";
import {
  formatRelativeTime,
  getSeverityColor,
  formatStreetName,
} from "@/lib/utils";
import {
  MapPin,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Car,
  Construction,
} from "lucide-react";

interface IncidentsTableProps {
  incidents: Incident[];
  pagination?: IncidentsPagination;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onViewDetail: (incident: Incident) => void;
}

// Iconos por tipo
const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const icons: Record<string, React.ReactNode> = {
    ACCIDENT: <Car className="w-4 h-4" />,
    HAZARD: <AlertTriangle className="w-4 h-4" />,
    ROAD_CLOSED: <Construction className="w-4 h-4" />,
  };
  return <>{icons[type] || <AlertTriangle className="w-4 h-4" />}</>;
};

export const IncidentsTable: React.FC<IncidentsTableProps> = ({
  incidents,
  pagination,
  isLoading,
  onPageChange,
  onViewDetail,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Cargando incidentes...
          </span>
        </div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No se encontraron incidentes
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Intenta ajustar los filtros para ver más resultados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Subtipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Confianza
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {incidents.map((incident) => (
              <tr
                key={incident.uuid}
                className="hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
              >
                {/* Tipo */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${getIncidentTypeColor(incident.type)}`}
                  >
                    <TypeIcon type={incident.type} />
                    {translateIncidentType(incident.type)}
                  </span>
                </td>

                {/* Subtipo */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {translateIncidentSubtype(incident.subtype)}
                  </span>
                </td>

                {/* Ubicación */}
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {formatStreetName(incident.street)}
                      </p>
                      {incident.city && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {incident.city}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Fecha */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(incident.createdAt)}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      incident.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {incident.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>

                {/* Confianza */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(incident.confidence / 10) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {incident.confidence?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onViewDetail(incident)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Ver detalle y exportar PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            <span className="font-semibold">{pagination.total}</span> incidentes
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Página anterior"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {pagination.page} de {pagination.totalPages}
            </span>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
