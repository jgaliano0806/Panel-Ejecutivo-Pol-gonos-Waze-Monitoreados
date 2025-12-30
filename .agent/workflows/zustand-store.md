---
description: zustand-store State management client-side
---

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MapStore {
  zoom: number;
  center: [number, number];
  selectedPolygonId: string | null;
  showHeatmap: boolean;
  setZoom: (zoom: number) => void;
  setCenter: (center: [number, number]) => void;
  selectPolygon: (id: string | null) => void;
  toggleHeatmap: () => void;
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      zoom: 12,
      center: [-31.4135, -64.1811],
      selectedPolygonId: null,
      showHeatmap: true,

      setZoom: (zoom) => set({ zoom }),
      setCenter: (center) => set({ center }),
      selectPolygon: (id) => set({ selectedPolygonId: id }),
      toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    }),
    {
      name: 'map-store',
      partialize: (state) => ({
        zoom: state.zoom,
        center: state.center,
        showHeatmap: state.showHeatmap,
      }),
    }
  )
);
Cuándo usar:

UI state (filters, sidebar open, etc)
Preferencias usuario
State compartido entre componentes

NO usar para:

Server data (usar TanStack Query)
Form state (usar React Hook Form)
