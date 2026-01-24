import React from "react";
import type { AlertStats } from "../../types";

interface AlertsBadgeProps {
  stats: AlertStats;
  onClick: () => void;
}

export const AlertsBadge: React.FC<AlertsBadgeProps> = ({ stats, onClick }) => {
  const { bySeverity } = stats;

  if (bySeverity.critical === 0 && bySeverity.high === 0) {
    return null;
  }

  return (
    <div
      onClick={onClick}
      className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg p-4 cursor-pointer hover:from-red-700 hover:to-red-800 transition-all shadow-lg animate-pulse"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚨</span>
          <div>
            <h3 className="font-bold text-lg">Alertas Críticas Activas</h3>
            <p className="text-sm text-red-100">
              {bySeverity.critical} crítica
              {bySeverity.critical !== 1 ? "s" : ""}, {bySeverity.high} alta
              {bySeverity.high !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black">{bySeverity.critical}</div>
          <div className="text-xs text-red-100">CRÍTICAS</div>
        </div>
      </div>
    </div>
  );
};
