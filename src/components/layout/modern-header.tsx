import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Wifi } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
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
      className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 border-b-4 border-blue-500 shadow-2xl sticky top-0 z-40"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="max-w-[1850px] mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo y Título */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-blue-400 rounded-xl blur-lg"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-xl">
                <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                Panel Ejecutivo de Tráfico
              </h1>
              <p className="text-sm text-blue-200 font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Sistema de Monitoreo Waze
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
            <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
              <Clock className="w-5 h-5 text-blue-200" />
              <div>
                <div className="text-xs text-blue-200 font-semibold">Hora Actual</div>
                <div className="text-lg font-bold text-white tabular-nums">
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
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20">
                <Wifi className="w-5 h-5 text-green-300" />
                <div>
                  <div className="text-xs text-blue-200 font-semibold">Última Actualización</div>
                  <div className="text-sm font-bold text-white">
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
              <Badge variant="success" size="lg" className="shadow-lg">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                OPERATIVO
              </Badge>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};
