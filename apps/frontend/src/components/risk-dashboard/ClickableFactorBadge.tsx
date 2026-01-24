/**
 * ClickableFactorBadge - Badge de Factor Clickeable
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";
import { motion } from "framer-motion";

export interface ClickableFactorBadgeProps {
  icon: React.ElementType;
  label: string;
  description: string;
  severity: number;
  onClick?: (e: React.MouseEvent) => void;
  clickable: boolean;
}

const ClickableFactorBadge: React.FC<ClickableFactorBadgeProps> = ({
  icon: Icon,
  label,
  description,
  severity,
  onClick,
  clickable,
}) => {
  const getColor = (val: number) => {
    if (val >= 80)
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-500/30";
    if (val >= 60)
      return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-500/30";
    if (val >= 40)
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-500/30";
    return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-500/30";
  };

  return (
    <motion.div
      onClick={clickable ? onClick : undefined}
      className={`p-3 rounded-lg border-2 ${getColor(
        severity,
      )} transition-all ${
        clickable ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""
      }`}
      whileHover={clickable ? { scale: 1.02 } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-bold uppercase">{label}</span>
      </div>
      <p className="text-xs font-semibold leading-tight">{description}</p>
      {clickable && (
        <p className="text-[10px] mt-1 opacity-70">Clic para detalles</p>
      )}
    </motion.div>
  );
};

export default ClickableFactorBadge;
