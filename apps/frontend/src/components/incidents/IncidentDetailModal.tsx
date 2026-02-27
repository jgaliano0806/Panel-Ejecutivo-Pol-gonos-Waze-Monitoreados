import React from "react";
import {
  Incident,
  translateIncidentType,
  translateIncidentSubtype,
  getIncidentTypeColor,
} from "@/hooks/useIncidentsModule";
import {
  X,
  MapPin,
  Clock,
  User,
  ThumbsUp,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { MiniMapLibre } from "../map/MiniMapLibre";

interface IncidentDetailModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOnMap: (incident: Incident) => void;
  onExportPDF: (incident: Incident) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose,
  onViewOnMap,
  onExportPDF,
}) => {
  if (!isOpen || !incident) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${incident.location.lat},${incident.location.lng}`;
  const wazeUrl = `https://www.waze.com/ul?ll=${incident.location.lat},${incident.location.lng}&navigate=yes`;

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white ${getIncidentTypeColor(incident.type)}`}
              >
                <AlertTriangle className="w-4 h-4" />
                {translateIncidentType(incident.type)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  incident.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {incident.isActive ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Activo
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactivo
                  </>
                )}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Cerrar"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Minimapa con MiniMapLibre */}
            <div className="h-48 bg-gray-100 dark:bg-gray-900 relative">
              <MiniMapLibre
                center={[incident.location.lat, incident.location.lng]}
                zoom={15}
                height="192px"
                markers={[
                  {
                    lat: incident.location.lat,
                    lng: incident.location.lng,
                    type: incident.type,
                    subtype: incident.subtype,
                    id: incident.uuid,
                  },
                ]}
              />
              <div className="absolute bottom-2 right-2 flex gap-2 z-10">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver en Google Maps
                </a>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver en Waze
                </a>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información principal */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {translateIncidentSubtype(incident.subtype)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {incident.uuid}
                </p>
              </div>

              {/* Grid de detalles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ubicación */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Ubicación
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {incident.street ||
                        `${incident.location.lat.toFixed(5)}, ${incident.location.lng.toFixed(5)}`}
                    </p>
                    {incident.city && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {incident.city}, {incident.country}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {incident.location.lat.toFixed(6)},{" "}
                      {incident.location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Fecha */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Clock className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Fecha de reporte
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {formatDate(incident.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Reportado por */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <User className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Reportado por
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {incident.reportBy || "Usuario anónimo"}
                    </p>
                  </div>
                </div>

                {/* Polígono */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Polígono
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {incident.polygonId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas de Waze */}
              <div className="grid grid-cols-3 gap-4">
                <div
                  className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  title="Experiencia del usuario que reportó el incidente (escala 1-10 del feed Waze)"
                >
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-lg font-bold">
                      {incident.reliability != null
                        ? incident.reliability.toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-xs opacity-70">/10</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Experiencia del reportador
                  </p>
                </div>

                <div
                  className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  title="Nivel de confirmación por la comunidad Waze (escala 1-5 del feed oficial)"
                >
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                    <Star className="w-4 h-4" />
                    <span className="text-lg font-bold">
                      {incident.confidence != null
                        ? incident.confidence.toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-xs opacity-70">/5</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Verificado por comunidad
                  </p>
                </div>

                <div
                  className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                  title="Cantidad de usuarios Waze que pasaron por el lugar y confirmaron el reporte"
                >
                  <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-lg font-bold">
                      {incident.thumbsUp || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Wazers lo confirmaron
                  </p>
                </div>
              </div>

              {/* Descripción */}
              {incident.description && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Descripción del reporte
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {incident.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={() => onViewOnMap(incident)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Ver en el mapa
            </button>
            <button
              onClick={() => onExportPDF(incident)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
