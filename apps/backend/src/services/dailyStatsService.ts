import { DatabaseService } from '../database/dbService';

interface DailyStats {
    date: Date;
    avg_fluidity_percentage?: number;
    min_fluidity_percentage?: number;
    max_fluidity_percentage?: number;
    avg_speed?: number;
    min_speed?: number;
    total_incidents?: number;
    critical_incidents?: number;
    incidents_by_type?: Record<string, number>;
    total_jams?: number;
    avg_jam_duration_minutes?: number;
    critical_km_hours?: number;
    total_alerts?: number;
    critical_alerts?: number;
    avg_response_time_minutes?: number;
    worst_polygon_id?: string;
    worst_polygon_score?: number;
    best_polygon_id?: string;
    best_polygon_score?: number;
    peak_congestion_hour?: number;
    peak_incidents_hour?: number;
}

export class DailyStatsService {
    private db: DatabaseService;

    constructor() {
        this.db = DatabaseService.getInstance();
    }

    async saveDailyStats(stats: DailyStats): Promise<void> {
        const query = `
            INSERT INTO daily_statistics (
                date, avg_fluidity_percentage, min_fluidity_percentage, max_fluidity_percentage,
                avg_speed, min_speed, total_incidents, critical_incidents, incidents_by_type,
                total_jams, avg_jam_duration_minutes, critical_km_hours,
                total_alerts, critical_alerts, avg_response_time_minutes,
                worst_polygon_id, worst_polygon_score, best_polygon_id, best_polygon_score,
                peak_congestion_hour, peak_incidents_hour
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            ON CONFLICT (date) DO UPDATE SET
                avg_fluidity_percentage = EXCLUDED.avg_fluidity_percentage,
                min_fluidity_percentage = EXCLUDED.min_fluidity_percentage,
                max_fluidity_percentage = EXCLUDED.max_fluidity_percentage,
                avg_speed = EXCLUDED.avg_speed,
                min_speed = EXCLUDED.min_speed,
                total_incidents = EXCLUDED.total_incidents,
                critical_incidents = EXCLUDED.critical_incidents,
                incidents_by_type = EXCLUDED.incidents_by_type,
                total_jams = EXCLUDED.total_jams,
                avg_jam_duration_minutes = EXCLUDED.avg_jam_duration_minutes,
                critical_km_hours = EXCLUDED.critical_km_hours,
                total_alerts = EXCLUDED.total_alerts,
                critical_alerts = EXCLUDED.critical_alerts,
                avg_response_time_minutes = EXCLUDED.avg_response_time_minutes,
                worst_polygon_id = EXCLUDED.worst_polygon_id,
                worst_polygon_score = EXCLUDED.worst_polygon_score,
                best_polygon_id = EXCLUDED.best_polygon_id,
                best_polygon_score = EXCLUDED.best_polygon_score,
                peak_congestion_hour = EXCLUDED.peak_congestion_hour,
                peak_incidents_hour = EXCLUDED.peak_incidents_hour
        `;

        await this.db.query(query, [
            stats.date,
            stats.avg_fluidity_percentage,
            stats.min_fluidity_percentage,
            stats.max_fluidity_percentage,
            stats.avg_speed,
            stats.min_speed,
            stats.total_incidents,
            stats.critical_incidents,
            stats.incidents_by_type ? JSON.stringify(stats.incidents_by_type) : null,
            stats.total_jams,
            stats.avg_jam_duration_minutes,
            stats.critical_km_hours,
            stats.total_alerts,
            stats.critical_alerts,
            stats.avg_response_time_minutes,
            stats.worst_polygon_id,
            stats.worst_polygon_score,
            stats.best_polygon_id,
            stats.best_polygon_score,
            stats.peak_congestion_hour,
            stats.peak_incidents_hour
        ]);
    }

    async getDailyStats(from: Date, to: Date): Promise<DailyStats[]> {
        const query = `
            SELECT * FROM daily_statistics
            WHERE date >= $1 AND date <= $2
            ORDER BY date DESC
        `;

        const result = await this.db.query(query, [from, to]);
        return result.rows as DailyStats[];
    }

    async getWeeklyStats(from: Date, to: Date): Promise<Record<string, unknown>[]> {
        const query = `
            SELECT
                DATE_TRUNC('week', date) as week,
                AVG(avg_fluidity_percentage) as avg_fluidity,
                AVG(avg_speed) as avg_speed,
                SUM(total_incidents) as total_incidents,
                SUM(total_jams) as total_jams,
                SUM(total_alerts) as total_alerts
            FROM daily_statistics
            WHERE date >= $1 AND date <= $2
            GROUP BY week
            ORDER BY week DESC
        `;

        const result = await this.db.query(query, [from, to]);
        return result.rows;
    }

    async getMonthlyStats(from: Date, to: Date): Promise<Record<string, unknown>[]> {
        const query = `
            SELECT
                DATE_TRUNC('month', date) as month,
                AVG(avg_fluidity_percentage) as avg_fluidity,
                AVG(avg_speed) as avg_speed,
                SUM(total_incidents) as total_incidents,
                SUM(total_jams) as total_jams,
                SUM(total_alerts) as total_alerts
            FROM daily_statistics
            WHERE date >= $1 AND date <= $2
            GROUP BY month
            ORDER BY month DESC
        `;

        const result = await this.db.query(query, [from, to]);
        return result.rows;
    }

    async generateDailyStatsForDate(date: Date): Promise<void> {
        // Calcular estadísticas del día desde snapshots y otros datos
        const query = `
            WITH polygon_stats AS (
                SELECT
                    polygon_id,
                    AVG(avg_speed) as avg_speed,
                    MIN(avg_speed) as min_speed,
                    SUM(total_jams) as total_jams,
                    SUM(total_incidents) as total_incidents
                FROM polygon_snapshots
                WHERE DATE(timestamp) = $1
                GROUP BY polygon_id
            ),
            global_stats AS (
                SELECT
                    AVG(avg_speed) as avg_speed,
                    MIN(avg_speed) as min_speed,
                    SUM(total_jams) as total_jams,
                    SUM(total_incidents) as total_incidents
                FROM historical_snapshots
                WHERE DATE(timestamp) = $1
            ),
            alert_stats AS (
                SELECT
                    COUNT(*) as total_alerts,
                    COUNT(*) FILTER (WHERE severity >= 3) as critical_alerts,
                    AVG(response_time_minutes) as avg_response_time
                FROM alerts
                WHERE DATE(created_at) = $1
            )
            INSERT INTO daily_statistics (
                date, avg_speed, min_speed, total_jams, total_incidents,
                total_alerts, critical_alerts, avg_response_time_minutes
            )
            SELECT
                $1,
                g.avg_speed,
                g.min_speed,
                g.total_jams,
                g.total_incidents,
                a.total_alerts,
                a.critical_alerts,
                a.avg_response_time
            FROM global_stats g
            CROSS JOIN alert_stats a
            ON CONFLICT (date) DO UPDATE SET
                avg_speed = EXCLUDED.avg_speed,
                min_speed = EXCLUDED.min_speed,
                total_jams = EXCLUDED.total_jams,
                total_incidents = EXCLUDED.total_incidents,
                total_alerts = EXCLUDED.total_alerts,
                critical_alerts = EXCLUDED.critical_alerts,
                avg_response_time_minutes = EXCLUDED.avg_response_time_minutes
        `;

        await this.db.query(query, [date]);
    }
}

export const dailyStatsService = new DailyStatsService();



