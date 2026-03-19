/**
 * Auth Store (Zustand)
 * Maneja el estado de autenticación: usuario, token, sesión
 * Persiste el token en localStorage para mantener la sesión
 */

import { create } from "zustand";
import { API_CONFIG } from "../config/constants";

interface AuthRole {
  id: number;
  name: string;
  color: string;
}

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  mustChangePassword: boolean;
  avatarUrl: string | null;
  roles: AuthRole[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;
}

const TOKEN_KEY = "panel_waze_auth_token";

// Helper para obtener headers con token
function getAuthHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Helper para la URL base de la API
function getApiUrl(path: string): string {
  const base = API_CONFIG.baseUrl.replace(/\/api$/, "");
  return `${base}/api${path}`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: false,
  // true solo si hay token que verificar; si no hay token, el login es inmediato
  isLoading: !!localStorage.getItem(TOKEN_KEY),
  error: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        set({
          isLoading: false,
          error: data.error || "Error al iniciar sesión",
        });
        return false;
      }

      const { token, user: userData } = data.data;
      const u = userData as AuthUser;
      const safeUser: AuthUser = {
        ...u,
        permissions: Array.isArray(u?.permissions) ? u.permissions : [],
        roles: Array.isArray(u?.roles) ? u.roles : [],
      };

      localStorage.setItem(TOKEN_KEY, token);

      set({
        user: safeUser,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch {
      set({
        isLoading: false,
        error: "Error de conexión. Verifique que el servidor está activo.",
      });
      return false;
    }
  },

  logout: async (): Promise<void> => {
    const { token } = get();

    try {
      // Notificar al backend
      if (token) {
        await fetch(getApiUrl("/auth/logout"), {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({}),
        }).catch(() => {
          // Ignorar errores de logout (puede que el token ya haya expirado)
        });
      }
    } finally {
      // Limpiar estado local siempre
      localStorage.removeItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkSession: async (): Promise<boolean> => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }

    try {
      const response = await fetch(getApiUrl("/auth/me"), {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        // Token expirado o inválido
        localStorage.removeItem(TOKEN_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return false;
      }

      const data = await response.json();

      if (data.success && data.data) {
        const userData = data.data as AuthUser;
        // Validación defensiva: asegurar permissions y roles son arrays
        const safeUser: AuthUser = {
          ...userData,
          permissions: Array.isArray(userData.permissions)
            ? userData.permissions
            : [],
          roles: Array.isArray(userData.roles) ? userData.roles : [],
        };
        set({
          user: safeUser,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      localStorage.removeItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    } catch {
      // Error de red — mantener token pero marcar como no autenticado
      set({
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  hasPermission: (permission: string): boolean => {
    const { user } = get();
    if (!user) return false;
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (permissions.includes("admin")) return true;
    return permissions.includes(permission);
  },

  hasRole: (roleName: string): boolean => {
    const { user } = get();
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return roles.some((r) => r.name === roleName);
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const { token } = get();
    try {
      const response = await fetch(getApiUrl("/auth/change-password"), {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Error al cambiar contraseña",
        };
      }

      // Actualizar flag en el store
      const { user } = get();
      if (user) {
        set({ user: { ...user, mustChangePassword: false } });
      }

      return { success: true };
    } catch {
      return { success: false, error: "Error de conexión" };
    }
  },

  updateProfile: async (
    profileData,
  ): Promise<{ success: boolean; error?: string }> => {
    const { token } = get();
    try {
      const response = await fetch(getApiUrl("/auth/profile"), {
        method: "PUT",
        headers: getAuthHeaders(token),
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Error al actualizar perfil",
        };
      }

      // Actualizar usuario en el store con los datos devueltos por el backend
      if (data.data) {
        const updatedUser = data.data as AuthUser;
        const safeUser: AuthUser = {
          ...updatedUser,
          permissions: Array.isArray(updatedUser.permissions)
            ? updatedUser.permissions
            : [],
          roles: Array.isArray(updatedUser.roles) ? updatedUser.roles : [],
        };
        set({ user: safeUser });
      }

      return { success: true };
    } catch {
      return { success: false, error: "Error de conexión" };
    }
  },

  uploadAvatar: async (
    file: File,
  ): Promise<{ success: boolean; error?: string }> => {
    const { token } = get();
    try {
      const formData = new FormData();
      formData.append("file", file);

      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      // No poner Content-Type — el browser lo pone con boundary automáticamente

      const response = await fetch(getApiUrl("/auth/avatar"), {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Error al subir avatar" };
      }

      // Actualizar avatarUrl en el store
      const { user } = get();
      if (user && data.data?.avatarUrl) {
        set({ user: { ...user, avatarUrl: data.data.avatarUrl } });
      }

      return { success: true };
    } catch {
      return { success: false, error: "Error de conexión" };
    }
  },
}));
