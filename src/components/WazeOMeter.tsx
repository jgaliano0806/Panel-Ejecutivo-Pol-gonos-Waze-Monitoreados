import React, { useMemo } from 'react';
import type { TrafficJam } from '../types';
import { APP_CONSTANTS } from '../config/constants';

interface WazeOMeterProps {
  jams: TrafficJam[];
  title?: string;
}

export const WazeOMeter: React.FC<WazeOMeterProps> = ({ jams, title = "Estado de la Red Vial" }) => {
  const meterData = useMemo(() => {
    // Calcular longitud reportada por jamLevel
    const lengthByLevel = [0, 0, 0, 0, 0, 0]; // indices 0-5 para jamLevel 0-5

    for (const jam of jams) {
      const level = jam.level ?? 0;
      lengthByLevel[level] += jam.length;
    }

    const reportedKm = lengthByLevel.reduce((sum, len) => sum + len, 0) / 1000;

    // Usar el total de la RAC definido o el reportado si es mayor (caso borde)
    const totalKm = Math.max(APP_CONSTANTS.TOTAL_NETWORK_KM, reportedKm);

    // Asumir que toda la diferencia es Flujo Libre (Nivel 0)
    // Waze reporta por excepción, así que si no hay jam, se asume fluido.
    const freeFlowKm = (totalKm - reportedKm) * 1000; // a metros
    lengthByLevel[0] += freeFlowKm;

    // Recalcular porcentajes sobre el TOTAL de la Red
    const levelPercentages = lengthByLevel.map(len =>
      totalKm > 0 ? (len / (totalKm * 1000)) * 100 : 0
    );

    // Encontrar nivel dominante (el que tiene más km)
    // Normalmente será 0 (Fluido) ahora
    const dominantLevel = lengthByLevel.indexOf(Math.max(...lengthByLevel));

    // Determinar estado y color
    let status = '';
    let color = '';

    // Ajustar lógica de estado para dar prioridad a alertas si hay porcentaje significativo de bloqueo
    // Aunque el dominante sea verde, si hay mucho rojo, avisar
    const criticalPercentage = levelPercentages[4] + levelPercentages[5];
    const warningPercentage = levelPercentages[2] + levelPercentages[3];

    if (criticalPercentage > 5) {
      status = 'Red Comprometida';
      color = 'red';
    } else if (warningPercentage > 15) {
      status = 'Tránsito Pesado';
      color = 'orange';
    } else if (dominantLevel === 0 || dominantLevel === 1) {
      status = 'Red Operativa'; // Cambio de nombre para reflejar estado global
      color = 'green';
    } else if (dominantLevel === 2) {
      status = 'Tránsito Moderado';
      color = 'yellow';
    } else {
      // Fallback
      status = 'Bloqueado';
      color = 'darkred';
    }

    return {
      levelPercentages,
      totalKm: Number(totalKm.toFixed(0)), // Redondear km totales
      dominantLevel,
      status,
      color,
      lengthByLevel: lengthByLevel.map(l => Number((l / 1000).toFixed(2))),
    };
  }, [jams]);

  const levels = [
    { level: 0, label: 'Sin Congestión', color: '#22c55e', emoji: '🟢' },
    { level: 1, label: 'Circulación Lenta', color: '#84cc16', emoji: '🟢' },
    { level: 2, label: 'Demoras Moderadas', color: '#facc15', emoji: '🟡' },
    { level: 3, label: 'Tráfico Intenso', color: '#f97316', emoji: '🟠' },
    { level: 4, label: 'Muy Congestionado', color: '#ef4444', emoji: '🔴' },
    { level: 5, label: 'Tráfico Detenido', color: '#991b1b', emoji: '🔴' },
  ];

  const getStatusColor = () => {
    switch (meterData.color) {
      case 'green': return 'bg-green-100 border-green-400 text-green-900';
      case 'yellow': return 'bg-yellow-100 border-yellow-400 text-yellow-900';
      case 'orange': return 'bg-orange-100 border-orange-400 text-orange-900';
      case 'red': return 'bg-red-100 border-red-400 text-red-900';
      case 'darkred': return 'bg-red-200 border-red-600 text-red-950';
      default: return 'bg-gray-100 border-gray-400 text-gray-900';
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>

      {/* Estado Principal */}
      <div className={`border-2 rounded-lg p-4 mb-4 ${getStatusColor()}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">{levels[meterData.dominantLevel].emoji}</div>
          <div className="text-2xl font-black">{meterData.status}</div>
          <div className="text-sm font-medium mt-1">
            {meterData.totalKm} km totales monitoreados
          </div>
        </div>
      </div>

      {/* Barra de Distribución Visual */}
      <div className="mb-4">
        <div className="flex h-8 rounded-lg overflow-hidden border-2 border-gray-300">
          {levels.map((level, index) => {
            const percentage = meterData.levelPercentages[index];
            if (percentage === 0) return null;

            return (
              <div
                key={level.level}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: level.color,
                }}
                className="flex items-center justify-center text-white text-xs font-bold"
                title={`${level.label}: ${percentage.toFixed(1)}%`}
              >
                {percentage > 8 && `${percentage.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desglose por Nivel */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-600 uppercase mb-2">
          Distribución por Nivel
        </h3>

        {levels.map((level, index) => {
          const km = meterData.lengthByLevel[index];
          const percentage = meterData.levelPercentages[index];

          if (km === 0) return null;

          return (
            <div key={level.level} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: level.color }}
              />
              <div className="flex-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{level.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{km} km</span>
                  <span className="text-gray-500">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          📍 Monitoreando {jams.length} puntos en tiempo real
        </p>
      </div>
    </div>
  );
};

