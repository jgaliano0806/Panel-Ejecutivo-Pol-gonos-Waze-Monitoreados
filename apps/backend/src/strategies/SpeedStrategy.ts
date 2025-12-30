import { RiskFactorStrategy, RiskAnalysisData } from './RiskFactorStrategy';

export class SpeedStrategy implements RiskFactorStrategy {
    name = 'speed';
    weight = 0.15;

    calculate(data: RiskAnalysisData): number {
        const snapshot = data.snapshot;
        if (!snapshot) return 0;

        // Si no hay datos de velocidad, retornar 0 (sin info = sin riesgo calculado)
        if (!snapshot.avg_speed || snapshot.avg_speed === null) {
            return 0;
        }

        let score = 0;
        const avgSpeed = parseFloat(snapshot.avg_speed);

        // Velocidad promedio baja indica congestión (0-100 puntos)
        if (avgSpeed < 20) score += 100;
        else if (avgSpeed < 40) score += 60;
        else if (avgSpeed < 60) score += 30;
        else if (avgSpeed < 80) score += 10;

        return Math.min(score, 100);
    }
}
