import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Wifi } from 'lucide-react';
import { Badge } from '../ui/badge';
import { formatRelativeTime } from '../../lib/utils';

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
      className="bg-white border-b-4 border-yellow-400 shadow-lg sticky top-0 z-40"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="max-w-[1850px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo y Título */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Logo Oficial Caminos de las Sierras */}
            <motion.div
              className="h-16 w-auto flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img
                src="/logo_cs.png"
                alt="Caminos de las Sierras"
                className="h-full w-auto object-contain"
              />
            </motion.div>

            <div className="border-l-2 border-yellow-400 pl-4">
              <h1 className="text-2xl font-black text-primary-700 mb-0.5 tracking-tight">
                Panel de Control Inteligente
              </h1>
              <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Monitoreo de Tráfico en Tiempo Real
              </p>
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
            <div className="hidden md:flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
              <Clock className="w-5 h-5 text-primary-600" />
              <div>
                <div className="text-xs text-gray-500 font-semibold">Hora Actual</div>
                <div className="text-base font-bold text-gray-900 tabular-nums">
                  {currentTime.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* Última Actualización */}
            {lastUpdate && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
                <Wifi className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Última Actualización</div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatRelativeTime(lastUpdate)}
                  </div>
                </div>
              </div>
            )}

            {/* Badge de Estado */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Badge variant="success" size="lg" className="shadow-md">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                EN VIVO
              </Badge>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};
