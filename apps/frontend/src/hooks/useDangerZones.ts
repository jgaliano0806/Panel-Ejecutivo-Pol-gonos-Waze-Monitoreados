import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DangerZone,
  DangerZoneCreateInput,
  DangerZoneUpdateInput,
  ApiResponse,
} from "@panel-waze/types";
import { API_CONFIG } from "../config/constants";

/** API RAC: zonas_peligrosas (respuesta mapeada al tipo DangerZone del panel) */
const BASE = `${API_CONFIG.baseUrl}/zonas-peligrosas`;
const TOKEN_KEY = "panel_waze_auth_token";

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function severityToNivel(
  s: DangerZoneCreateInput["severity"] | DangerZoneUpdateInput["severity"],
): 1 | 2 | 3 {
  if (s === "extreme") return 3;
  if (s === "critical") return 2;
  return 1;
}

/** Misma lógica de color que el backend (`toApiShape`) + override opcional del formulario */
function colorForZone(
  severity: DangerZone["severity"],
  customColor?: string | null,
): string {
  if (customColor && customColor.trim()) return customColor.trim();
  if (severity === "extreme") return "#EF4444";
  if (severity === "critical") return "#F97316";
  return "#FACC15";
}

function mergeDangerZoneUpdate(
  z: DangerZone,
  input: DangerZoneUpdateInput,
): DangerZone {
  const nextSeverity = input.severity ?? z.severity;
  const now = new Date().toISOString();
  return {
    ...z,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.severity !== undefined && { severity: input.severity }),
    ...(input.protocol !== undefined && { protocol: input.protocol }),
    ...(input.geometry !== undefined && { geometry: input.geometry }),
    ...(input.is_active !== undefined && { is_active: input.is_active }),
    color: colorForZone(nextSeverity, input.color ?? z.color),
    updated_at: now,
  };
}

/** El API no devuelve `updated_at`; completamos para el tipo `DangerZone` */
function normalizeZoneFromApi(z: DangerZone): DangerZone {
  return {
    ...z,
    updated_at: z.updated_at || z.created_at || new Date().toISOString(),
  };
}

async function fetchDangerZones(): Promise<DangerZone[]> {
  const res = await fetch(BASE, { headers: getAuthHeader() });
  const json: ApiResponse<DangerZone[]> = await res.json();
  return (json.data ?? []).map(normalizeZoneFromApi);
}

async function fetchActiveDangerZones(): Promise<DangerZone[]> {
  const res = await fetch(`${BASE}/active`, { headers: getAuthHeader() });
  const json: ApiResponse<DangerZone[]> = await res.json();
  return (json.data ?? []).map(normalizeZoneFromApi);
}

async function createDangerZone(input: DangerZoneCreateInput): Promise<DangerZone> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({
      nombre: input.name,
      descripcion: input.description?.trim() ?? "",
      geometria: input.geometry,
      nivel_severidad: severityToNivel(input.severity),
      protocolo_accion: input.protocol,
    }),
  });
  const json = (await res.json()) as ApiResponse<DangerZone> & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || res.statusText || `HTTP ${res.status}`);
  }
  if (!json.data) {
    throw new Error("Respuesta inválida del servidor al crear la zona.");
  }
  return normalizeZoneFromApi(json.data);
}

async function updateDangerZone(
  id: string,
  input: DangerZoneUpdateInput,
): Promise<DangerZone> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.nombre = input.name;
  if (input.description !== undefined)
    body.descripcion =
      typeof input.description === "string" ? input.description.trim() : "";
  if (input.geometry !== undefined) body.geometria = input.geometry;
  if (input.protocol !== undefined) body.protocolo_accion = input.protocol;
  if (input.severity !== undefined)
    body.nivel_severidad = severityToNivel(input.severity);
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<DangerZone> & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || res.statusText || `HTTP ${res.status}`);
  }
  if (!json.data) {
    throw new Error("Respuesta inválida del servidor al actualizar la zona.");
  }
  return normalizeZoneFromApi(json.data);
}

class NotFoundError extends Error {
  readonly status = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

async function deleteDangerZone(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 404) {
      throw new NotFoundError(json.error || "No encontrada");
    }
    throw new Error(json.error || res.statusText || `HTTP ${res.status}`);
  }
}

export function useDangerZones() {
  return useQuery({
    queryKey: ["danger-zones"],
    queryFn: fetchDangerZones,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    /** Evita que React Query reutilice referencias y no re-renderice lista/mapa */
    structuralSharing: false,
  });
}

export function useActiveDangerZones() {
  return useQuery({
    queryKey: ["danger-zones", "active"],
    queryFn: fetchActiveDangerZones,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    structuralSharing: false,
  });
}

const QUERY_KEYS = {
  all: ["danger-zones"] as const,
  active: ["danger-zones", "active"] as const,
};

export function useCreateDangerZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDangerZone,
    // Optimistic: agregar zona provisional al cache hasta que el servidor confirme
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.all });
      const previous = qc.getQueryData<DangerZone[]>(QUERY_KEYS.all);
      const optimisticId = `__optimistic_${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic: DangerZone = {
        id: optimisticId,
        name: input.name,
        description: input.description?.trim() || undefined,
        geometry: input.geometry,
        severity: input.severity,
        protocol: input.protocol ?? "",
        color: colorForZone(input.severity, input.color),
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      qc.setQueryData<DangerZone[]>(QUERY_KEYS.all, (old = []) => [optimistic, ...old]);
      return { previous, optimisticId };
    },
    onSuccess: (serverZone, _input, ctx) => {
      const oid = ctx?.optimisticId;
      qc.setQueryData<DangerZone[]>(QUERY_KEYS.all, (old = []) => {
        const stripOptimistic = old.filter((z) => !String(z.id).startsWith("__optimistic_"));
        if (!oid) return [serverZone, ...stripOptimistic];
        const hasRow = old.some((z) => z.id === oid);
        if (hasRow) return old.map((z) => (z.id === oid ? serverZone : z));
        return [serverZone, ...stripOptimistic];
      });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined)
        qc.setQueryData(QUERY_KEYS.all, ctx.previous);
    },
  });
}

export function useUpdateDangerZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DangerZoneUpdateInput }) =>
      updateDangerZone(id, input),
    // Optimistic: reflejar cambios al instante (lista, capa del mapa, badges)
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.all });
      const previous = qc.getQueryData<DangerZone[]>(QUERY_KEYS.all);
      qc.setQueryData<DangerZone[]>(QUERY_KEYS.all, (old = []) =>
        old.map((z) => (z.id === id ? mergeDangerZoneUpdate(z, input) : z)),
      );
      return { previous };
    },
    onSuccess: (serverZone, { id }) => {
      qc.setQueryData<DangerZone[]>(QUERY_KEYS.all, (old = []) =>
        old.map((z) => (z.id === id ? serverZone : z)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined)
        qc.setQueryData(QUERY_KEYS.all, ctx.previous);
    },
  });
}

export function useDeleteDangerZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDangerZone,
    // Optimistic: eliminar del cache al instante sin esperar al servidor
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.all });
      const previous = qc.getQueryData<DangerZone[]>(QUERY_KEYS.all);
      qc.setQueryData<DangerZone[]>(QUERY_KEYS.all, (old = []) =>
        old.filter((z) => z.id !== id),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      // Si es 404, la zona ya no existe en el servidor: no revertir la eliminación optimista
      // Para cualquier otro error (red, 500, etc.) sí restaurar
      if (!(err instanceof NotFoundError) && ctx?.previous !== undefined) {
        qc.setQueryData(QUERY_KEYS.all, ctx.previous);
      }
    },
  });
}
