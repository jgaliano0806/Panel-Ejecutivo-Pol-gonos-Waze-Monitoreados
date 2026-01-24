/**
 * DetailFactorCard - Card Detallado de Factor
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";
import { motion } from "framer-motion";

export interface DetailFactorCardProps {
  title: string;
  score: number;
  icon: React.ElementType;
  color: string;
}

const DetailFactorCard: React.FC<DetailFactorCardProps> = ({
  title,
  score,
  icon: Icon,
  color,
}) => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-veltrix-bg dark:to-veltrix-card rounded-xl p-6 border-2 border-gray-200 dark:border-veltrix-border">
      <div
        className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 w-fit mb-3`}
      >
        <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <h4 className="text-sm font-bold text-gray-700 dark:text-veltrix-text mb-2">
        {title}
      </h4>
      <div className="text-4xl font-black text-gray-900 dark:text-white">
        {Math.round(score)}
      </div>
      <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600`}
        />
      </div>
    </div>
  );
};

export default DetailFactorCard;
