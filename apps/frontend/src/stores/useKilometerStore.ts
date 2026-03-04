/**
 * Store global para hitos kilométricos
 * Se hidrata al iniciar la app y mantiene los datos en memoria
 * para que el servicio de WebSocket/TTS pueda consultarlos sin hooks
 */
import { create } from "zustand";

interface KilometerMarkerData {
  name: string;
  latitude: number;
  longitude: number;
}

interface KilometerStore {
  markers: KilometerMarkerData[];
  isLoaded: boolean;
  setMarkers: (markers: KilometerMarkerData[]) => void;
}

export const useKilometerStore = create<KilometerStore>((set) => ({
  markers: [],
  isLoaded: false,
  setMarkers: (markers) => set({ markers, isLoaded: true }),
}));
