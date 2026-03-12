/**
 * ProfilePage
 * Página de perfil del usuario autenticado.
 * Permite editar datos personales, subir avatar y cambiar contraseña.
 */

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Camera,
  Save,
  Lock,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { AppLayout } from "../components/layout/AppLayout";
import { ChangePasswordModal } from "../components/auth/ChangePasswordModal";
import { API_CONFIG } from "../config/constants";

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const email = user?.email || "";
  const [phone, setPhone] = useState(user?.phone || "");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  if (!user) return null;

  // Construir URL del avatar
  const getAvatarUrl = (avatarPath: string | null): string | null => {
    if (!avatarPath) return null;
    const base = API_CONFIG.baseUrl.replace(/\/api$/, "");
    return `${base}${avatarPath}`;
  };

  const avatarUrl = getAvatarUrl(user.avatarUrl);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    const result = await updateProfile({
      phone: phone !== (user.phone || "") ? phone : undefined,
    });

    setIsSaving(false);

    if (result.success) {
      setMessage({ type: "success", text: "Perfil actualizado exitosamente" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Error al actualizar perfil",
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "La imagen no puede superar los 5MB" });
      return;
    }

    setMessage(null);
    setIsUploading(true);

    const result = await uploadAvatar(file);
    setIsUploading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Avatar actualizado" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Error al subir avatar",
      });
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
              <p className="text-gray-400 text-sm">
                Administra tu información personal
              </p>
            </div>
          </div>

          {/* Mensaje global */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-green-300" : "text-red-300"
                }`}
              >
                {message.text}
              </p>
            </motion.div>
          )}

          {/* Card: Avatar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-2xl bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-6">
              {/* Avatar con botón de carga */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                  title="Seleccionar imagen de perfil"
                  aria-label="Seleccionar imagen de perfil"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <div className="flex gap-1.5 mt-2">
                  {user.roles.map((role) => (
                    <span
                      key={role.id}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: role.color }}
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card: Datos Personales */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-2xl bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Datos Personales
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-firstName"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Nombre
                  </label>
                  <input
                    id="profile-firstName"
                    type="text"
                    value={firstName}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-lastName"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Apellido
                  </label>
                  <input
                    id="profile-lastName"
                    type="text"
                    value={lastName}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  <Mail size={14} className="inline mr-1" />
                  Correo Electrónico
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  <Phone size={14} className="inline mr-1" />
                  Teléfono
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 351 123-4567"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>

              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isSaving}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Guardar Cambios
                </motion.button>
              </div>
            </form>
          </motion.div>

          {/* Card: Seguridad */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-2xl bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Seguridad
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-white text-sm font-medium">Contraseña</p>
                  <p className="text-gray-400 text-xs">
                    Actualiza tu contraseña periódicamente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
              >
                Cambiar
              </button>
            </div>
          </motion.div>

          {/* Card: Información de la Cuenta (solo lectura) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-2xl bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Información de la Cuenta
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Última conexión</span>
                <span className="text-white">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estado</span>
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Activo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Roles</span>
                <span className="text-white">
                  {user.roles.map((r) => r.name).join(", ") || "Sin rol"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modal de cambio de contraseña */}
      {showPasswordModal && (
        <ChangePasswordModal
          forced={false}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </AppLayout>
  );
};
