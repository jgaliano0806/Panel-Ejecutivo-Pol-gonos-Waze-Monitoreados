import React, { useState } from "react";
import {
  getIncidentTypeColors,
  getUIIconSvg,
  getWazeIconSvg,
  getWazePartnerHubIconUrl,
} from "../../utils/wazeIcons";
import { iconCacheService } from "../../utils/iconCache";

interface WazeIconProps {
  type: string;
  subtype?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
  uiIcon?: boolean; // Si es true, usa iconos genéricos de UI en lugar de incidentes
  iconCache?: typeof iconCacheService;
}

const sizeClasses = {
  sm: "w-8 h-8", // Estaba w-6 h-6
  md: "w-10 h-10", // Estaba w-8 h-8
  lg: "w-12 h-12", // Estaba w-10 h-10
  xl: "w-16 h-16", // Estaba w-12 h-12
};

/**
 * Componente para mostrar iconos de Waze
 * Usa SVGs inline de wazeIcons.ts para evitar errores 403 del Partner Hub
 */
export const WazeIcon: React.FC<WazeIconProps> = ({
  type,
  subtype,
  size = "md",
  className = "",
  showBadge = false,
  uiIcon = false,
  iconCache = iconCacheService,
}) => {
  const [imgError, setImgError] = useState(false);
  const colors = uiIcon
    ? { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" }
    : getIncidentTypeColors(type);

  // Si es icono de UI, usar SVG inline
  if (uiIcon) {
    const svgContent = getUIIconSvg(type);
    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
      >
        <div
          className={`${sizeClasses[size]} flex items-center justify-center`}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
        {showBadge && (
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}
          />
        )}
      </div>
    );
  }

  // Intentar usar iconos oficiales via proxy (o locales mapeados)
  const officialIconUrl = getWazePartnerHubIconUrl(type, subtype);

  // Si tenemos URL (que ahora apunta a iconos locales reales), la usamos
  if (!imgError && officialIconUrl && !uiIcon) {
    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
      >
        <img
          src={officialIconUrl}
          alt={subtype || type}
          className={`${sizeClasses[size]} object-contain`}
          onError={() => {
            console.warn(
              `⚠️ Error cargando icono local/oficial: ${officialIconUrl}, cayendo a SVG fallback`,
            );
            setImgError(true);
          }}
        />
        {showBadge && (
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}
          />
        )}
      </div>
    );
  }

  // Fallback a SVG inline (solo si no hay URL o dio error, o es uiIcon)
  // Para incidentes de Waze, usar SVG inline directamente como respaldo
  const svgContent = uiIcon
    ? getUIIconSvg(type)
    : getWazeIconSvg(type, subtype);

  // Fallback a SVG inline
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <div
        className={`${sizeClasses[size]} flex items-center justify-center`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        title={subtype || type}
      />
      {showBadge && (
        <span
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}
        />
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
                ${onClick ? "cursor-pointer" : "cursor-default"}
            `}
    >
      <WazeIcon type={type} subtype={subtype} size="sm" />
      {label && <span className="text-sm font-medium">{label}</span>}
      {count !== undefined && count > 0 && (
        <span
          className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    bg-white/80 ${colors.text}
                `}
        >
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
