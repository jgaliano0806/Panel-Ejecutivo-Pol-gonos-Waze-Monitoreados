import { create } from "zustand";

export interface RedZoneCriticalItem {
  id: string;
  uuid?: string;
  receivedAt: number;
  redZonaNombre: string;
  protocolo_accion: string;
  nivel_severidad: number;
  street?: string;
  subtype?: string;
  type?: string;
  polygonId?: string;
}

interface State {
  items: RedZoneCriticalItem[];
  push: (payload: Record<string, unknown>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

function buildItem(payload: Record<string, unknown>): RedZoneCriticalItem {
  const uuid =
    (payload.uuid as string) ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return {
    id: `rz-${uuid}-${Date.now()}`,
    uuid: payload.uuid as string | undefined,
    receivedAt: Date.now(),
    redZonaNombre: (payload.redZonaNombre as string) || "Zona peligrosa",
    protocolo_accion: (payload.protocolo_accion as string) || "",
    nivel_severidad: Number(payload.nivel_severidad) || 2,
    street: payload.street as string | undefined,
    subtype: payload.subtype as string | undefined,
    type: payload.type as string | undefined,
    polygonId: payload.polygonId as string | undefined,
  };
}

export const useRedZoneCriticalStore = create<State>((set, get) => ({
  items: [],
  push: (payload) => {
    const item = buildItem(payload);
    set({ items: [item, ...get().items].slice(0, 20) });
  },
  dismiss: (id) =>
    set({ items: get().items.filter((i) => i.id !== id) }),
  clear: () => set({ items: [] }),
}));
