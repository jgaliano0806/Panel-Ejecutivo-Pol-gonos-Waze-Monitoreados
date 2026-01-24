/**
 * Índice de utilidades de Waze
 * Centraliza todas las traducciones, iconos y utilidades relacionadas con Waze
 */

// Traducciones
export {
  WAZE_TRANSLATIONS,
  SUBTYPE_DIRECT_TRANSLATIONS,
  MAIN_TYPE_TRANSLATIONS,
  ROAD_TYPE_TRANSLATIONS,
  JAM_LEVEL_TRANSLATIONS,
  IRREGULARITY_TYPE_TRANSLATIONS,
  getSubtypeTranslation,
  getMainTypeTranslation,
  getRoadTypeTranslation,
  getJamLevelTranslation,
  getIrregularityTranslation,
  getIncidentDescription,
  getIncidentEmoji,
  getIncidentColor,
} from "./wazeTranslations";

// Iconos
export {
  WAZE_ICONS_SVG,
  INCIDENT_TYPE_ICONS,
  INCIDENT_SUBTYPE_ICONS,
  INCIDENT_TYPE_COLORS,
  getWazeIconSvg,
  getWazePartnerHubIconUrl,
  getIncidentTypeColors,
} from "./wazeIcons";

// Componentes de iconos
export {
  WazeIcon,
  WazeIconBadge,
  WazeEventsSummary,
} from "../components/ui/WazeIcon";
