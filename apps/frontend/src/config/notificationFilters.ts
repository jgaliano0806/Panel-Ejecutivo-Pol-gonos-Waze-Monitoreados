/**
 * Configuración de filtros para notificaciones TTS y Snackbar
 * 
 * Define qué tipos y subtipos de incidentes deben:
 * - Activar TTS (lectura en voz alta)
 * - Mostrar Snackbar (notificación visual flotante)
 * 
 * IMPORTANTE: Todos los incidentes se siguen mostrando en el mapa,
 * este filtro solo afecta las notificaciones auditivas y visuales.
 */

/**
 * Subtipos permitidos por tipo de incidente para TTS y Snackbar
 * 
 * - ACCIDENT: Todos los accidentes activan notificación
 * - HAZARD: Solo subtipos específicos activan notificación
 */
export const TTS_SNACKBAR_ALLOWED_INCIDENTS: Record<string, string[] | '*'> = {
  // Accidentes - TODOS los subtipos activan TTS/Snackbar
  ACCIDENT: '*', // '*' significa todos los subtipos
  
  // Peligros - Solo subtipos específicos
  HAZARD: [
    'HAZARD_ON_ROAD_CAR_STOPPED',      // Vehículo detenido en carril
    'HAZARD_ON_SHOULDER_CAR_STOPPED',  // Vehículo detenido en banquina
    'HAZARD_ON_ROAD_OBJECT',           // Obstáculo en la vía
    'HAZARD_ON_SHOULDER_ANIMALS',      // Animales sueltos
  ],
};

/**
 * Verifica si una notificación debe activar TTS y/o Snackbar
 * 
 * @param type - Tipo principal del incidente (ACCIDENT, HAZARD, etc.)
 * @param subtype - Subtipo del incidente (ACCIDENT_MAJOR, HAZARD_ON_ROAD_OBJECT, etc.)
 * @returns true si debe mostrar TTS/Snackbar, false si no
 */
export function shouldShowTTSAndSnackbar(
  type?: string | null,
  subtype?: string | null
): boolean {
  if (!type) return false;
  
  const normalizedType = type.toUpperCase();
  const normalizedSubtype = subtype?.toUpperCase() || null;
  
  // Verificar si el tipo está en la lista de permitidos
  const allowedSubtypes = TTS_SNACKBAR_ALLOWED_INCIDENTS[normalizedType];
  
  if (!allowedSubtypes) {
    // El tipo no está en la configuración, no mostrar
    return false;
  }
  
  // Si allowedSubtypes es '*', permitir todos los subtipos de ese tipo
  if (allowedSubtypes === '*') {
    return true;
  }
  
  // Si no hay subtipo, verificar si se permite el tipo sin subtipo
  if (!normalizedSubtype) {
    // Para ACCIDENT sin subtipo, permitir
    if (normalizedType === 'ACCIDENT') {
      return true;
    }
    // Para otros tipos, no permitir sin subtipo específico
    return false;
  }
  
  // Verificar si el subtipo específico está permitido
  return allowedSubtypes.some(allowed => 
    normalizedSubtype === allowed.toUpperCase() ||
    normalizedSubtype.includes(allowed.toUpperCase())
  );
}

/**
 * Obtiene una descripción legible del filtro activo
 * Útil para mostrar en UI de configuración
 */
export function getFilterDescription(): string[] {
  const descriptions: string[] = [];
  
  for (const [type, subtypes] of Object.entries(TTS_SNACKBAR_ALLOWED_INCIDENTS)) {
    if (subtypes === '*') {
      descriptions.push(`${type}: Todos los subtipos`);
    } else {
      descriptions.push(`${type}: ${subtypes.join(', ')}`);
    }
  }
  
  return descriptions;
}
