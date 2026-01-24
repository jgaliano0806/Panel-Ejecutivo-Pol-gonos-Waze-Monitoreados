/**
 * Barrel export para componentes de Risk Dashboard
 * Facilita imports: import { RiskStatCard, PolygonRiskCard } from '@/components/risk-dashboard';
 *
 * Todos los componentes fueron extraídos de RiskDashboard.tsx (~1400 líneas)
 */

// ============================================================================
// Cards atómicos (UI building blocks)
// ============================================================================
export { default as RiskStatCard } from "./RiskStatCard";
export type { RiskStatCardProps } from "./RiskStatCard";

export { default as ClickableFactorBadge } from "./ClickableFactorBadge";
export type { ClickableFactorBadgeProps } from "./ClickableFactorBadge";

export { default as WeatherInfoCard } from "./WeatherInfoCard";
export type { WeatherInfoCardProps } from "./WeatherInfoCard";

export { default as DetailFactorCard } from "./DetailFactorCard";
export type { DetailFactorCardProps } from "./DetailFactorCard";

// ============================================================================
// Componentes compuestos (combinan múltiples cards)
// ============================================================================
export { default as GlobalRiskOverview } from "./GlobalRiskOverview";
export type { GlobalRiskOverviewProps } from "./GlobalRiskOverview";

export { default as PolygonRiskCard } from "./PolygonRiskCard";
export type { PolygonRiskCardProps } from "./PolygonRiskCard";

export { default as PolygonDetailPanel } from "./PolygonDetailPanel";
export type { PolygonDetailPanelProps } from "./PolygonDetailPanel";

export { default as VirtualizedRiskList } from "./VirtualizedRiskList";
export type { VirtualizedRiskListProps } from "./VirtualizedRiskList";

// ============================================================================
// Modales de información
// ============================================================================
export { default as WeatherDetailModal } from "./WeatherDetailModal";
export type { WeatherDetailModalProps } from "./WeatherDetailModal";

export { default as TrafficInfoModal } from "./TrafficInfoModal";
export type { TrafficInfoModalProps } from "./TrafficInfoModal";

export { default as IncidentsInfoModal } from "./IncidentsInfoModal";
export type { IncidentsInfoModalProps } from "./IncidentsInfoModal";
