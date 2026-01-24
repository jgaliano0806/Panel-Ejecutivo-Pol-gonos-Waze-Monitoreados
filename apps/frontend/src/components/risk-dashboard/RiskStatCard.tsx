/**
 * RiskStatCard - Tarjeta de Estadística de Riesgo
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";
import { motion } from "framer-motion";

export interface RiskStatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "green" | "yellow" | "orange" | "red" | "purple";
  levelKey?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const RiskStatCard: React.FC<RiskStatCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  isSelected,
  onClick,
}) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 border-blue-400",
    green: "from-green-500 to-green-600 border-green-400",
    yellow: "from-yellow-500 to-yellow-600 border-yellow-400",
    orange: "from-orange-500 to-orange-600 border-orange-400",
    red: "from-red-500 to-red-600 border-red-400",
    purple: "from-purple-500 to-purple-600 border-purple-400",
  };

  const borderColors = {
    blue: "border-blue-400 dark:border-blue-500",
    green: "border-green-400 dark:border-green-500",
    yellow: "border-yellow-400 dark:border-yellow-500",
    orange: "border-orange-400 dark:border-orange-500",
    red: "border-red-400 dark:border-red-500",
    purple: "border-purple-400 dark:border-purple-500",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-veltrix-card rounded-xl shadow-lg p-6 cursor-pointer transition-all border-l-4 ${
        borderColors[color]
      } ${
        isSelected
          ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-veltrix-bg"
          : "hover:shadow-xl"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-md`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-3xl font-black text-gray-900 dark:text-white">
          {value}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-veltrix-muted">
        {label}
      </p>
      {value > 0 && (
        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-medium">
          Clic para filtrar
        </p>
      )}
    </motion.button>
  );
};

export default RiskStatCard;
