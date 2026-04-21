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

function severityToNivel(
  s: DangerZoneCreateInput["severity"] | DangerZoneUpdateInput["severity"],
): 1 | 2 {
  if (s === "critical" || s === "extreme") return 2;
  return 1;
}

async function fetchDangerZones(): Promise<DangerZone[]> {
  const res = await fetch(BASE);
  const json: ApiResponse<DangerZone[]> = await res.json();
  return json.data ?? [];
}

async function fetchActiveDangerZones(): Promise<DangerZone[]> {
  const res = await fetch(`${BASE}/active`);
  const json: ApiResponse<DangerZone[]> = await res.json();
  return json.data ?? [];
}

async function createDangerZone(input: DangerZoneCreateInput): Promise<DangerZone> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: input.name,
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
  return json.data;
}

async function updateDangerZone(
  id: string,
  input: DangerZoneUpdateInput,
): Promise<DangerZone> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.nombre = input.name;
  if (input.geometry !== undefined) body.geometria = input.geometry;
  if (input.protocol !== undefined) body.protocolo_accion = input.protocol;
  if (input.severity !== undefined)
    body.nivel_severidad = severityToNivel(input.severity);
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<DangerZone> & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || res.statusText || `HTTP ${res.status}`);
  }
  if (!json.data) {
    throw new Error("Respuesta inválida del servidor al actualizar la zona.");
  }
  return json.data;
}

async function deleteDangerZone(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error || res.statusText || `HTTP ${res.status}`);
  }
}

export function useDangerZones() {
  return useQuery({
    queryKey: ["danger-zones"],
    queryFn: fetchDangerZones,
    staleTime: 30_000,
  });
}

export function useActiveDangerZones() {
  return useQuery({
    queryKey: ["danger-zones", "active"],
    queryFn: fetchActiveDangerZones,
    staleTime: 30_000,
  });
}

export function useCreateDangerZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDangerZone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["danger-zones"] });
    },
  });
}

export function useUpdateDangerZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DangerZoneUpdateInput }) =>
      updateDangerZone(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["danger-zones"] });
    },
  });
}

export function useDeleteDangerZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDangerZone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["danger-zones"] });
    },
  });
}
