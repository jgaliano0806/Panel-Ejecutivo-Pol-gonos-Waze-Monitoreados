/**
 * ChangePasswordModal
 * Modal que fuerza el cambio de contraseña en el primer login.
 * Si mustChangePassword === true, el modal no se puede cerrar.
 * También se usa desde la página de perfil (modo voluntario, se puede cerrar).
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";

interface ChangePasswordModalProps {
  /** Si es true, el modal no se puede cerrar (primer login obligatorio) */
  forced?: boolean;
  /** Callback para cerrar el modal (solo si forced === false) */
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  forced = false,
  onClose,
}) => {
  const { changePassword } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isValid =
    currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setIsSubmitting(true);

    const result = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } else {
      setError(result.error || "Error al cambiar contraseña");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={forced ? undefined : onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="backdrop-blur-2xl bg-white/[0.07] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40 p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 mb-4">
                <Lock className="w-7 h-7 text-white" />
              </div>

              <h2 className="text-xl font-bold text-white mb-1">
                {forced
                  ? "Cambio de Contraseña Obligatorio"
                  : "Cambiar Contraseña"}
              </h2>
              <p className="text-gray-400 text-sm">
                {forced
                  ? "Debe cambiar su contraseña inicial antes de continuar"
                  : "Ingrese su contraseña actual y la nueva contraseña"}
              </p>
            </div>

            {/* Success State */}
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
                <p className="text-green-300 font-medium">
                  ¡Contraseña cambiada exitosamente!
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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

                {/* Contraseña Actual */}
                <div>
                  <label
                    htmlFor="cp-current"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      id="cp-current"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      aria-label={showCurrent ? "Ocultar" : "Mostrar"}
                    >
                      {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Nueva Contraseña */}
                <div>
                  <label
                    htmlFor="cp-new"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="cp-new"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      aria-label={showNew ? "Ocultar" : "Mostrar"}
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <p className="text-amber-400 text-xs mt-1">
                      Mínimo 8 caracteres ({8 - newPassword.length} restantes)
                    </p>
                  )}
                </div>

                {/* Confirmar Contraseña */}
                <div>
                  <label
                    htmlFor="cp-confirm"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    id="cp-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    required
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-xl bg-white/[0.06] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      confirmPassword.length > 0 && !passwordsMatch
                        ? "border-red-500/50 focus:ring-red-500/50"
                        : "border-white/[0.1] focus:ring-amber-500/50 focus:border-amber-500/50"
                    }`}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-red-400 text-xs mt-1">
                      Las contraseñas no coinciden
                    </p>
                  )}
                </div>

                {/* Botón Submit */}
                <motion.button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Cambiar Contraseña
                    </>
                  )}
                </motion.button>

                {/* Botón Cerrar (solo si no es obligatorio) */}
                {!forced && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </form>
            )}

            {/* Footer */}
            {forced && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
                <p className="text-gray-500 text-xs flex items-center justify-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Este paso es obligatorio por seguridad
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
