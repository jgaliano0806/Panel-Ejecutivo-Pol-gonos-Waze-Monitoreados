import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DangerZone, DangerZoneCreateInput, DangerZoneUpdateInput, ApiResponse } from "@panel-waze/types";
import { API_CONFIG } from "../config/constants";

const BASE = `${API_CONFIG.baseUrl}/danger-zones`;

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
    body: JSON.stringify(input),
  });
  const json: ApiResponse<DangerZone> = await res.json();
  return json.data!;
}

async function updateDangerZone(id: string, input: DangerZoneUpdateInput): Promise<DangerZone> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json: ApiResponse<DangerZone> = await res.json();
  return json.data!;
}

async function deleteDangerZone(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

// ─── Hooks ──────────────────────────────────────────────

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
