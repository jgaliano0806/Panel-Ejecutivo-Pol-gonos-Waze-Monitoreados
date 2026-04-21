import { create } from 'zustand';
import { IncidenteOficial, getIncidentesOficiales, transicionarEstado } from '../services/incidenteOficialService';

interface IncidenteOficialState {
  incidentes: IncidenteOficial[];
  isLoading: boolean;
  error: string | null;
  fetchIncidentes: () => Promise<void>;
  aprobarIncidente: (id: number, justificacion?: string) => Promise<void>;
  rechazarIncidente: (id: number, justificacion: string) => Promise<void>;
}

export const useIncidenteOficialStore = create<IncidenteOficialState>((set, get) => ({
  incidentes: [],
  isLoading: false,
  error: null,

  fetchIncidentes: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getIncidentesOficiales();
      set({ incidentes: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  aprobarIncidente: async (id: number, justificacion: string = 'Aprobado por Base') => {
    try {
      set({ isLoading: true });
      await transicionarEstado(id, 'Validado_Base', justificacion);
      // Refresh the list after approval
      await get().fetchIncidentes();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  rechazarIncidente: async (id: number, justificacion: string) => {
    try {
      set({ isLoading: true });
      await transicionarEstado(id, 'Rechazado', justificacion);
      await get().fetchIncidentes();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
