/**
 * TrafficInfoModal - Modal de Info de Tráfico
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, X, MapPin } from "lucide-react";

export interface TrafficInfoModalProps {
  polygonId: string;
  polygonName: string;
  jamCount: number;
  onClose: () => void;
}

const TrafficInfoModal: React.FC<TrafficInfoModalProps> = ({
  polygonId,
  polygonName,
  jamCount,
  onClose,
}) => {
  const navigate = useNavigate();

  const handleViewOnMap = () => {
    onClose();
    // Navegar al mapa con el polígono seleccionado y filtro de jams
    navigate("/mapa", {
      state: {
        selectedPolygonId: polygonId,
        filterType: "jams",
        showJams: true,
        highlightTraffic: true,
      },
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
        className="bg-white dark:bg-veltrix-card rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            Tráfico - {polygonName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600 dark:text-blue-400 mb-2">
                {jamCount}
              </div>
              <p className="text-blue-800 dark:text-blue-300 font-bold">
                Atasco{jamCount !== 1 ? "s" : ""} Activo
                {jamCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-4 border border-gray-200 dark:border-veltrix-border">
            <p className="text-sm text-gray-700 dark:text-veltrix-muted">
              <strong>Información:</strong> Los atascos se detectan en tiempo
              real a través del sistema Waze. Cada atasco representa una zona
              donde la velocidad del tráfico está significativamente reducida.
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

export default TrafficInfoModal;
