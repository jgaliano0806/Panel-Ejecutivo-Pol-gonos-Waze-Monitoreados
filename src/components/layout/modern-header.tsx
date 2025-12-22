import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Wifi } from 'lucide-react';
import { Badge } from '../ui/badge';
import { formatRelativeTime } from '../../lib/utils';
import { COMPANY_INFO, UI_TEXTS } from '../../config/constants';

interface ModernHeaderProps {
  lastUpdate?: Date;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({ lastUpdate }) => {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.header
      className="bg-gradient-to-r from-white via-gray-50 to-white border-b-4 border-yellow-400 shadow-2xl sticky top-0 z-40 backdrop-blur-sm"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="max-w-[1900px] mx-auto px-8 py-5">
        <div className="flex items-center justify-between">
          {/* Logo y Título */}
          <motion.div
            className="flex items-center gap-5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Logo Oficial Caminos de las Sierras */}
            <motion.div
              className="h-20 w-auto flex items-center justify-center bg-white rounded-xl shadow-lg p-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img
                src={COMPANY_INFO.logoPath}
                alt={COMPANY_INFO.name}
                className="h-full w-auto object-contain"
              />
            </motion.div>

            <div className="border-l-4 border-yellow-400 pl-5">
              <motion.h1
                className="text-3xl font-black bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 bg-clip-text text-transparent mb-1 tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {UI_TEXTS.appTitle}
              </motion.h1>
              <motion.p
                className="text-sm text-gray-600 font-semibold flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.span
                  className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {UI_TEXTS.appSubtitle}
              </motion.p>
            </div>
          </motion.div>

          {/* Información de Estado */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Hora Actual */}
            <motion.div
              className="hidden md:flex items-center gap-3 bg-gradient-to-br from-white to-gray-50 rounded-xl px-5 py-3 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-2 shadow-md">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Hora Actual</div>
                <div className="text-lg font-black text-gray-900 tabular-nums">
                  {currentTime.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </motion.div>

            {/* Última Actualización */}
            {lastUpdate && (
              <motion.div
                className="flex items-center gap-3 bg-gradient-to-br from-white to-green-50 rounded-xl px-5 py-3 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 shadow-md">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Última Actualización</div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatRelativeTime(lastUpdate)}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Badge de Estado */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.1 }}
            >
              <Badge variant="success" size="lg" className="shadow-xl shadow-green-500/30 border-2 border-green-400">
                <motion.span
                  className="w-2.5 h-2.5 bg-white rounded-full mr-2 shadow-lg"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.6, 1]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-black text-sm">EN VIVO</span>
              </Badge>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};
