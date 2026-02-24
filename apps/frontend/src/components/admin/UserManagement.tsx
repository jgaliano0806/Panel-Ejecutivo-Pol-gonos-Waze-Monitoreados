/**
 * UserManagement — Panel de Administración de Usuarios y Roles
 * Conectado al backend vía hooks useUsers / useRoles
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  Edit3,
  Save,
  X,
  Plus,
  Shield,
  Mail,
  Phone,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Settings,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
  UserDTO,
} from "../../hooks/useUsers";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissions,
  RoleDTO,
} from "../../hooks/useRoles";

// =====================================================
// TIPOS INTERNOS
// =====================================================

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  roleIds: number[];
}

interface RoleFormData {
  name: string;
  description: string;
  color: string;
  permissionIds: number[];
}

type TabType = "users" | "roles";

// =====================================================
// FORMULARIO DE USUARIO (fuera del componente padre
// para evitar re-creación en cada render)
// =====================================================
const UserForm = ({
  user,
  onSave,
  onCancel,
  roles,
  isPending,
  error,
}: {
  user: UserDTO | null;
  onSave: (data: UserFormData) => void;
  onCancel: () => void;
  roles: RoleDTO[];
  isPending: boolean;
  error: Error | null;
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    password: "",
    roleIds: user?.roles.map((r) => r.id) || [],
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-veltrix-card rounded-xl p-6 mb-6 border border-gray-200 dark:border-veltrix-border/50 shadow-lg"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {user ? "Editar Usuario" : "Nuevo Usuario"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="user-firstName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Nombre
            </label>
            <input
              id="user-firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Nombre"
            />
          </div>
          <div>
            <label
              htmlFor="user-lastName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Apellido
            </label>
            <input
              id="user-lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="user-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              <Mail size={14} className="inline mr-1" /> Email
            </label>
            <input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="usuario@casisa.com"
            />
          </div>
          <div>
            <label
              htmlFor="user-phone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              <Phone size={14} className="inline mr-1" /> Teléfono
            </label>
            <input
              id="user-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="+54 351 123-4567"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="user-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Contraseña{" "}
            {user && (
              <span className="text-xs text-gray-500">
                (dejar vacío para no cambiar)
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="user-password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required={!user}
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-label={showPassword ? "Ocultar" : "Mostrar"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Shield size={14} className="inline mr-1" /> Roles
          </label>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  const newRoleIds = formData.roleIds.includes(role.id)
                    ? formData.roleIds.filter((id) => id !== role.id)
                    : [...formData.roleIds, role.id];
                  setFormData({ ...formData, roleIds: newRoleIds });
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  formData.roleIds.includes(role.id)
                    ? "text-white shadow-md"
                    : "bg-gray-100 dark:bg-veltrix-bg text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                }`}
                style={
                  formData.roleIds.includes(role.id)
                    ? { backgroundColor: role.color }
                    : undefined
                }
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t dark:border-veltrix-border/50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-veltrix-bg text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
          >
            <X size={16} className="inline mr-1" /> Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-md transition-all"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 size={16} className="inline mr-1 animate-spin" />
            ) : (
              <Save size={16} className="inline mr-1" />
            )}
            {user ? "Actualizar" : "Crear"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} />
            {error.message}
          </div>
        )}
      </form>
    </motion.div>
  );
};

// =====================================================
// FORMULARIO DE ROL (fuera del componente padre
// para evitar re-creación en cada render)
// =====================================================
const RoleForm = ({
  role,
  onSave,
  onCancel,
  isPending,
  error,
}: {
  role: RoleDTO | null;
  onSave: (data: RoleFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  error: Error | null;
}) => {
  const { data: allPermissions = [] } = usePermissions();

  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || "",
    description: role?.description || "",
    color: role?.color || "#6b7280",
    permissionIds: role?.permissions.map((p) => p.id) || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const togglePermission = (permissionId: number) => {
    const newIds = formData.permissionIds.includes(permissionId)
      ? formData.permissionIds.filter((id) => id !== permissionId)
      : [...formData.permissionIds, permissionId];
    setFormData({ ...formData, permissionIds: newIds });
  };

  // Agrupar permisos por categoría
  const permissionsByCategory = allPermissions.reduce(
    (acc, perm) => {
      const cat = perm.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    },
    {} as Record<string, typeof allPermissions>,
  );

  const categoryLabels: Record<string, string> = {
    system: "Sistema",
    users: "Usuarios",
    catalogs: "Catálogos",
    incidents: "Incidentes",
    reports: "Reportes",
    settings: "Configuración",
    general: "General",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-veltrix-card rounded-xl p-6 mb-6 border border-gray-200 dark:border-veltrix-border/50 shadow-lg"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {role ? "Editar Rol" : "Nuevo Rol"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label
              htmlFor="role-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Nombre del Rol
            </label>
            <input
              id="role-name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Nombre del rol"
            />
          </div>
          <div>
            <label
              htmlFor="role-color"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="role-color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
                title="Color del rol"
              />
              <span className="text-sm text-gray-500">{formData.color}</span>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="role-description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Descripción
          </label>
          <textarea
            id="role-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg border border-gray-300 dark:border-veltrix-border text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Descripción del rol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Shield size={14} className="inline mr-1" /> Permisos
          </label>

          <div className="space-y-4 max-h-60 overflow-y-auto">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {categoryLabels[category] || category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.permissionIds.includes(perm.id)
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                          : "bg-gray-50 dark:bg-veltrix-bg border border-transparent hover:bg-gray-100 dark:hover:bg-veltrix-bg/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissionIds.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {perm.name}
                        </div>
                        {perm.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {perm.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t dark:border-veltrix-border/50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-veltrix-bg text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
          >
            <X size={16} className="inline mr-1" /> Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 shadow-md transition-all"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 size={16} className="inline mr-1 animate-spin" />
            ) : (
              <Save size={16} className="inline mr-1" />
            )}
            {role ? "Actualizar" : "Crear"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} />
            {error.message}
          </div>
        )}
      </form>
    </motion.div>
  );
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDTO | null>(null);

  // Queries
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useUsers();
  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useRoles();

  // Mutations
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const toggleStatus = useToggleUserStatus();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const handleSaveUser = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          password: data.password || undefined,
          roleIds: data.roleIds,
        });
      } else {
        await createUser.mutateAsync({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          password: data.password,
          roleIds: data.roleIds,
        });
      }
      setShowUserForm(false);
      setEditingUser(null);
    } catch {
      // Error manejado por la mutation
    }
  };

  const handleSaveRole = async (data: RoleFormData) => {
    try {
      if (editingRole) {
        await updateRole.mutateAsync({
          id: editingRole.id,
          name: data.name,
          description: data.description || undefined,
          color: data.color,
          permissionIds: data.permissionIds,
        });
      } else {
        await createRole.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          color: data.color,
          permissionIds: data.permissionIds,
        });
      }
      setShowRoleForm(false);
      setEditingRole(null);
    } catch {
      // Error manejado por la mutation
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm("¿Está seguro de eliminar este usuario?")) {
      await deleteUser.mutateAsync(id);
    }
  };

  const handleDeleteRole = async (id: number) => {
    const role = roles.find((r) => r.id === id);
    if (role && role.userCount > 0) {
      alert("No se puede eliminar un rol que tiene usuarios asignados.");
      return;
    }
    if (window.confirm("¿Está seguro de eliminar este rol?")) {
      await deleteRole.mutateAsync(id);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    await toggleStatus.mutateAsync(userId);
  };

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================
  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "users"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-veltrix-bg text-gray-600 dark:text-gray-400 hover:bg-gray-200"
          }`}
        >
          <UserPlus size={18} /> Usuarios ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "roles"
              ? "bg-purple-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-veltrix-bg text-gray-600 dark:text-gray-400 hover:bg-gray-200"
          }`}
        >
          <Settings size={18} /> Roles ({roles.length})
        </button>
      </div>

      {/* TAB: USUARIOS */}
      {activeTab === "users" && (
        <div>
          {/* Botón crear */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Gestión de Usuarios
            </h2>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-md transition-all"
            >
              <Plus size={16} /> Nuevo Usuario
            </button>
          </div>

          {/* Formulario */}
          {showUserForm && (
            <UserForm
              user={editingUser}
              onSave={handleSaveUser}
              onCancel={() => {
                setShowUserForm(false);
                setEditingUser(null);
              }}
              roles={roles}
              isPending={createUser.isPending || updateUser.isPending}
              error={createUser.error || updateUser.error}
            />
          )}

          {/* Loading */}
          {usersLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}

          {/* Error */}
          {usersError && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle size={20} />
              <span>Error cargando usuarios: {usersError.message}</span>
            </div>
          )}

          {/* Lista de usuarios */}
          {!usersLoading && !usersError && (
            <div className="space-y-3">
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-veltrix-card rounded-xl p-4 border border-gray-200 dark:border-veltrix-border/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          user.isActive
                            ? "bg-gradient-to-br from-blue-500 to-blue-600"
                            : "bg-gray-400"
                        }`}
                      >
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </span>
                          {!user.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              Desactivado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Roles badges */}
                      <div className="flex gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: role.color }}
                          >
                            {role.name}
                          </span>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-500">
                            Sin rol
                          </span>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleUserStatus(user.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive
                              ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          }`}
                          title={user.isActive ? "Desactivar" : "Activar"}
                        >
                          {user.isActive ? (
                            <UserCheck size={18} />
                          ) : (
                            <UserX size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowUserForm(true);
                          }}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No hay usuarios registrados
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: ROLES */}
      {activeTab === "roles" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Gestión de Roles
            </h2>
            <button
              onClick={() => {
                setEditingRole(null);
                setShowRoleForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 shadow-md transition-all"
            >
              <Plus size={16} /> Nuevo Rol
            </button>
          </div>

          {showRoleForm && (
            <RoleForm
              role={editingRole}
              onSave={handleSaveRole}
              onCancel={() => {
                setShowRoleForm(false);
                setEditingRole(null);
              }}
              isPending={createRole.isPending || updateRole.isPending}
              error={createRole.error || updateRole.error}
            />
          )}

          {rolesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-purple-500" />
            </div>
          )}

          {rolesError && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle size={20} />
              <span>Error cargando roles: {rolesError.message}</span>
            </div>
          )}

          {!rolesLoading && !rolesError && (
            <div className="grid grid-cols-2 gap-4">
              {roles.map((role) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-veltrix-card rounded-xl p-5 border border-gray-200 dark:border-veltrix-border/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {role.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {role.description || "Sin descripción"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setShowRoleForm(true);
                        }}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                        disabled={role.userCount > 0}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Info de permisos */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm.id}
                        className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-veltrix-bg text-gray-600 dark:text-gray-400"
                      >
                        {perm.name}
                      </span>
                    ))}
                    {role.permissions.length === 0 && (
                      <span className="text-xs text-gray-400">
                        Sin permisos asignados
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    {role.userCount} usuario{role.userCount !== 1 ? "s" : ""}{" "}
                    asignado{role.userCount !== 1 ? "s" : ""}
                  </div>
                </motion.div>
              ))}

              {roles.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  No hay roles configurados
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
