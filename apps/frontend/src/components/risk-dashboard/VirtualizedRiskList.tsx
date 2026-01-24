/**
 * VirtualizedRiskList - Lista Virtualizada de Riesgos (Performance)
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 * Usa @tanstack/react-virtual para renderizado eficiente de listas largas
 */

import React, { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2 } from "lucide-react";
import PolygonRiskCard from "./PolygonRiskCard";
import type { RiskScore } from "../../hooks/useRiskScoring";

export interface VirtualizedRiskListProps {
  scores: RiskScore[];
  selectedPolygon: RiskScore | null;
  onPolygonClick: (score: RiskScore) => void;
  onFactorClick: (
    type: "traffic" | "incidents" | "weather",
    polygonId: string,
  ) => void;
}

const VirtualizedRiskList: React.FC<VirtualizedRiskListProps> = ({
  scores,
  selectedPolygon,
  onPolygonClick,
  onFactorClick,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: scores.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Altura estimada de cada card
    overscan: 3,
  });

  const scrollToPolygon = useCallback(
    (polygonId: string) => {
      const index = scores.findIndex((s) => s.polygon_id === polygonId);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, {
          align: "center",
          behavior: "smooth",
        });
      }
    },
    [scores, virtualizer],
  );

  if (scores.length === 0) {
    return (
      <div className="bg-white dark:bg-veltrix-card rounded-xl shadow-lg p-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-veltrix-muted text-lg">
          No hay tramos con este nivel de riesgo
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] overflow-auto rounded-xl"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const score = scores[virtualRow.index];
          if (!score) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: "16px",
              }}
            >
              <PolygonRiskCard
                score={score}
                index={virtualRow.index}
                isSelected={selectedPolygon?.polygon_id === score.polygon_id}
                onClick={() => onPolygonClick(score)}
                onFactorClick={onFactorClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedRiskList;
