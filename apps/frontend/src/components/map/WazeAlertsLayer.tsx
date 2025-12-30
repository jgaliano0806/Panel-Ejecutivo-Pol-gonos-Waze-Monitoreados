import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

// Estilos inline para clusters
const clusterStyles = `
.cluster-marker {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.2s;
  border: 2px solid rgba(255,255,255,0.8);
}

.cluster-marker:hover {
  transform: scale(1.1);
}

.cluster-low { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
.cluster-high { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
.cluster-critical { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.cluster-severe { background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); }

.cluster-count {
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
`;

// Inyectar estilos una sola vez
let stylesInjected = false;
function injectClusterStyles() {
    if (stylesInjected) return;
    const styleEl = document.createElement('style');
    styleEl.textContent = clusterStyles;
    document.head.appendChild(styleEl);
    stylesInjected = true;
}

// Tipos
interface WazeAlert {
    uuid: string;
    type: string;
    subtype?: string;
    latitude: number;
    longitude: number;
    street?: string;
    city?: string;
    reliability?: number;
    confidence?: number;
    report_description?: string;
}

interface WazeAlertsLayerProps {
    alerts: WazeAlert[];
    onAlertClick?: (alert: WazeAlert) => void;
}

/**
 * Calcula la severidad máxima de un cluster
 */
const calculateClusterSeverity = (cluster: any): number => {
    try {
        const markers = cluster.getAllChildMarkers();
        if (!markers || markers.length === 0) return 0;

        const severities = markers.map((m: any) => {
            const severity = m.options?.severity ?? m.options?.data?.reliability ?? 5;
            return typeof severity === 'number' ? severity : 5;
        });

        return Math.max(...severities);
    } catch {
        return 5;
    }
};

/**
 * Crea el ícono de cluster con color basado en severidad
 */
const createClusterIcon = (cluster: any): L.DivIcon => {
    const count = cluster.getChildCount();
    const severity = calculateClusterSeverity(cluster);

    // Mapear severidad (1-10) a clase CSS
    const severityClass =
        severity >= 8 ? 'cluster-severe' :
        severity >= 6 ? 'cluster-critical' :
        severity >= 4 ? 'cluster-high' : 'cluster-low';

    // Tamaño basado en cantidad (min 36, max 56)
    const size = Math.min(36 + Math.floor(count * 0.4), 56);

    return L.divIcon({
        html: `<div class="cluster-marker ${severityClass}" style="width:${size}px;height:${size}px">
            <span class="cluster-count">${count}</span>
        </div>`,
        className: '',
        iconSize: L.point(size, size),
    });
};

/**
 * Crea ícono para alerta individual
 */
const createAlertIcon = (alert: WazeAlert): L.DivIcon => {
    const typeIcons: Record<string, string> = {
        ACCIDENT: '🚗',
        JAM: '🚦',
        HAZARD: '⚠️',
        ROAD_CLOSED: '🚧',
        WEATHERHAZARD: '🌧️',
        CONSTRUCTION: '🔧',
    };

    const icon = typeIcons[alert.type] || '📍';

    return L.divIcon({
        html: `<div style="
            font-size: 24px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        ">${icon}</div>`,
        className: '',
        iconSize: L.point(30, 30),
        iconAnchor: L.point(15, 15),
    });
};

/**
 * Componente de capa de alertas Waze con clustering
 */
export function WazeAlertsLayer({ alerts, onAlertClick }: WazeAlertsLayerProps) {
    // Inyectar estilos
    React.useEffect(() => {
        injectClusterStyles();
    }, []);

    // Filtrar alertas válidas
    const validAlerts = useMemo(() => {
        return alerts.filter(a =>
            typeof a.latitude === 'number' &&
            typeof a.longitude === 'number' &&
            !isNaN(a.latitude) &&
            !isNaN(a.longitude)
        );
    }, [alerts]);

    if (validAlerts.length === 0) {
        return null;
    }

    return (
        <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            disableClusteringAtZoom={18}
            iconCreateFunction={createClusterIcon}
            animate={true}
            animateAddingMarkers={false}
        >
            {validAlerts.map(alert => (
                <Marker
                    key={alert.uuid}
                    position={[alert.latitude, alert.longitude]}
                    icon={createAlertIcon(alert)}
                    eventHandlers={{
                        click: () => onAlertClick?.(alert),
                    }}
                    // @ts-ignore - custom property for severity calculation
                    severity={alert.reliability ?? 5}
                    data={alert}
                >
                    <Popup>
                        <div className="p-2">
                            <h3 className="font-bold text-sm">{alert.type}</h3>
                            {alert.subtype && (
                                <p className="text-xs text-gray-600">{alert.subtype}</p>
                            )}
                            {alert.street && (
                                <p className="text-xs mt-1">📍 {alert.street}</p>
                            )}
                            {alert.report_description && (
                                <p className="text-xs mt-1 italic">{alert.report_description}</p>
                            )}
                            <div className="flex gap-2 mt-2 text-xs text-gray-500">
                                {alert.reliability !== undefined && (
                                    <span>⭐ {alert.reliability.toFixed(1)}</span>
                                )}
                                {alert.confidence !== undefined && (
                                    <span>✓ {alert.confidence.toFixed(1)}</span>
                                )}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MarkerClusterGroup>
    );
}

export default WazeAlertsLayer;
