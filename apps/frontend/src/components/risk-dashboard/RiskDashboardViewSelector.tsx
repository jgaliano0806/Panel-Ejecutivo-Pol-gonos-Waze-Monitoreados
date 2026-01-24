import React from "react";
import { motion } from "framer-motion";
import { List, LayoutGrid, Map as MapIcon } from "lucide-react";

export type RiskViewMode = "list" | "matrix" | "heatmap";

interface RiskDashboardViewSelectorProps {
  currentView: RiskViewMode;
  onChange: (view: RiskViewMode) => void;
}

export const RiskDashboardViewSelector: React.FC<
  RiskDashboardViewSelectorProps
> = ({ currentView, onChange }) => {
  const tabs = [
    { id: "list", label: "Lista", icon: List },
    { id: "matrix", label: "Matriz Estratégica", icon: LayoutGrid },
    { id: "heatmap", label: "Mapa de Calor", icon: MapIcon },
  ] as const;

  return (
    <div className="bg-gray-100 dark:bg-veltrix-bg/50 p-1 rounded-xl flex items-center shadow-inner border border-gray-200 dark:border-veltrix-border/50 w-fit">
      {tabs.map((tab) => {
        const isActive = currentView === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id as RiskViewMode)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isActive
                ? "text-primary-700 dark:text-primary-300"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeViewTab"
                className="absolute inset-0 bg-white dark:bg-veltrix-card shadow-sm rounded-lg border border-gray-200 dark:border-veltrix-border"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
