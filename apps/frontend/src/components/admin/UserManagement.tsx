import React, { useState, useEffect } from "react";
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
  Calendar,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Settings,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

const defaultRoles: Role[] = [
  {
    id: "1",
    name: "Administrador",
    description: "Acceso completo a todas las funcionalidades del sistema",
    permissions: [
      "admin",
      "users.manage",
      "catalogs.manage",
      "reports.view",
      "settings.manage",
    ],
    color: "#dc2626",
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Supervisor",
    description: "Supervisión de operaciones y gestión de usuarios básicos",
    permissions: ["users.view", "reports.view", "incidents.manage"],
    color: "#ea580c",
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Operador",
    description: "Gestión básica de incidentes y visualización de reportes",
    permissions: ["incidents.view", "reports.view"],
    color: "#2563eb",
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "4",
    name: "Visualizador",
    description: "Solo lectura de datos e incidentes",
    permissions: ["incidents.view"],
    color: "#16a34a",
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const defaultUsers: User[] = [
  {
    id: "1",
    email: "admin@casisasa.com",
    firstName: "Administrador",
    lastName: "Sistema",
    phone: "+54 351 123-4567",
    roleId: "1",
    isActive: true,
    emailVerified: true,
    lastLogin: "2025-12-24T10:30:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-12-24T10:30:00Z",
  },
  {
    id: "2",
    email: "supervisor@casisasa.com",
    firstName: "Juan",
    lastName: "Pérez",
    phone: "+54 351 234-5678",
    roleId: "2",
    isActive: true,
    emailVerified: true,
    lastLogin: "2025-12-24T09:15:00Z",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-12-24T09:15:00Z",
  },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(defaultUsers);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showForm, setShowForm] = useState(false);

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "Rol desconocido";
  };

  const getRoleColor = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.color || "#6b7280";
  };

  const handleSaveUser = (user: User) => {
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...user, updatedAt: new Date().toISOString() }
            : u
        )
      );
    } else {
      const newUser = {
        ...user,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false,
      };
      setUsers((prev) => [...prev, newUser]);
    }
    setEditingUser(null);
    setShowForm(false);
  };

  const handleSaveRole = (role: Role) => {
    if (editingRole) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === role.id
            ? { ...role, updatedAt: new Date().toISOString() }
            : r
        )
      );
    } else {
      const newRole = {
        ...role,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRoles((prev) => [...prev, newRole]);
    }
    setEditingRole(null);
    setShowForm(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleDeleteRole = (id: string) => {
    // Verificar si hay usuarios con este rol
    const usersWithRole = users.filter((u) => u.roleId === id);
    if (usersWithRole.length > 0) {
      alert(
        `No se puede eliminar este rol porque ${usersWithRole.length} usuario(s) lo tienen asignado.`
      );
      return;
    }

    if (confirm("¿Estás seguro de que quieres eliminar este rol?")) {
      setRoles((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, isActive: !u.isActive, updatedAt: new Date().toISOString() }
          : u
      )
    );
  };

  const UserForm: React.FC<{
    user: User | null;
    onSave: (user: User) => void;
    onCancel: () => void;
  }> = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState<User>(
      user || {
        id: "",
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        roleId: "",
        isActive: true,
        emailVerified: false,
        createdAt: "",
        updatedAt: "",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-veltrix-card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-veltrix-border"
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {user ? "Editar Usuario" : "Nuevo Usuario"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                  placeholder="+54 351 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) =>
                    setFormData({ ...formData, roleId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {roles
                    .filter((r) => r.isActive)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="userActive"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Usuario activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {user ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  };

  const RoleForm: React.FC<{
    role: Role | null;
    onSave: (role: Role) => void;
    onCancel: () => void;
  }> = ({ role, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Role>(
      role || {
        id: "",
        name: "",
        description: "",
        permissions: [],
        color: "#6b7280",
        isActive: true,
        createdAt: "",
        updatedAt: "",
      }
    );

    const availablePermissions = [
      {
        id: "admin",
        name: "Administrador",
        description: "Acceso completo al sistema",
      },
      {
        id: "users.manage",
        name: "Gestionar Usuarios",
        description: "Crear, editar y eliminar usuarios",
      },
      {
        id: "users.view",
        name: "Ver Usuarios",
        description: "Visualizar lista de usuarios",
      },
      {
        id: "catalogs.manage",
        name: "Gestionar Catálogos",
        description: "Editar tipos y subtipos de incidentes",
      },
      {
        id: "incidents.manage",
        name: "Gestionar Incidentes",
        description: "Crear y modificar incidentes",
      },
      {
        id: "incidents.view",
        name: "Ver Incidentes",
        description: "Visualizar incidentes en el mapa",
      },
      {
        id: "reports.view",
        name: "Ver Reportes",
        description: "Acceder a estadísticas y reportes",
      },
      {
        id: "settings.manage",
        name: "Gestionar Configuración",
        description: "Modificar configuración del sistema",
      },
    ];

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    const togglePermission = (permissionId: string) => {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.includes(permissionId)
          ? prev.permissions.filter((p) => p !== permissionId)
          : [...prev.permissions, permissionId],
      }));
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-veltrix-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-veltrix-border"
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {role ? "Editar Rol" : "Nuevo Rol"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full h-10 border border-gray-300 dark:border-veltrix-border rounded-lg cursor-pointer dark:bg-veltrix-bg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permisos
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availablePermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        id={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={permission.id}
                          className="font-medium text-sm text-gray-900 cursor-pointer"
                        >
                          {permission.name}
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="roleActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="roleActive"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Rol activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {role ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Gestión de Usuarios y Perfiles
        </h2>
        <p className="text-gray-600">
          Administra usuarios, roles y permisos del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Usuarios ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "roles"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Roles ({roles.length})
        </button>
      </div>

      {/* Usuarios */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Usuarios del Sistema
            </h3>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <UserPlus size={16} />
              Nuevo Usuario
            </button>
          </div>

          <div className="grid gap-4">
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-600">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} />
                            {user.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="px-2 py-1 text-xs rounded-full text-white"
                          style={{ backgroundColor: getRoleColor(user.roleId) }}
                        >
                          {getRoleName(user.roleId)}
                        </span>
                        {user.emailVerified && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Email verificado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>

                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isActive
                          ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                          : "text-green-400 hover:text-green-600 hover:bg-green-50"
                      }`}
                      title={
                        user.isActive ? "Desactivar usuario" : "Activar usuario"
                      }
                    >
                      {user.isActive ? (
                        <UserX size={16} />
                      ) : (
                        <UserCheck size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>

                {user.lastLogin && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Último acceso:{" "}
                      {new Date(user.lastLogin).toLocaleString("es-AR")}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Roles y Permisos
            </h3>
            <button
              onClick={() => {
                setEditingRole(null);
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Nuevo Rol
            </button>
          </div>

          <div className="grid gap-4">
            {roles.map((role) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: role.color + "20",
                        color: role.color,
                      }}
                    >
                      <Shield size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {role.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {role.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <span
                            key={permission}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {permission}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{role.permissions.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        role.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {role.isActive ? "Activo" : "Inactivo"}
                    </span>

                    <button
                      onClick={() => {
                        setEditingRole(role);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modales */}
      {showForm && editingUser !== null && (
        <UserForm
          user={editingUser}
          onSave={handleSaveUser}
          onCancel={() => {
            setEditingUser(null);
            setShowForm(false);
          }}
        />
      )}

      {showForm && editingRole !== null && (
        <RoleForm
          role={editingRole}
          onSave={handleSaveRole}
          onCancel={() => {
            setEditingRole(null);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
