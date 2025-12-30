import { WazeAlert } from '../repositories/WazeAlertRepository';
import { WazeJam } from '../repositories/WazeJamRepository';
import { InternalAlert, InternalJam, IncidentType, Severity } from '../types';
import { calculateAlertSeverity, mapJamSeverity, mapIncidentType } from './wazeUtils';

export function toLegacyAlert(entity: WazeAlert): InternalAlert {
    return {
        id: entity.uuid,
        polygonId: entity.polygon_id || null,
        type: mapIncidentType(entity.type),
        subtype: entity.subtype,
        severity: calculateAlertSeverity(entity),
        description: entity.reportDescription || entity.type,
        timestamp: new Date(Number(entity.pubMillis)),
        location: {
            lat: entity.location.y,
            lng: entity.location.x
        },
        street: entity.street,
        city: entity.city,
        confidence: entity.confidence,
        reliability: entity.reliability,
        // Properties not in DB entity but present in legacy type
        reportRating: entity.confidence, // fallback
        nThumbsUp: 0
    };
}

export function toLegacyJam(entity: WazeJam): InternalJam {
    // Parse polyline if it's a string, otherwise assume it's an object/array
    let line: Array<{x: number, y: number}> = [];
    if (typeof entity.polyline === 'string') {
        try {
            line = JSON.parse(entity.polyline);
        } catch (e) {
            line = [];
        }
    } else if (Array.isArray(entity.polyline)) {
        line = entity.polyline;
    }

    const startLocation = line.length > 0 ? { lat: line[0].y, lng: line[0].x } : { lat: 0, lng: 0 };
    const endLocation = line.length > 1 ? { lat: line[line.length - 1].y, lng: line[line.length - 1].x } : undefined;

    return {
        id: entity.uuid,
        polygonId: entity.polygon_id || null,
        speed: entity.speedKMH || 0,
        delay: entity.delay || 0,
        severity: mapJamSeverity(entity.level || 0),
        length: entity.length || 0,
        timestamp: new Date(Number(entity.pubMillis)),
        location: startLocation,
        endLocation: endLocation,
        level: entity.level || 0,
        street: entity.street,
        roadType: 0, // Not in entity
        turnType: "", // Not in entity
        blockingAlertUuid: entity.blockingAlertUuid, // Not in Entity interface in repo?
        line: line,
        source: 'waze'
    };
}
