import type { DiscrepancyAlert, AlertSeverity } from '../types';
import type { FluidityIndex } from './fluidityCalculations';
import { ALERT_THRESHOLDS } from '../config/alertThresholds';

/**
 * Detecta alertas de discrepancia entre métricas Waze y TVT
 */
export function detectDiscrepancyAlerts(
    fluidityIndex: FluidityIndex
): DiscrepancyAlert[] {
    const alerts: DiscrepancyAlert[] = [];

    const { wazeMetrics, tvtMetrics } = fluidityIndex.context;

    // Solo generar alertas si hay datos suficientes
    if (wazeMetrics.count === 0 && tvtMetrics.count === 0) {
        return alerts;
    }

    // 1. Alerta de Discrepancia de Velocidad
    const speedDiff = Math.abs(wazeMetrics.avgSpeed - tvtMetrics.avgSpeed);
    if (speedDiff >= ALERT_THRESHOLDS.speed.medium && wazeMetrics.count > 0 && tvtMetrics.count > 0) {
        alerts.push(createSpeedDiscrepancyAlert(fluidityIndex, speedDiff));
    }

    // 2. Alerta de Discrepancia de Cobertura
    const maxCount = Math.max(wazeMetrics.count, tvtMetrics.count);
    if (maxCount > 0) {
        const countDiff = Math.abs(wazeMetrics.count - tvtMetrics.count);
        const coverageRatio = countDiff / maxCount;

        if (coverageRatio >= ALERT_THRESHOLDS.coverage.medium) {
            alerts.push(createCoverageDiscrepancyAlert(fluidityIndex, coverageRatio));
        }
    }

    // 3. Alerta de Discrepancia de Delay
    const delayDiff = Math.abs(wazeMetrics.avgDelay - tvtMetrics.avgDelay);
    if (delayDiff >= ALERT_THRESHOLDS.delay.medium && wazeMetrics.count > 0 && tvtMetrics.count > 0) {
        alerts.push(createDelayDiscrepancyAlert(fluidityIndex, delayDiff));
    }

    return alerts;
}

/**
 * Crea alerta de discrepancia de velocidad
 */
/**
 * Crea alerta de discrepancia de velocidad
 */
function createSpeedDiscrepancyAlert(
    index: FluidityIndex,
    speedDiff: number
): DiscrepancyAlert {
    const severity: AlertSeverity =
        speedDiff >= ALERT_THRESHOLDS.speed.critical ? 'critical' :
            speedDiff >= ALERT_THRESHOLDS.speed.high ? 'high' : 'medium';

    const { wazeMetrics, tvtMetrics } = index.context;

    const recommendation =
        severity === 'critical'
            ? 'Se recomienda enviar una patrulla para verificar la velocidad real.'
            : severity === 'high'
                ? 'Verificar situación en los próximos 30 minutos.'
                : 'Mantener monitoreo para ver si la diferencia persiste.';

    const fasterSource = wazeMetrics.avgSpeed > tvtMetrics.avgSpeed ? 'Waze' : 'TVT';
    const slowerSource = wazeMetrics.avgSpeed > tvtMetrics.avgSpeed ? 'TVT' : 'Waze';

    return {
        id: `speed-${Date.now()}`,
        timestamp: new Date(),
        type: 'speed_discrepancy',
        severity,
        polygonId: 'SYSTEM',
        polygonName: 'Sistema General',
        data: {
            waze: wazeMetrics,
            tvt: tvtMetrics,
            difference: {
                speed: speedDiff,
                delay: Math.abs(wazeMetrics.avgDelay - tvtMetrics.avgDelay),
                coverageRatio: 0
            }
        },
        message: `Diferencia de velocidad: ${fasterSource} reporta tráfico más rápido que ${slowerSource} (diferencia de ${speedDiff.toFixed(0)} km/h).`,
        recommendation,
        isAcknowledged: false
    };
}

/**
 * Crea alerta de discrepancia de cobertura
 */
function createCoverageDiscrepancyAlert(
    index: FluidityIndex,
    coverageRatio: number
): DiscrepancyAlert {
    const severity: AlertSeverity =
        coverageRatio >= ALERT_THRESHOLDS.coverage.critical ? 'critical' :
            coverageRatio >= ALERT_THRESHOLDS.coverage.high ? 'high' : 'medium';

    const { wazeMetrics, tvtMetrics } = index.context;

    const moreSource = wazeMetrics.count > tvtMetrics.count ? 'Waze' : 'TVT';
    const lessCount = Math.min(wazeMetrics.count, tvtMetrics.count);
    const moreCount = Math.max(wazeMetrics.count, tvtMetrics.count);

    const recommendation =
        moreSource === 'TVT'
            ? 'Confiar más en los sensores (TVT) ya que Waze tiene pocos reportes en esta zona.'
            : 'Los usuarios de Waze reportan actividad que los sensores no están detectando. Verificar.';

    // Mensaje explicativo simple
    let message = '';
    if (moreSource === 'TVT') {
        message = `Waze detecta mucho menos tráfico que los sensores/cámaras (${lessCount} reportes vs ${moreCount}).`;
    } else {
        message = `Hay reportes de usuarios en Waze que los sensores no captan (${moreCount} vs ${lessCount}).`;
    }

    return {
        id: `coverage-${Date.now()}`,
        timestamp: new Date(),
        type: 'coverage_discrepancy',
        severity,
        polygonId: 'SYSTEM',
        polygonName: 'Sistema General',
        data: {
            waze: wazeMetrics,
            tvt: tvtMetrics,
            difference: {
                speed: Math.abs(wazeMetrics.avgSpeed - tvtMetrics.avgSpeed),
                delay: Math.abs(wazeMetrics.avgDelay - tvtMetrics.avgDelay),
                coverageRatio
            }
        },
        message,
        recommendation,
        isAcknowledged: false
    };
}

/**
 * Crea alerta de discrepancia de delay
 */
function createDelayDiscrepancyAlert(
    index: FluidityIndex,
    delayDiff: number
): DiscrepancyAlert {
    const severity: AlertSeverity =
        delayDiff >= ALERT_THRESHOLDS.delay.critical ? 'critical' :
            delayDiff >= ALERT_THRESHOLDS.delay.high ? 'high' : 'medium';

    const { wazeMetrics, tvtMetrics } = index.context;

    const higherSource = wazeMetrics.avgDelay > tvtMetrics.avgDelay ? 'Waze' : 'TVT';
    const lowerSource = wazeMetrics.avgDelay > tvtMetrics.avgDelay ? 'TVT' : 'Waze';

    const recommendation =
        severity === 'critical'
            ? `Investigar por qué ${higherSource} reporta tanta demora adicional.`
            : 'Comparar tiempos de viaje reportados por ambas fuentes.';

    return {
        id: `delay-${Date.now()}`,
        timestamp: new Date(),
        type: 'delay_discrepancy',
        severity,
        polygonId: 'SYSTEM',
        polygonName: 'Sistema General',
        data: {
            waze: wazeMetrics,
            tvt: tvtMetrics,
            difference: {
                speed: Math.abs(wazeMetrics.avgSpeed - tvtMetrics.avgSpeed),
                delay: delayDiff,
                coverageRatio: 0
            }
        },
        message: `Tiempo de demora inconsistente: ${higherSource} calcula ${Math.round(delayDiff)} segundos más de retraso que ${lowerSource}.`,
        recommendation,
        isAcknowledged: false
    };
}
