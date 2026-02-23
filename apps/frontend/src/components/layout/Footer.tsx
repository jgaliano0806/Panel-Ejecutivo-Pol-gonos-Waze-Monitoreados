import React from "react";
import { motion } from "framer-motion";
import { COMPANY_INFO } from "../../config/constants";

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700">
      <div className="relative max-w-[1900px] mx-auto px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Copyright */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">© {new Date().getFullYear()}</span>
            <span className="font-bold text-white">{COMPANY_INFO.name}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">Desarrollado por</span>
            <span className="font-bold text-white">GED</span>
          </div>

          {/* Leyenda de Estados */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-green-400 to-green-600"></div>
              <span className="text-gray-300">Fluido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-yellow-400 to-orange-500"></div>
              <span className="text-gray-300">Moderado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-red-500 to-red-700"></div>
              <span className="text-gray-300">Crítico</span>
            </div>
          </div>

          {/* Fuente de datos */}
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 bg-green-400 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-gray-400">Waze for Cities</span>
            <span className="text-gray-500">•</span>
            <span className="text-green-400 font-medium">
              Tiempo real vía WebSocket
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
