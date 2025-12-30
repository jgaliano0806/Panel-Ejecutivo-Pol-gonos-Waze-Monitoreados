import { RiskFactorStrategy, RiskAnalysisData } from './RiskFactorStrategy';

export class DelayStrategy implements RiskFactorStrategy {
    name = 'delay';
    weight = 0.10;

    calculate(data: RiskAnalysisData): number {
        const snapshot = data.snapshot;
        if (!snapshot) return 0;

        const avgDelay = snapshot.avg_delay || 0; // En segundos
        const delayMinutes = avgDelay / 60;

        // Escala logarítmica para demoras
        if (delayMinutes === 0) return 0;
        if (delayMinutes < 5) return 10;
        if (delayMinutes < 15) return 25;
        if (delayMinutes < 30) return 40;
        if (delayMinutes < 60) return 60;
        if (delayMinutes < 120) return 80;
        return 100;
    }
}
