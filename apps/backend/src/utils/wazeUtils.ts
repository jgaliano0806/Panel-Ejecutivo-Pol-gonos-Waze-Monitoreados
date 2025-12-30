import { IncidentType, Severity } from '../types';

export interface AlertSeverityInput {
    type: string;
    confidence?: number;
    reliability?: number;
    nThumbsUp?: number;
    subtype?: string;
}

export function mapIncidentType(type: string): IncidentType {
    const map: Record<string, IncidentType> = {
        'ACCIDENT': IncidentType.ACCIDENT,
        'JAM': IncidentType.JAM,
        'WEATHERHAZARD': IncidentType.WEATHERHAZARD,
        'HAZARD': IncidentType.HAZARD,
        'MISC': IncidentType.HAZARD,
        'CONSTRUCTION': IncidentType.CONSTRUCTION,
        'ROAD_CLOSED': IncidentType.ROADCLOSED,
    };
    return map[type] || IncidentType.HAZARD;
}

export function calculateAlertSeverity(alert: AlertSeverityInput): Severity {
    // Base por tipo de incidente
    let baseSeverity: Severity;
    if (alert.type === 'ROAD_CLOSED') {
        baseSeverity = Severity.CRITICAL; // 4
    } else if (alert.type === 'ACCIDENT') {
        baseSeverity = Severity.HIGH; // 3
    } else if (alert.type === 'JAM') {
        baseSeverity = Severity.MEDIUM; // 2
    } else {
        baseSeverity = Severity.LOW; // 1
    }

    // Ajustar según métricas de calidad de Waze
    const confidence = alert.confidence || 0;
    const reliability = alert.reliability || 0;
    const nThumbsUp = alert.nThumbsUp || 0;

    // Si tiene alta confianza (>=7) y muchas confirmaciones (>=5), aumentar severidad
    if (confidence >= 7 && nThumbsUp >= 5 && baseSeverity < Severity.CRITICAL) {
        return (baseSeverity + 1) as Severity;
    }

    // Si tiene muy alta confianza (>=9) y muchas confirmaciones (>=10), puede ser CRITICAL
    if (confidence >= 9 && nThumbsUp >= 10 && baseSeverity < Severity.CRITICAL) {
        return Severity.CRITICAL;
    }

    // Si tiene baja confianza (<3) y pocas confirmaciones (<2), reducir severidad
    if (confidence < 3 && nThumbsUp < 2 && baseSeverity > Severity.LOW) {
        return (baseSeverity - 1) as Severity;
    }

    // Si tiene baja confiabilidad (<3), también considerar reducir
    if (reliability < 3 && baseSeverity > Severity.LOW) {
        const adjusted = (baseSeverity - 1) as Severity;
        return adjusted < Severity.LOW ? Severity.LOW : adjusted;
    }

    // Caso especial: ACCIDENT con alta confianza y confirmaciones puede ser CRITICAL
    if (alert.type === 'ACCIDENT' && confidence >= 8 && nThumbsUp >= 8) {
        return Severity.CRITICAL;
    }

    return baseSeverity;
}

export function mapJamSeverity(level: number): Severity {
    if (level >= 4) return Severity.CRITICAL;
    if (level === 3) return Severity.HIGH;
    if (level === 2) return Severity.MEDIUM;
    return Severity.LOW;
}
