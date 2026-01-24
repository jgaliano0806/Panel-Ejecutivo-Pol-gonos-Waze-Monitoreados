/**
 * Hook para obtener traducciones de incidentes desde la base de datos
 * con fallback a traducciones estáticas
 */
import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

export interface CatalogType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  subtypes: CatalogSubtype[] | null;
}

export interface CatalogSubtype {
  id: number;
  code: string;
  name: string;
  description: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_active: boolean;
}

// Cache global para traducciones (evita múltiples fetches)
let translationsCache: Map<string, string> = new Map();
let cacheLoaded = false;

/**
 * Hook para cargar todas las traducciones del catálogo
 */
export function useCatalogTranslations() {
  const query = useQuery({
    queryKey: ["catalog-translations"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/catalogs/types`);
      if (!response.ok) {
        throw new Error("Error cargando catálogo de traducciones");
      }
      const result = await response.json();
      const types: CatalogType[] = result.data || [];

      // Construir mapa de traducciones
      const translations = new Map<string, string>();

      for (const type of types) {
        // Agregar traducción del tipo
        translations.set(type.code.toUpperCase(), type.name);
        translations.set(type.code.toLowerCase(), type.name);

        // Agregar traducciones de subtipos
        if (type.subtypes && Array.isArray(type.subtypes)) {
          for (const subtype of type.subtypes) {
            if (subtype.code) {
              translations.set(subtype.code.toUpperCase(), subtype.name);
              translations.set(subtype.code.toLowerCase(), subtype.name);
            }
          }
        }
      }

      // Actualizar cache global
      translationsCache = translations;
      cacheLoaded = true;

      return { types, translations };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  return {
    types: query.data?.types || [],
    translations: query.data?.translations || new Map(),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Obtiene traducción desde el cache (para uso fuera de componentes React)
 * Primero intenta desde BD, luego fallback a estáticas
 */
export function getTranslationFromCache(code: string): string | null {
  if (!cacheLoaded || !translationsCache.size) {
    return null; // No hay cache, usar fallback
  }

  const upperCode = code.toUpperCase();
  return translationsCache.get(upperCode) || null;
}

/**
 * Precarga el cache de traducciones (útil en inicialización de app)
 */
export async function preloadTranslationsCache(): Promise<void> {
  if (cacheLoaded) return;

  try {
    const response = await fetch(`${API_URL}/api/catalogs/types`);
    if (!response.ok) return;

    const result = await response.json();
    const types: CatalogType[] = result.data || [];

    for (const type of types) {
      translationsCache.set(type.code.toUpperCase(), type.name);
      translationsCache.set(type.code.toLowerCase(), type.name);

      if (type.subtypes && Array.isArray(type.subtypes)) {
        for (const subtype of type.subtypes) {
          if (subtype.code) {
            translationsCache.set(subtype.code.toUpperCase(), subtype.name);
            translationsCache.set(subtype.code.toLowerCase(), subtype.name);
          }
        }
      }
    }

    cacheLoaded = true;
    console.log(
      `✅ Cache de traducciones cargado: ${translationsCache.size} entradas`,
    );
  } catch (error) {
    console.warn("⚠️ No se pudo precargar cache de traducciones:", error);
  }
}

/**
 * Limpia el cache (útil después de sincronización)
 */
export function clearTranslationsCache(): void {
  translationsCache.clear();
  cacheLoaded = false;
}
