/**
 * IncidentsInfoModal - Modal de Info de Incidentes
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle as AlertIcon, X, MapPin } from "lucide-react";

export interface IncidentsInfoModalProps {
  polygonId: string;
  polygonName: string;
  incidentCount: number;
  onClose: () => void;
}

const IncidentsInfoModal: React.FC<IncidentsInfoModalProps> = ({
  polygonId,
  polygonName,
  incidentCount,
  onClose,
}) => {
  const navigate = useNavigate();

  const handleViewOnMap = () => {
    onClose();
    // Navegar al mapa con el polígono seleccionado y filtro de alertas
    navigate("/mapa", {
      state: {
        selectedPolygonId: polygonId,
        filterType: "alerts",
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-veltrix-card rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertIcon className="w-6 h-6 text-red-600" />
            Incidentes - {polygonName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-800">
            <div className="text-center">
              <div className="text-5xl font-black text-red-600 dark:text-red-400 mb-2">
                {incidentCount}
              </div>
              <p className="text-red-800 dark:text-red-300 font-bold">
                Incidente{incidentCount !== 1 ? "s" : ""} Reportado
                {incidentCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-4 border border-gray-200 dark:border-veltrix-border">
            <p className="text-sm text-gray-700 dark:text-veltrix-muted mb-3">
              <strong>Tipos de incidentes:</strong>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-veltrix-muted">
                  Accidentes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-veltrix-muted">
                  Obras en vía
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-veltrix-muted">
                  Peligros
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-veltrix-muted">
                  Cortes de vía
                </span>
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

export default IncidentsInfoModal;
