export enum SystemEvents {
  WAZE_POLL_COMPLETE = 'waze:poll_complete',
  WAZE_POLL_CYCLE_DONE = 'waze:poll_cycle_done',
  WAZE_ALERT_CREATED = 'waze:alert_created',
  WAZE_JAM_CREATED = 'waze:jam_created',
  WEATHER_UPDATED = 'weather:updated',
  RISK_SCORE_CALCULATED = 'risk:calculated',
  SOCKET_BROADCAST = 'socket:broadcast',
}

export interface WazePollCompletePayload {
  polygonId: string;
  alerts: any[];
  jams: any[];
  timestamp: Date;
}

export interface WazePollCycleDonePayload {
  totalPolygons: number;
  successCount: number;
  totalAlerts: number;
  totalJams: number;
  criticalAlerts: number;
  durationMs: number;
  timestamp: Date;
}

export interface RiskCalculatedPayload {
  polygonId: string;
  score: number;
  level: string;
  factors: any;
}
