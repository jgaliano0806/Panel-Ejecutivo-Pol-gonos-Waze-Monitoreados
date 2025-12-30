import { RiskFactorStrategy, RiskAnalysisData } from './RiskFactorStrategy';

export class IncidentStrategy implements RiskFactorStrategy {
    name = 'incidents';
    weight = 0.30;

    calculate(data: RiskAnalysisData): number {
        const snapshot = data.snapshot;
        if (!snapshot) return 0;

        let score = 0;
        // Incidentes totales (0-100 puntos)
        const incidentCount = snapshot.total_incidents || 0;
        score += Math.min(incidentCount * 10, 100);

        return Math.min(score, 100);
    }
}
