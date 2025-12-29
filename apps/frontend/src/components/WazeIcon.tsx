import React, { useState } from 'react';
import { getIncidentTypeColors, getUIIconSvg } from '../utils/wazeIcons';
import { iconCacheService } from '../utils/iconCache';

interface WazeIconProps {
    type: string;
    subtype?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showBadge?: boolean;
    uiIcon?: boolean; // Si es true, usa iconos genéricos de UI en lugar de incidentes
    iconCache?: typeof iconCacheService;
}

const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
};

/**
 * Componente para mostrar iconos de Waze
 * Utiliza los iconos oficiales del Partner Hub de Waze
 */
export const WazeIcon: React.FC<WazeIconProps> = ({
    type,
    subtype,
    size = 'md',
    className = '',
    showBadge = false,
    uiIcon = false,
    iconCache = iconCacheService,
}) => {
    const [imgError, setImgError] = useState(false);
    const colors = uiIcon ? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' } : getIncidentTypeColors(type);

    // Si es icono de UI, usar SVG inline
    if (uiIcon) {
        const svgContent = getUIIconSvg(type);
        return (
            <div className={`relative inline-flex items-center justify-center ${className}`}>
                <div
                    className={`${sizeClasses[size]} flex items-center justify-center`}
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                />
                {showBadge && (
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`} />
                )}
            </div>
        );
    }

    // Para incidentes, usar el servicio de cache de iconos de Waze
    const iconUrl = iconCache.getIconUrlSync(type, subtype);

    // Debug específico para ROAD_CLOSED_EVENT
    if (type === 'roadclosed' && subtype === 'ROAD_CLOSED_EVENT') {
        console.log(`🚧 ROAD_CLOSED_EVENT Debug:`, { type, subtype, iconUrl });
    }

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            {imgError ? (
                // Fallback si la imagen no carga
                <div className={`${sizeClasses[size]} flex items-center justify-center bg-gray-200 rounded`}>
                    <span className="text-xs text-gray-500">⚠️</span>
                </div>
            ) : (
                <img
                    src={iconUrl}
                    alt={type}
                    className={`${sizeClasses[size]} object-contain`}
                    onError={() => setImgError(true)}
                />
            )}
            {showBadge && (
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`} />
            )}
        </div>
    );
};

interface WazeIconBadgeProps {
    type: string;
    subtype?: string;
    label?: string;
    count?: number;
    onClick?: () => void;
}

/**
 * Badge con icono de Waze y etiqueta
 */
export const WazeIconBadge: React.FC<WazeIconBadgeProps> = ({
    type,
    subtype,
    label,
    count,
    onClick,
}) => {
    const colors = getIncidentTypeColors(type);

    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-lg
                ${colors.bg} ${colors.text} ${colors.border} border
                transition-all hover:shadow-md hover:scale-105
                ${onClick ? 'cursor-pointer' : 'cursor-default'}
            `}
        >
            <WazeIcon type={type} subtype={subtype} size="sm" />
            {label && <span className="text-sm font-medium">{label}</span>}
            {count !== undefined && count > 0 && (
                <span className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    bg-white/80 ${colors.text}
                `}>
                    {count}
                </span>
            )}
        </button>
    );
};

/**
 * Grid de iconos de Waze para mostrar resumen de eventos
 */
interface WazeEventsSummaryProps {
    events: Array<{
        type: string;
        subtype?: string;
        count: number;
        label: string;
    }>;
    onEventClick?: (type: string) => void;
}

export const WazeEventsSummary: React.FC<WazeEventsSummaryProps> = ({
    events,
    onEventClick,
}) => {
    return (
        <div className="flex flex-wrap gap-2">
            {events.map((event, index) => (
                <WazeIconBadge
                    key={`${event.type}-${index}`}
                    type={event.type}
                    subtype={event.subtype}
                    label={event.label}
                    count={event.count}
                    onClick={onEventClick ? () => onEventClick(event.type) : undefined}
                />
            ))}
        </div>
    );
};

export default WazeIcon;


