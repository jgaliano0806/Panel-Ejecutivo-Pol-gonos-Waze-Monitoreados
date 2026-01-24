/**
 * WeatherInfoCard - Card de Info del Clima
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";

export interface WeatherInfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subvalue: string;
}

const WeatherInfoCard: React.FC<WeatherInfoCardProps> = ({
  icon: Icon,
  label,
  value,
  subvalue,
}) => (
  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800/30">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
      <span className="text-sm font-bold text-gray-700 dark:text-veltrix-text">
        {label}
      </span>
    </div>
    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-600 dark:text-veltrix-muted mt-1">
      {subvalue}
    </p>
  </div>
);

export default WeatherInfoCard;
