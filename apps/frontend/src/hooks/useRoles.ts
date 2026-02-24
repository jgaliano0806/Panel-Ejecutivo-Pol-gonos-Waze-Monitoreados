/**
 * useRoles Hook
 * TanStack Query hooks para CRUD de roles y permisos
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_CONFIG } from "../config/constants";
import { useAuthStore } from "../stores/useAuthStore";

interface PermissionDTO {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface RoleDTO {
  id: number;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  permissions: PermissionDTO[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateRoleData {
  name: string;
  description?: string;
  color?: string;
  permissionIds: number[];
}

interface UpdateRoleData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  permissionIds?: number[];
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
 * Hook para listar todos los roles con permisos
 */
export function useRoles() {
  return useQuery<RoleDTO[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/roles"), {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Error obteniendo roles");
      }

      const data = await response.json();
      return data.data || [];
    },
  });
}

/**
 * Hook para listar todos los permisos disponibles
 */
export function usePermissions() {
  return useQuery<PermissionDTO[]>({
    queryKey: ["permissions"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/roles/permissions/all"), {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Error obteniendo permisos");
      }

      const data = await response.json();
      return data.data || [];
    },
  });
}

/**
 * Hook para crear un rol
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData: CreateRoleData) => {
      const response = await fetch(getApiUrl("/roles"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(roleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error creando rol");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

/**
 * Hook para actualizar un rol
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...roleData
    }: UpdateRoleData & { id: number }) => {
      const response = await fetch(getApiUrl(`/roles/${id}`), {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(roleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error actualizando rol");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

/**
 * Hook para eliminar un rol
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(getApiUrl(`/roles/${id}`), {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error eliminando rol");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
