/**
 * Flags de módulos opcionales.
 * Risk scoring (API + listener) solo en entornos con ENABLE_RISK_SCORING=1
 * (rama group-kpis-display). Desactivado por defecto en main/preprod.
 */
export const isRiskScoringEnabled =
  process.env.ENABLE_RISK_SCORING === "1" ||
  process.env.ENABLE_RISK_SCORING === "true";
