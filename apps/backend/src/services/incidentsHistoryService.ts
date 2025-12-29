import { DatabaseService } from '../database/dbService';

interface IncidentHistoryRecord {
    incident_id: string;
    polygon_id: string;
    polygon_name?: string;
    type: string;
    subtype?: string;
    severity?: number;
    street?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    confidence?: number;
    reliability?: number;
    n_thumbs_up?: number;
    first_seen_at: Date;
    last_seen_at?: Date;
    duration_minutes?: number;
    blocking_jams?: number;
    estimated_delay_minutes?: number;
}

interface HotspotResult {
    latitude: number;
    longitude: number;
    incident_count: number;
    avg_duration_minutes: number;
    most_common_type: string;
    street?: string;
}

export class IncidentsHistoryService {
    private db: DatabaseService;

    constructor() {
        this.db = DatabaseService.getInstance();
    }

    async saveIncident(incident: IncidentHistoryRecord): Promise<void> {
        const query = `
            INSERT INTO incidents_history (
                incident_id, polygon_id, polygon_name, type, subtype, severity,
                street, city, latitude, longitude, confidence, reliability,
                n_thumbs_up, first_seen_at, last_seen_at, duration_minutes,
                blocking_jams, estimated_delay_minutes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (incident_id) DO UPDATE SET
                last_seen_at = EXCLUDED.last_seen_at,
                duration_minutes = EXTRACT(EPOCH FROM (EXCLUDED.last_seen_at - incidents_history.first_seen_at)) / 60,
                blocking_jams = EXCLUDED.blocking_jams,
                estimated_delay_minutes = EXCLUDED.estimated_delay_minutes
        `;

        await this.db.query(query, [
            incident.incident_id,
            incident.polygon_id,
            incident.polygon_name,
            incident.type,
            incident.subtype,
            incident.severity,
            incident.street,
            incident.city,
            incident.latitude,
            incident.longitude,
            incident.confidence,
            incident.reliability,
            incident.n_thumbs_up,
            incident.first_seen_at,
            incident.last_seen_at,
            incident.duration_minutes,
            incident.blocking_jams,
            incident.estimated_delay_minutes
        ]);
    }

    async getIncidents(filters: {
        polygon_id?: string;
        type?: string;
        from?: Date;
        to?: Date;
        limit?: number;
    }): Promise<IncidentHistoryRecord[]> {
        let query = 'SELECT * FROM incidents_history WHERE 1=1';
        const params: unknown[] = [];
        let paramIndex = 1;

        if (filters.polygon_id) {
            query += ` AND polygon_id = $${paramIndex++}`;
            params.push(filters.polygon_id);
        }

        if (filters.type) {
            query += ` AND type = $${paramIndex++}`;
            params.push(filters.type);
        }

        if (filters.from) {
            query += ` AND first_seen_at >= $${paramIndex++}`;
            params.push(filters.from);
        }

        if (filters.to) {
            query += ` AND first_seen_at <= $${paramIndex++}`;
            params.push(filters.to);
        }

        query += ' ORDER BY first_seen_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }

        const result = await this.db.query(query, params);
        return result.rows as IncidentHistoryRecord[];
    }

    async getHotspots(params: {
        min_incidents?: number;
        radius_meters?: number;
        from?: Date;
        to?: Date;
        limit?: number;
    }): Promise<HotspotResult[]> {
        const minIncidents = params.min_incidents || 5;
        const radiusMeters = params.radius_meters || 500;
        const limit = params.limit || 10;

        let query = `
            WITH clustered_incidents AS (
                SELECT
                    ROUND(latitude::numeric, 4) as lat_cluster,
                    ROUND(longitude::numeric, 4) as lon_cluster,
                    COUNT(*) as incident_count,
                    AVG(duration_minutes) as avg_duration,
                    MODE() WITHIN GROUP (ORDER BY type) as most_common_type,
                    MAX(street) as street
                FROM incidents_history
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `;

        const queryParams: unknown[] = [];
        let paramIndex = 1;

        if (params.from) {
            query += ` AND first_seen_at >= $${paramIndex++}`;
            queryParams.push(params.from);
        }

        if (params.to) {
            query += ` AND first_seen_at <= $${paramIndex++}`;
            queryParams.push(params.to);
        }

        query += `
                GROUP BY lat_cluster, lon_cluster
                HAVING COUNT(*) >= $${paramIndex++}
            )
            SELECT
                lat_cluster as latitude,
                lon_cluster as longitude,
                incident_count,
                ROUND(avg_duration::numeric, 2) as avg_duration_minutes,
                most_common_type,
                street
            FROM clustered_incidents
            ORDER BY incident_count DESC
            LIMIT $${paramIndex++}
        `;

        queryParams.push(minIncidents, limit);

        const result = await this.db.query(query, queryParams);
        return result.rows as HotspotResult[];
    }

    async getIncidentStats(params: {
        polygon_id?: string;
        group_by: 'type' | 'hour' | 'day';
        from?: Date;
        to?: Date;
    }): Promise<Record<string, unknown>[]> {
        let groupByClause = '';
        let selectClause = '';

        switch (params.group_by) {
            case 'type':
                groupByClause = 'type';
                selectClause = 'type as category';
                break;
            case 'hour':
                groupByClause = 'EXTRACT(HOUR FROM first_seen_at)';
                selectClause = 'EXTRACT(HOUR FROM first_seen_at) as category';
                break;
            case 'day':
                groupByClause = 'DATE(first_seen_at)';
                selectClause = 'DATE(first_seen_at) as category';
                break;
        }

        let query = `
            SELECT
                ${selectClause},
                COUNT(*) as total_incidents,
                AVG(duration_minutes) as avg_duration,
                AVG(estimated_delay_minutes) as avg_delay,
                SUM(blocking_jams) as total_blocking_jams
            FROM incidents_history
            WHERE 1=1
        `;

        const queryParams: unknown[] = [];
        let paramIndex = 1;

        if (params.polygon_id) {
            query += ` AND polygon_id = $${paramIndex++}`;
            queryParams.push(params.polygon_id);
        }

        if (params.from) {
            query += ` AND first_seen_at >= $${paramIndex++}`;
            queryParams.push(params.from);
        }

        if (params.to) {
            query += ` AND first_seen_at <= $${paramIndex++}`;
            queryParams.push(params.to);
        }

        query += ` GROUP BY ${groupByClause} ORDER BY category`;

        const result = await this.db.query(query, queryParams);
        return result.rows;
    }
}

export const incidentsHistoryService = new IncidentsHistoryService();



