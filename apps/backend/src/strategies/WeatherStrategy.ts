import { RiskFactorStrategy, RiskAnalysisData } from './RiskFactorStrategy';

export class WeatherStrategy implements RiskFactorStrategy {
    name = 'weather';
    weight = 0.20;

    calculate(data: RiskAnalysisData): number {
        const weather = data.weather;
        if (!weather) return 0;

        let score = 0;

        // Visibilidad baja en metros (0-25 puntos)
        const visibilityKm = (weather.visibility_meters || 10000) / 1000;
        if (visibilityKm < 1) score += 25;
        else if (visibilityKm < 3) score += 15;
        else if (visibilityKm < 5) score += 5;

        // Precipitación (0-30 puntos)
        const precip = weather.precipitation_mm || 0;
        if (precip > 10) score += 30;
        else if (precip > 5) score += 20;
        else if (precip > 1) score += 10;

        // Riesgo de hielo (0-25 puntos)
        const temp = weather.temperature_celsius || 20;
        if (temp < 0 && precip > 0) score += 25;
        else if (temp < 2) score += 10;
        else if (weather.is_freezing_risk) score += 15;

        // Código climático adverso por weather_code WMO (0-20 puntos)
        // Códigos WMO: 95-99=tormenta, 71-77=nieve, 45-48=niebla, 56-57=lluvia congelada
        const code = weather.weather_code || 0;
        if ((code >= 95 && code <= 99) || (code >= 71 && code <= 77) ||
            (code >= 45 && code <= 48) || (code >= 56 && code <= 57)) {
            score += 20;
        }

        // Viento fuerte (0-10 puntos extra)
        const wind = weather.wind_gusts_kmh || 0;
        if (wind > 80) score += 10;
        else if (wind > 50) score += 5;

        return Math.min(score, 100);
    }
}
