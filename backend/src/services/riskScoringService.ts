/**
 * Servicio de Cálculo de Scoring de Riesgos Multifactorial
 * Calcula scores de 0-100 basados en 5 factores principales
 */

import { dbService } from '../database/dbService';
import { REAL_POLYGONS, getAllGroups } from '../config/realPolygons';

export interface RiskScore {
    polygon_id: string;
    polygon_name: string;
    group_name: string;
    calculated_at: Date;

    // Scores por factor
    traffic_score: number;
    incident_score: number;
    weather_score: number;
    speed_score: number;
    delay_score: number;

    // Score final
    final_risk_score: number;
    risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'SEVERE';
    risk_category: string;
    alert_triggered: boolean;

    // Datos descriptivos (raw data)
    raw_data?: {
        total_jams: number;
        total_incidents: number;
        avg_speed: number | null;
        avg_delay: number;
        conditions_summary: string;
    };
}

export interface GroupRiskSummary {
    group_name: string;
    polygon_count: number;
    avg_risk_score: number;
    max_risk_score: number;
    critical_polygons: number;
    risk_distribution: {
        low: number;
        moderate: number;
        high: number;
        critical: number;
        severe: number;
    };
}

class RiskScoringService {
    // Pesos por defecto para cada factor
    private weights = {
        traffic: 0.25,
        incidents: 0.30,
        weather: 0.20,
        speed: 0.15,
        delay: 0.10
    };

    /**
     * Calcula el score de riesgo para todos los polígonos
     */
    async calculateAllRiskScores(): Promise<void> {
        console.log('Iniciando cálculo de risk scores para todos los polígonos...');

        for (const polygon of REAL_POLYGONS) {
            try {
                await this.calculatePolygonRiskScore(polygon.id);
            } catch (error) {
                console.error(`Error calculando score para ${polygon.id}:`, error);
            }
        }

        // Refrescar vista materializada
        await dbService.query('SELECT refresh_risk_scores_view()');
        console.log('Cálculo de risk scores completado');
    }

    /**
     * Calcula el score de riesgo para un polígono específico
     */
    async calculatePolygonRiskScore(polygonId: string): Promise<RiskScore> {
        const polygon = REAL_POLYGONS.find(p => p.id === polygonId);
        if (!polygon) {
            throw new Error(`Polígono ${polygonId} no encontrado`);
        }

        // Obtener snapshot más reciente
        const snapshotResult = await dbService.query(
            `SELECT * FROM polygon_snapshots
             WHERE polygon_id = $1
             ORDER BY timestamp DESC
             LIMIT 1`,
            [polygonId]
        );

        const snapshot = snapshotResult.rows[0];
        if (!snapshot) {
            // Si no hay datos, guardar score en 0
            return this.saveRiskScore(polygonId, polygon.name, polygon.group || 'Sin Grupo', {
                traffic_score: 0,
                incident_score: 0,
                weather_score: 0,
                speed_score: 0,
                delay_score: 0
            });
        }

        // Calcular scores individuales
        const trafficScore = this.calculateTrafficScore(snapshot);
        const incidentScore = this.calculateIncidentScore(snapshot);
        const weatherScore = await this.calculateWeatherScore(polygonId);
        const speedScore = this.calculateSpeedScore(snapshot);
        const delayScore = this.calculateDelayScore(snapshot);

        // Guardar en BD
        return this.saveRiskScore(polygonId, polygon.name, polygon.group || 'Sin Grupo', {
            traffic_score: trafficScore,
            incident_score: incidentScore,
            weather_score: weatherScore,
            speed_score: speedScore,
            delay_score: delayScore,
            ...snapshot
        });
    }

    /**
     * Factor 1: Score de Tráfico y Congestión (0-100)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private calculateTrafficScore(snapshot: any): number {
        let score = 0;

        // Jams totales (0-100 puntos)
        const jamCount = snapshot.total_jams || 0;
        score += Math.min(jamCount * 5, 100);

        return Math.min(score, 100);
    }

    /**
     * Factor 2: Score de Incidentes (0-100)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private calculateIncidentScore(snapshot: any): number {
        let score = 0;

        // Incidentes totales (0-100 puntos)
        const incidentCount = snapshot.total_incidents || 0;
        score += Math.min(incidentCount * 10, 100);

        return Math.min(score, 100);
    }

    /**
     * Factor 3: Score de Clima (0-100)
     */
    private async calculateWeatherScore(polygonId: string): Promise<number> {
        try {
            const weatherResult = await dbService.query(
                `SELECT * FROM polygon_weather_data
                 WHERE polygon_id = $1
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                [polygonId]
            );

            if (weatherResult.rows.length === 0) return 0;

            const weather = weatherResult.rows[0];
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
        } catch (error) {
            console.error('Error calculando weather score:', error);
            return 0;
        }
    }

    /**
     * Factor 4: Score de Velocidad (0-100)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private calculateSpeedScore(snapshot: any): number {
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

    /**
     * Factor 5: Score de Demoras (0-100)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private calculateDelayScore(snapshot: any): number {
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

    /**
     * Genera resumen descriptivo de condiciones
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private generateConditionsSummary(snapshot: any): string {
        const parts: string[] = [];

        const jams = snapshot.total_jams || 0;
        if (jams > 0) parts.push(`${jams} atasco${jams > 1 ? 's' : ''}`);

        const incidents = snapshot.total_incidents || 0;
        if (incidents > 0) parts.push(`${incidents} incidente${incidents > 1 ? 's' : ''}`);

        if (snapshot.avg_speed) {
            const speed = Math.round(snapshot.avg_speed);
            parts.push(`velocidad ${speed} km/h`);
        }

        const delayMin = Math.round((snapshot.avg_delay || 0) / 60);
        if (delayMin > 0) parts.push(`${delayMin} min de demora`);

        return parts.length > 0 ? parts.join(', ') : 'Sin incidencias';
    }

    /**
     * Guarda el score calculado en la base de datos
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async saveRiskScore(
        polygonId: string,
        polygonName: string,
        groupName: string,
        scores: any
    ): Promise<RiskScore> {
        // Calcular score final ponderado
        const finalScore =
            scores.traffic_score * this.weights.traffic +
            scores.incident_score * this.weights.incidents +
            scores.weather_score * this.weights.weather +
            scores.speed_score * this.weights.speed +
            scores.delay_score * this.weights.delay;

        // Determinar nivel de riesgo
        let riskLevel: RiskScore['risk_level'];
        if (finalScore >= 81) riskLevel = 'SEVERE';
        else if (finalScore >= 61) riskLevel = 'CRITICAL';
        else if (finalScore >= 41) riskLevel = 'HIGH';
        else if (finalScore >= 21) riskLevel = 'MODERATE';
        else riskLevel = 'LOW';

        // Determinar categoría dominante
        const maxScore = Math.max(
            scores.traffic_score,
            scores.incident_score,
            scores.weather_score,
            scores.speed_score,
            scores.delay_score
        );

        let category = 'normal';
        if (maxScore === scores.incident_score && maxScore > 50) category = 'incident_zone';
        else if (maxScore === scores.weather_score && maxScore > 50) category = 'weather_hazard';
        else if (maxScore === scores.traffic_score && maxScore > 50) category = 'traffic_congestion';
        else if (finalScore > 60) category = 'mixed';

        // Trigger de alerta
        const alertTriggered = finalScore >= 61;

        await dbService.query(
            `INSERT INTO polygon_criticality_scores (
                polygon_id, polygon_name, group_name,
                traffic_score, incident_score, weather_score, speed_score, delay_score,
                final_risk_score, risk_level, risk_category, alert_triggered
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                polygonId, polygonName, groupName,
                scores.traffic_score.toFixed(2),
                scores.incident_score.toFixed(2),
                scores.weather_score.toFixed(2),
                scores.speed_score.toFixed(2),
                scores.delay_score.toFixed(2),
                finalScore.toFixed(2),
                riskLevel,
                category,
                alertTriggered
            ]
        );

        return {
            polygon_id: polygonId,
            polygon_name: polygonName,
            group_name: groupName,
            calculated_at: new Date(),
            traffic_score: scores.traffic_score,
            incident_score: scores.incident_score,
            weather_score: scores.weather_score,
            speed_score: scores.speed_score,
            delay_score: scores.delay_score,
            final_risk_score: finalScore,
            risk_level: riskLevel,
            risk_category: category,
            alert_triggered: alertTriggered,
            raw_data: {
                total_jams: scores.total_jams || 0,
                total_incidents: scores.total_incidents || 0,
                avg_speed: scores.avg_speed || null,
                avg_delay: scores.avg_delay || 0,
                conditions_summary: this.generateConditionsSummary(scores)
            }
        };
    }

    /**
     * Obtiene los últimos scores por grupo CON raw_data del snapshot actual
     */
    async getRiskScoresByGroup(groupName?: string): Promise<RiskScore[]> {
        // Query que combina scores con datos del snapshot más reciente
        let query = `
            SELECT
                lrs.*,
                ps.total_jams,
                ps.total_incidents,
                ps.avg_speed,
                ps.avg_delay
            FROM latest_polygon_risk_scores lrs
            LEFT JOIN LATERAL (
                SELECT total_jams, total_incidents, avg_speed, avg_delay
                FROM polygon_snapshots
                WHERE polygon_id = lrs.polygon_id
                ORDER BY timestamp DESC
                LIMIT 1
            ) ps ON true
        `;
        const params: string[] = [];

        if (groupName) {
            query += ' WHERE lrs.group_name = $1';
            params.push(groupName);
        }

        query += ' ORDER BY lrs.final_risk_score DESC';

        const result = await dbService.query(query, params);
        return result.rows.map(row => {
            // Generar conditions_summary
            const parts: string[] = [];
            const jams = row.total_jams || 0;
            if (jams > 0) parts.push(`${jams} atasco${jams > 1 ? 's' : ''}`);
            const incidents = row.total_incidents || 0;
            if (incidents > 0) parts.push(`${incidents} incidente${incidents > 1 ? 's' : ''}`);
            if (row.avg_speed) parts.push(`${Math.round(row.avg_speed)} km/h`);
            const delayMin = Math.round((row.avg_delay || 0) / 60);
            if (delayMin > 0) parts.push(`${delayMin} min demora`);
            const conditionsSummary = parts.length > 0 ? parts.join(', ') : 'Sin incidencias';

            return {
                polygon_id: row.polygon_id as string,
                polygon_name: row.polygon_name as string,
                group_name: row.group_name as string,
                calculated_at: row.calculated_at as Date,
                traffic_score: parseFloat(row.traffic_score as string),
                incident_score: parseFloat(row.incident_score as string),
                weather_score: parseFloat(row.weather_score as string),
                speed_score: parseFloat(row.speed_score as string),
                delay_score: parseFloat(row.delay_score as string),
                final_risk_score: parseFloat(row.final_risk_score as string),
                risk_level: row.risk_level as RiskScore['risk_level'],
                risk_category: row.risk_category as string,
                alert_triggered: row.alert_triggered as boolean,
                raw_data: {
                    total_jams: row.total_jams || 0,
                    total_incidents: row.total_incidents || 0,
                    avg_speed: row.avg_speed ? parseFloat(row.avg_speed) : null,
                    avg_delay: row.avg_delay || 0,
                    conditions_summary: conditionsSummary
                }
            };
        });
    }

    /**
     * Obtiene resumen de riesgos por todos los grupos
     */
    async getGroupRiskSummaries(): Promise<GroupRiskSummary[]> {
        const groups = getAllGroups();
        const summaries: GroupRiskSummary[] = [];

        for (const group of groups) {
            const scores = await this.getRiskScoresByGroup(group);

            if (scores.length === 0) continue;

            const distribution = {
                low: scores.filter(s => s.risk_level === 'LOW').length,
                moderate: scores.filter(s => s.risk_level === 'MODERATE').length,
                high: scores.filter(s => s.risk_level === 'HIGH').length,
                critical: scores.filter(s => s.risk_level === 'CRITICAL').length,
                severe: scores.filter(s => s.risk_level === 'SEVERE').length,
            };

            summaries.push({
                group_name: group,
                polygon_count: scores.length,
                avg_risk_score: scores.reduce((sum, s) => sum + s.final_risk_score, 0) / scores.length,
                max_risk_score: Math.max(...scores.map(s => s.final_risk_score)),
                critical_polygons: distribution.critical + distribution.severe,
                risk_distribution: distribution
            });
        }

        return summaries.sort((a, b) => b.avg_risk_score - a.avg_risk_score);
    }

    /**
     * Obtiene score de un polígono específico
     */
    async getPolygonRiskScore(polygonId: string): Promise<RiskScore | null> {
        const result = await dbService.query(
            'SELECT * FROM latest_polygon_risk_scores WHERE polygon_id = $1',
            [polygonId]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            polygon_id: row.polygon_id as string,
            polygon_name: row.polygon_name as string,
            group_name: row.group_name as string,
            calculated_at: row.calculated_at as Date,
            traffic_score: parseFloat(row.traffic_score as string),
            incident_score: parseFloat(row.incident_score as string),
            weather_score: parseFloat(row.weather_score as string),
            speed_score: parseFloat(row.speed_score as string),
            delay_score: parseFloat(row.delay_score as string),
            final_risk_score: parseFloat(row.final_risk_score as string),
            risk_level: row.risk_level as RiskScore['risk_level'],
            risk_category: row.risk_category as string,
            alert_triggered: row.alert_triggered as boolean
        };
    }
}

export const riskScoringService = new RiskScoringService();

