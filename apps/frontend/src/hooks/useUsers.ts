/**
 * useUsers Hook
 * TanStack Query hooks para CRUD de usuarios
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_CONFIG } from "../config/constants";
import { useAuthStore } from "../stores/useAuthStore";

interface UserRole {
  id: number;
  name: string;
  color: string;
}

export interface UserDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
  roleIds: number[];
}

interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  roleIds?: number[];
}

function getHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getApiUrl(path: string): string {
  const base = API_CONFIG.baseUrl.replace(/\/api$/, "");
  return `${base}/api${path}`;
}

/**
 * Hook para listar todos los usuarios
 */
export function useUsers() {
  return useQuery<UserDTO[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/users"), {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Error obteniendo usuarios");
      }

      const data = await response.json();
      return data.data || [];
    },
  });
}

/**
 * Hook para crear un usuario
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const response = await fetch(getApiUrl("/users"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error creando usuario");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Hook para actualizar un usuario
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...userData
    }: UpdateUserData & { id: number }) => {
      const response = await fetch(getApiUrl(`/users/${id}`), {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error actualizando usuario");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Hook para eliminar un usuario
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(getApiUrl(`/users/${id}`), {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error eliminando usuario");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * Hook para activar/desactivar un usuario
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(getApiUrl(`/users/${id}/toggle`), {
        method: "PATCH",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error cambiando estado del usuario");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
