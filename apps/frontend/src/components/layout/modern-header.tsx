import React from "react";
import { motion } from "framer-motion";
import { Clock, Wifi, RefreshCw, Moon, Sun, Bell, Volume2, VolumeX } from "lucide-react";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "../../lib/utils";
import { COMPANY_INFO, UI_TEXTS } from "../../config/constants";
import { useThemeStore } from "../../stores/useThemeStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useNavigate } from "react-router-dom";
import { initializeAudio, isTTSMuted, toggleTTSMuted } from "@/lib/tts-utils";

interface ModernHeaderProps {
  lastUpdate?: Date;
  onRefresh?: () => void;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  lastUpdate,
  onRefresh,
}) => {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [ttsMuted, setTtsMuted] = React.useState(() => isTTSMuted());
  const { isDark, toggleTheme } = useThemeStore();

  // Sincronizar estado si cambia desde otro componente
  React.useEffect(() => {
    const onMuteChange = (e: Event) => setTtsMuted((e as CustomEvent<boolean>).detail);
    window.addEventListener("tts-mute-change", onMuteChange);
    return () => window.removeEventListener("tts-mute-change", onMuteChange);
  }, []);

  const handleTTSToggle = async () => {
    // Asegurar que el audio del navegador esté desbloqueado al primer uso
    await initializeAudio();
    const nowMuted = toggleTTSMuted();
    setTtsMuted(nowMuted);
  };
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const navigate = useNavigate();

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <motion.header
      className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-veltrix-card dark:via-veltrix-card dark:to-veltrix-card border-b-4 border-yellow-400 dark:border-veltrix-border shadow-2xl sticky top-0 z-40 backdrop-blur-sm transition-colors duration-300"
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
              className="h-20 w-auto flex items-center justify-center bg-white dark:bg-veltrix-bg rounded-xl shadow-lg p-2 transition-colors border dark:border-veltrix-border"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img
                src={COMPANY_INFO.logoPath}
                alt={COMPANY_INFO.name}
                className="h-full w-auto object-contain"
              />
            </motion.div>

            <div className="border-l-4 border-yellow-400 dark:border-veltrix-border pl-5 transition-colors">
              <motion.h1
                className="text-3xl font-black bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent mb-1 tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {UI_TEXTS.appTitle}
              </motion.h1>
              <motion.p
                className="text-sm text-gray-600 dark:text-veltrix-muted font-semibold flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.span
                  className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
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
            {/* Toggle Theme */}
            <motion.button
              onClick={toggleTheme}
              className={`p-3 rounded-xl border-2 transition-all duration-300 shadow-lg ${
                isDark
                  ? "bg-veltrix-bg border-veltrix-border text-veltrix-warning hover:bg-veltrix-card"
                  : "bg-white border-gray-200 text-orange-500 hover:bg-gray-50"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isDark ? "Modo Claro" : "Modo Oscuro"}
            >
              {isDark ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </motion.button>

            {/* Botón TTS — toggle mute/unmute */}
            <motion.button
              onClick={handleTTSToggle}
              className={`p-3 rounded-xl border-2 transition-all duration-300 shadow-lg ${
                ttsMuted
                  ? "bg-white dark:bg-veltrix-bg border-red-200 dark:border-red-800/50 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400"
                  : "bg-white dark:bg-veltrix-bg border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={ttsMuted ? "Sonido desactivado — clic para activar" : "Sonido activado — clic para silenciar"}
            >
              {ttsMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </motion.button>

            {/* Notifications Bell */}
            <motion.button
              onClick={() => navigate("/notificaciones")}
              className="relative p-3 rounded-xl border-2 transition-all duration-300 shadow-lg bg-white dark:bg-veltrix-bg border-gray-200 dark:border-veltrix-border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-veltrix-card"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </motion.button>

            {/* Hora Actual */}
            <motion.div
              className="hidden md:flex items-center gap-3 bg-gradient-to-br from-white to-gray-50 dark:from-veltrix-bg dark:to-veltrix-card rounded-xl px-5 py-3 border-2 border-gray-200 dark:border-veltrix-border shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-2 shadow-md">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-veltrix-muted font-bold uppercase tracking-wide">
                  Hora Actual
                </div>
                <div className="text-lg font-black text-gray-900 dark:text-veltrix-text tabular-nums">
                  {currentTime.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </div>
              </div>
            </motion.div>

            {/* Última Actualización */}
            {lastUpdate && (
              <motion.div
                className="hidden lg:flex items-center gap-3 bg-gradient-to-br from-white to-green-50 dark:from-veltrix-bg dark:to-veltrix-card rounded-xl px-5 py-3 border-2 border-green-200 dark:border-veltrix-border shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 shadow-md">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-veltrix-muted font-bold uppercase tracking-wide">
                    Última Actualización
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-veltrix-text">
                    {formatRelativeTime(lastUpdate)}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Botón de Actualización Forzada */}
            {onRefresh && (
              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl px-5 py-3 border-2 border-blue-400 shadow-lg hover:shadow-xl transition-all duration-300 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isRefreshing ? 1 : 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                animate={isRefreshing ? { rotate: 360 } : {}}
                transition={
                  isRefreshing
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : {}
                }
                title="Actualizar todos los feeds"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="text-sm hidden sm:inline">Actualizar</span>
              </motion.button>
            )}

            {/* Badge de Estado */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.1 }}
            >
              <Badge
                variant="success"
                size="lg"
                className="shadow-xl shadow-green-500/30 border-2 border-green-400 dark:border-green-600"
              >
                <motion.span
                  className="w-2.5 h-2.5 bg-white rounded-full mr-2 shadow-lg"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.6, 1],
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
