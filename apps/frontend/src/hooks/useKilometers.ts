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
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface KilometerStats {
  total: number;
  active: number;
  inactive: number;
}

type CreateKilometerInput = Omit<
  KilometerMarker,
  "id" | "created_at" | "updated_at"
>;
type UpdateKilometerInput = Partial<CreateKilometerInput>;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("auth_token");
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
  if (!res.ok) throw new Error("Error al cargar hitos kilométricos");
  return res.json();
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
