import React from 'react';
import type { AlertStats } from '../types';

interface AlertsBadgeProps {
  stats: AlertStats | undefined;
  onClick?: () => void;
}

export const AlertsBadge: React.FC<AlertsBadgeProps> = ({ stats, onClick }) => {
  if (!stats || stats.active === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
        <span className="text-green-700 text-sm font-medium">✓ Sin alertas activas</span>
      </div>
    );
  }

  const { bySeverity } = stats;
  const hasCritical = bySeverity.critical > 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all hover:shadow-lg ${
        hasCritical
          ? 'bg-red-100 border-red-400 hover:bg-red-200 animate-pulse'
          : bySeverity.high > 0
          ? 'bg-orange-100 border-orange-400 hover:bg-orange-200'
          : 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">
          {hasCritical ? '🚨' : bySeverity.high > 0 ? '⚠️' : '⚡'}
        </span>
        <div className="text-left">
          <div className={`text-lg font-black ${
            hasCritical ? 'text-red-900' : bySeverity.high > 0 ? 'text-orange-900' : 'text-yellow-900'
          }`}>
            {stats.active} Alerta{stats.active !== 1 ? 's' : ''}
          </div>
          <div className="text-xs font-medium text-gray-700">
            {bySeverity.critical > 0 && (
              <span className="text-red-700 font-bold">
                {bySeverity.critical} crítica{bySeverity.critical !== 1 ? 's' : ''}
              </span>
            )}
            {bySeverity.critical > 0 && bySeverity.high > 0 && ' • '}
            {bySeverity.high > 0 && (
              <span className="text-orange-700">
                {bySeverity.high} alta{bySeverity.high !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

