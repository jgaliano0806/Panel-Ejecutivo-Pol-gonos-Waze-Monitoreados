import { API_CONFIG } from '../config/constants';

const BASE = `${API_CONFIG.baseUrl}/incidentes-oficiales`;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface IncidenteOficial {
  id: number;
  creador_id: number;
  estado_workflow: 'Borrador' | 'Enviado_A_Base' | 'Validado_Base' | 'Rechazado' | 'Archivado';
  gravedad?: number;
  codigo_situacion?: string;
  ruta?: string;
  kilometro?: number;
  lat?: number;
  lng?: number;
  hay_lesionados: boolean;
  hay_obitos: boolean;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export const getIncidentesOficiales = async (): Promise<IncidenteOficial[]> => {
  const res = await fetch(BASE, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Error ${res.status} al obtener incidentes oficiales`);
  const json = await res.json();
  return json.data ?? json;
};

export const crearIncidenteMovel = async (data: Partial<IncidenteOficial>): Promise<IncidenteOficial> => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error ${res.status} al crear incidente oficial`);
  const json = await res.json();
  return json.data ?? json;
};

export const transicionarEstado = async (
  id: number,
  nuevoEstado: string,
  justificacion = '',
): Promise<IncidenteOficial> => {
  const res = await fetch(`${BASE}/${id}/state`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ nuevoEstado, justificacion }),
  });
  if (!res.ok) throw new Error(`Error ${res.status} al transicionar estado`);
  const json = await res.json();
  return json.data ?? json;
};
