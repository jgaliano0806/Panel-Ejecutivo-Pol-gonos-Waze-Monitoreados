# Frontend Code Audit Report

## 1. Component Structure
- **Duplication/Confusion:**
  - `KPICards.tsx` vs `KPICard.tsx` (Plural vs Singular)
  - `TopCritical.tsx` vs `TopCriticalDashboard.tsx`
  - `AlertsPanel.tsx` vs `AlertsMonitor.tsx`

## 2. Unused/Legacy Components
- `BlockingIncidents.tsx`: Verify usage.
- `CongestionIndexCard.tsx`: Check if replaced by `FluidityIndexCard.tsx`.
- `GroupTrafficComparison.tsx`: Usage unclear in current dashboard.

## 3. Hooks
- `useDailyStats.ts`
- `useIncidentsHistory.ts`
- `useRelativeTime.ts`
- `useRiskHeatmapData.ts`
- `useRiskScoring.ts`
- `useRoadAccidents.ts`
- `useWazeData.ts`
- `useWazeRealtime.ts`
- `useWeather.ts`

*All hooks seem relevant, but `useWazeData` and `useWazeRealtime` might have overlapping functionality.*
