/** Prefijo UUID para alertas generadas por el bot de presentación */
export const SIMULATED_ALERT_UUID_PREFIX = "SIM-";

/** report_by en waze_alerts para identificar simulaciones */
export const SIMULATED_REPORT_BY = "SIM_BOT";

export function isSimulatedAlertUuid(uuid: string | null | undefined): boolean {
  return Boolean(uuid?.startsWith(SIMULATED_ALERT_UUID_PREFIX));
}
