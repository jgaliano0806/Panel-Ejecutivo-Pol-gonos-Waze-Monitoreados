/**
 * Hook para gestión de hitos kilométricos
 * Usa TanStack Query para fetch + cache de datos
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export interface KilometerMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  route_name?: string | null;
  polygon_group_id?: number | null;
  polygon_id?: string | null;
  group_name?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface KilometerStats {
  total: number;
  active: number;
  inactive: number;
}

export interface KilometersListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  routeName?: string;
  status?: "all" | "active" | "inactive";
  groupId?: number;
}

export interface KilometersListResult {
  data: KilometerMarker[];
  total: number;
  routes: string[];
  limit: number;
  offset: number;
}

type CreateKilometerInput = Omit<
  KilometerMarker,
  "id" | "created_at" | "updated_at"
>;
type UpdateKilometerInput = Partial<CreateKilometerInput>;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("panel_waze_auth_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

// ─── Fetch helpers ───────────────────────────────────────

const fetchKilometers = async (
  activeOnly = false,
): Promise<KilometerMarker[]> => {
  const url = activeOnly
    ? `${API_URL}/kilometers?active=true`
    : `${API_URL}/kilometers`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Error al cargar ubicación vial");
  const json = await res.json();
  if (Array.isArray(json)) return json;
  return json.data ?? [];
};

const fetchKilometersList = async (
  filters: KilometersListFilters,
): Promise<KilometersListResult> => {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;
  const params = new URLSearchParams();
  params.set("limit", String(pageSize));
  params.set("offset", String(page * pageSize));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.routeName) params.set("route_name", filters.routeName);
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.groupId != null) {
    params.set("group_id", String(filters.groupId));
  }

  const res = await fetch(`${API_URL}/kilometers?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar ubicación vial");
  const json = await res.json();
  return {
    data: json.data ?? [],
    total: json.total ?? 0,
    routes: json.routes ?? [],
    limit: json.limit ?? pageSize,
    offset: json.offset ?? page * pageSize,
  };
};

const fetchKilometerRoutes = async (): Promise<string[]> => {
  const res = await fetch(`${API_URL}/kilometers/routes`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar rutas");
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

const fetchKilometerStats = async (): Promise<KilometerStats> => {
  const res = await fetch(`${API_URL}/kilometers/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar estadísticas");
  return res.json();
};

const createKilometer = async (
  data: CreateKilometerInput,
): Promise<KilometerMarker> => {
  const res = await fetch(`${API_URL}/kilometers`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al crear hito");
  }
  return res.json();
};

const updateKilometer = async (
  id: string,
  data: UpdateKilometerInput,
): Promise<KilometerMarker> => {
  const res = await fetch(`${API_URL}/kilometers/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al actualizar hito");
  }
  return res.json();
};

const deleteKilometer = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/kilometers/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al eliminar hito");
  }
};

// ─── Hooks ───────────────────────────────────────────────

/**
 * Hook para listar hitos kilométricos (admin, todos)
 */
export function useKilometers(activeOnly = false) {
  return useQuery({
    queryKey: ["kilometers", { activeOnly }],
    queryFn: () => fetchKilometers(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Listado paginado con filtros (admin)
 */
export function useKilometersList(filters: KilometersListFilters) {
  return useQuery({
    queryKey: ["kilometers", "list", filters],
    queryFn: () => fetchKilometersList(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useKilometerRoutes() {
  return useQuery({
    queryKey: ["kilometers", "routes"],
    queryFn: fetchKilometerRoutes,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para estadísticas
 */
export function useKilometerStats() {
  return useQuery({
    queryKey: ["kilometers", "stats"],
    queryFn: fetchKilometerStats,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para mutaciones CRUD
 */
export function useKilometerMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["kilometers"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateKilometerInput) => createKilometer(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKilometerInput }) =>
      updateKilometer(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKilometer(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}
