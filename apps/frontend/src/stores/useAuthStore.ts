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
  isLoading: true, // true al inicio para verificar sesión
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
          permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
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
}));
