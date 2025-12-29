/**
 * Servicio de caché para iconos de Waze
 * Optimiza la carga de iconos del Partner Hub para mejorar el rendimiento
 */

import { getWazePartnerHubIconUrl } from './wazeIcons';

// Tipos para el caché
interface CachedIcon {
  url: string;
  timestamp: number;
  element?: HTMLImageElement;
}

class IconCacheService {
  private cache: Map<string, CachedIcon> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
  private readonly COMMON_ICONS = [
    'accident',
    'hazard',
    'jam',
    'road_closed',
    'weatherhazard'
  ];

  /**
   * Obtiene la URL de un icono de manera síncrona (desde caché)
   */
  getIconUrlSync(type: string, subtype?: string): string {
    const key = this.getCacheKey(type, subtype);

    // Buscar en caché
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.url;
    }

    // Si no está en caché, obtener la URL y cachearla
    const url = getWazePartnerHubIconUrl(type, subtype);
    this.cache.set(key, {
      url,
      timestamp: Date.now()
    });

    return url;
  }

  /**
   * Precarga iconos comunes al iniciar la aplicación
   */
  preloadCommonIcons(): void {
    console.log('🔄 Precargando iconos comunes de Waze...');

    this.COMMON_ICONS.forEach(iconType => {
      const url = this.getIconUrlSync(iconType);

      // Crear imagen para precargar
      const img = new Image();
      img.onload = () => {
        // Actualizar caché con el elemento cargado
        const key = this.getCacheKey(iconType);
        const cached = this.cache.get(key);
        if (cached) {
          cached.element = img;
        }
      };
      img.onerror = () => {
        console.warn(`⚠️ No se pudo precargar icono: ${iconType}`);
      };
      img.src = url;
    });

    console.log('✅ Iconos comunes precargados');
  }

  /**
   * Verifica si un icono en caché ha expirado
   */
  private isExpired(cached: CachedIcon): boolean {
    return Date.now() - cached.timestamp > this.CACHE_DURATION;
  }

  /**
   * Genera una clave única para el caché
   */
  private getCacheKey(type: string, subtype?: string): string {
    return subtype ? `${type}_${subtype}` : type;
  }

  /**
   * Limpia el caché expirado
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia singleton del servicio
const iconCacheService = new IconCacheService();

// Instancia legacy para compatibilidad
const iconCache = iconCacheService;

// Exportaciones
export { iconCacheService, iconCache };
export default iconCacheService;
