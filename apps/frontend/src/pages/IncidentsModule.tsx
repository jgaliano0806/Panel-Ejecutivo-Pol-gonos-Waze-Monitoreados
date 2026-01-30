import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentsModule, Incident } from "@/hooks/useIncidentsModule";
import { IncidentFilters } from "@/components/incidents/IncidentFilters";
import { IncidentsTable } from "@/components/incidents/IncidentsTable";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { exportIncidentToPDF } from "@/lib/pdf-export";
import {
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";

export const IncidentsModule: React.FC = () => {
  const navigate = useNavigate();
  const {
    incidents,
    pagination,
    types,
    subtypesByType,
    stats,
    isLoading,
    isLoadingTypes,
    filters,
    updateFilters,
    clearFilters,
    setPage,
    refresh,
  } = useIncidentsModule();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Ver detalle
  const handleViewDetail = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  }, []);

  // Ver en mapa
  const handleViewOnMap = useCallback(
    (incident: Incident) => {
      // Navegar al mapa con las coordenadas como parámetro
      navigate(
        `/mapa?lat=${incident.location.lat}&lng=${incident.location.lng}&zoom=16&highlight=${incident.uuid}`,
      );
    },
    [navigate],
  );

  // Exportar PDF
  const handleExportPDF = useCallback(async (incident: Incident) => {
    try {
      await exportIncidentToPDF(incident);
    } catch (error) {
      console.error("Error exportando PDF:", error);
      alert("Error al generar el PDF. Por favor intente nuevamente.");
    }
  }, []);

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedIncident(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Módulo de Incidentes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestión y análisis de incidentes de Waze
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualizar
          </button>
          <button
            onClick={() =>
              alert("Exportar todos los incidentes filtrados a CSV/Excel")
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.summary.total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total de incidentes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.summary.active.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Activos ahora
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pagination?.total.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Resultados filtrados
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.summary.newest
                    ? new Date(stats.summary.newest).toLocaleDateString("es-AR")
                    : "N/A"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Último incidente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <IncidentFilters
        filters={filters}
        types={types}
        subtypesByType={subtypesByType}
        onFilterChange={updateFilters}
        onClearFilters={clearFilters}
        isLoading={isLoadingTypes}
      />

      {/* Tabla */}
      <IncidentsTable
        incidents={incidents}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={setPage}
        onViewDetail={handleViewDetail}
      />

      {/* Modal de detalle */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onViewOnMap={(incident) => {
          handleCloseModal();
          handleViewOnMap(incident);
        }}
        onExportPDF={handleExportPDF}
      />
    </div>
  );
};

export default IncidentsModule;
