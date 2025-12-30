import { RiskFactorStrategy, RiskAnalysisData } from './RiskFactorStrategy';

export class TrafficJamStrategy implements RiskFactorStrategy {
    name = 'traffic';
    weight = 0.25;

    calculate(data: RiskAnalysisData): number {
        const snapshot = data.snapshot;
        if (!snapshot) return 0;

        let score = 0;
        // Jams totales (0-100 puntos)
        const jamCount = snapshot.total_jams || 0;
        score += Math.min(jamCount * 5, 100);

        return Math.min(score, 100);
    }
}
