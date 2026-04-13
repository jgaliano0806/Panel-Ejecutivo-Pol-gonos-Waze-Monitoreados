// Tipos de Zonas Peligrosas

export type DangerZoneSeverity = 'high' | 'critical' | 'extreme';

export interface DangerZone {
  id: string;
  name: string;
  description?: string;
  geometry: GeoJSON.Polygon;
  severity: DangerZoneSeverity;
  protocol: string;
  color: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DangerZoneCreateInput {
  name: string;
  description?: string;
  geometry: GeoJSON.Polygon;
  severity: DangerZoneSeverity;
  protocol: string;
  color?: string;
}

export interface DangerZoneUpdateInput {
  name?: string;
  description?: string;
  geometry?: GeoJSON.Polygon;
  severity?: DangerZoneSeverity;
  protocol?: string;
  color?: string;
  is_active?: boolean;
}

/** Flag devuelto por dangerZoneCheckService cuando una alerta cae en una zona. */
export interface DangerZoneFlag {
  isDangerZone: true;
  dangerZoneId: string;
  dangerZoneName: string;
  severity: DangerZoneSeverity;
}
