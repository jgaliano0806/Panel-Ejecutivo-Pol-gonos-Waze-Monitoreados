/**
 * LoginPage
 * Página de inicio de sesión con diseño premium
 * Glassmorphism + animaciones + branding CASISA
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  // Selectores finos: evitan re-renders por cambios de otras props del auth store
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const checkSession = useAuthStore((s) => s.checkSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    checkSession().then((authenticated) => {
      if (authenticated) {
        navigate("/", { replace: true });
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      navigate("/", { replace: true });
    }
  };

  if (isLoading && !isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 relative overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-green-600/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-emerald-600/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-500/5 rounded-full blur-2xl" />
      </div>

      {/* Grid decorativo */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card principal con glassmorphism */}
        <div className="backdrop-blur-2xl bg-white/[0.07] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center items-center h-16 mb-4"
            >
              <img
                src="/logo_cs.png"
                alt="Caminos de las Sierras S.A."
                className="h-full w-auto object-contain drop-shadow-md"
                decoding="async"
                fetchPriority="high"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-1"
            >
              Panel Waze RAC
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-sm"
            >
              Monitoreo de Tráfico en Tiempo Real
            </motion.p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Correo Electrónico
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@casisa.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50
                           transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50
                             transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón Login */}
            <motion.button
              type="submit"
              disabled={isSubmitting || !email || !password}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-green-600 to-emerald-600
                         hover:from-green-500 hover:to-emerald-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg shadow-green-500/20 hover:shadow-green-500/30
                         transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </motion.button>
          </form>

          {/* ¿Olvidó su contraseña? */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() =>
                alert(
                  "Contacte al administrador del sistema para restablecer su contraseña.\n\nEl administrador puede generar una nueva contraseña desde el panel de Gestión de Usuarios.",
                )
              }
              className="text-sm text-gray-400 hover:text-green-400 transition-colors underline underline-offset-2"
            >
              ¿Olvidó su contraseña?
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-gray-500 text-xs">
              Caminos de las Sierras S.A. — Panel de Monitoreo
            </p>
          </div>
        </div>

        {/* Badge de seguridad */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-center"
        >
          <p className="text-gray-600 text-xs flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" />
            Conexión segura — Sesión encriptada
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
