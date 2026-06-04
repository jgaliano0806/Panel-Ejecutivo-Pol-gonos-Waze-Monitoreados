import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export interface RoadAccident {
  id: string;
  incident_id?: string;
  polygon_id?: string;
  waze_data: any;
  weather_data: any;
  type?: string;
  subtype?: string;
  severity?: number;
  street?: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  operator_notes?: string;
  accident_at: string;
  created_at: string;
  media: AccidentMedia[];
}

/**
 * Normaliza y valida un accidente desde el API
 * Convierte strings a números donde sea necesario y valida datos críticos
 */
function normalizeAccident(data: any): RoadAccident {
  // Validar que tenemos un ID
  if (!data.id) {
    throw new Error("Accidente sin ID válido");
  }

  // Normalizar coordenadas (pueden venir como string desde PostgreSQL DECIMAL)
  const lat = Number(data.location_lat);
  const lng = Number(data.location_lng);

  // Validar coordenadas
  if (isNaN(lat) || isNaN(lng)) {
    console.warn(
      `⚠️ Coordenadas inválidas para accidente ${data.id}: lat=${data.location_lat}, lng=${data.location_lng}`,
    );
  }

  // Validar rango de coordenadas (Argentina aproximadamente: -55 a -21 lat, -73 a -53 lng)
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn(
      `⚠️ Coordenadas fuera de rango válido para accidente ${data.id}: lat=${lat}, lng=${lng}`,
    );
  }

  // Normalizar severidad
  const severity =
    data.severity !== null && data.severity !== undefined
      ? Number(data.severity)
      : undefined;

  // Validar severidad (debe estar entre 1 y 5)
  if (severity !== undefined && (severity < 1 || severity > 5)) {
    console.warn(
      `⚠️ Severidad fuera de rango para accidente ${data.id}: ${severity}`,
    );
  }

  // Normalizar fechas (asegurar que sean strings ISO válidos)
  const accidentAt = data.accident_at
    ? typeof data.accident_at === "string"
      ? data.accident_at
      : new Date(data.accident_at).toISOString()
    : new Date().toISOString();

  const createdAt = data.created_at
    ? typeof data.created_at === "string"
      ? data.created_at
      : new Date(data.created_at).toISOString()
    : new Date().toISOString();

  // Normalizar media (asegurar que sea un array)
  const media: AccidentMedia[] = Array.isArray(data.media)
    ? data.media.map((m: any) => ({
        id: m.id || "",
        accident_id: m.accident_id || data.id,
        file_path: m.file_path || "",
        file_type: m.file_type || "image",
        original_name: m.original_name,
        file_size_bytes: m.file_size_bytes
          ? Number(m.file_size_bytes)
          : undefined,
        created_at: m.created_at || createdAt,
      }))
    : [];

  return {
    id: String(data.id),
    incident_id: data.incident_id ? String(data.incident_id) : undefined,
    polygon_id: data.polygon_id
      ? String(data.polygon_id)
      : data.waze_data?.polygon_id,
    waze_data: data.waze_data || {},
    weather_data: data.weather_data || {},
    type: data.type ? String(data.type) : undefined,
    subtype: data.subtype ? String(data.subtype) : undefined,
    severity: severity,
    street: data.street ? String(data.street) : undefined,
    location_lat: lat,
    location_lng: lng,
    description:
      data.description || data.waze_data?.reportDescription || undefined,
    operator_notes: data.operator_notes
      ? String(data.operator_notes)
      : undefined,
    accident_at: accidentAt,
    created_at: createdAt,
    media: media,
  };
}

export interface AccidentMedia {
  id: string;
  accident_id: string;
  file_path: string;
  file_type: "image" | "video" | "document";
  original_name?: string;
  file_size_bytes?: number;
  created_at: string;
}

export const useRoadAccidents = (
  filters: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {},
) => {
  return useQuery({
    queryKey: ["road-accidents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());

      // Asegurar que la URL base no duplique /api
      const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;
      const response = await fetch(`${baseUrl}/accidents?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch road accidents: ${response.status} ${errorText}`,
        );
      }

      const raw = await response.json();

      // API retorna { data: [], total: number }
      const data = Array.isArray(raw) ? raw : raw?.data ?? [];
      const total = typeof raw?.total === "number" ? raw.total : data.length;

      if (!Array.isArray(data)) {
        console.error("⚠️ API returned invalid data:", raw);
        return { data: [], total: 0 };
      }

      const normalized = data.map((accident: any) => {
        try {
          return normalizeAccident(accident);
        } catch (error) {
          console.error(`❌ Error normalizando accidente:`, error, accident);
          // Retornar un objeto válido con valores por defecto
          return {
            id: String(accident.id || "unknown"),
            incident_id: accident.incident_id,
            waze_data: accident.waze_data || {},
            weather_data: accident.weather_data || {},
            type: accident.type,
            subtype: accident.subtype,
            severity: accident.severity ? Number(accident.severity) : undefined,
            street: accident.street,
            location_lat: Number(accident.location_lat || 0),
            location_lng: Number(accident.location_lng || 0),
            operator_notes: accident.operator_notes,
            accident_at: accident.accident_at || new Date().toISOString(),
            created_at: accident.created_at || new Date().toISOString(),
            media: Array.isArray(accident.media) ? accident.media : [],
          } as RoadAccident;
        }
      });

      return { data: normalized, total };
    },
  });
};

export const useRoadAccident = (id: string | null) => {
  return useQuery({
    queryKey: ["road-accident", id],
    queryFn: async () => {
      if (!id) return null;

      const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;
      const response = await fetch(`${baseUrl}/accidents/${id}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch accident detail: ${response.status} ${errorText}`,
        );
      }

      const data = await response.json();

      // Normalizar y validar el accidente
      try {
        return normalizeAccident(data);
      } catch (error) {
        console.error(`❌ Error normalizando accidente ${id}:`, error, data);
        throw error;
      }
    },
    enabled: !!id,
  });
};

export const useCreateAccident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<RoadAccident>) => {
      // Validar datos antes de enviar
      if (!data.location_lat || !data.location_lng) {
        throw new Error("Las coordenadas son requeridas");
      }

      const lat = Number(data.location_lat);
      const lng = Number(data.location_lng);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error("Las coordenadas deben ser números válidos");
      }

      // Preparar datos para envío
      const payload = {
        ...data,
        location_lat: lat,
        location_lng: lng,
        severity:
          data.severity !== undefined ? Number(data.severity) : undefined,
      };

      const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;

      const response = await fetch(`${baseUrl}/accidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Error al crear accidente (${response.status})`;
        let errorData: any = null;

        try {
          const errorText = await response.text();
          try {
            errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // Si no es JSON, usar el texto como está
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          // Si falla todo, usar mensaje genérico
        }

        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.data = errorData;

        // Si es un 409 (conflicto), es porque ya existe
        if (response.status === 409 && errorData?.accident) {
          error.isDuplicate = true;
          error.existingAccident = errorData.accident;
        }

        throw error;
      }

      const result = await response.json();

      // Normalizar la respuesta
      try {
        return normalizeAccident(result);
      } catch (error) {
        console.error("❌ Error normalizando accidente creado:", error, result);
        // Retornar datos sin normalizar si falla (mejor que nada)
        return result as RoadAccident;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["road-accidents"] });
    },
  });
};

export const useRefreshAccidentWeather = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      force = true,
    }: {
      id: string;
      force?: boolean;
    }) => {
      const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;
      const response = await fetch(
        `${baseUrl}/accidents/${id}/weather?force=${force ? "true" : "false"}`,
        { method: "PATCH" },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            error.error ||
            "No se pudo actualizar el clima del siniestro",
        );
      }
      return normalizeAccident(await response.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["road-accident", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["road-accidents"] });
    },
  });
};

export const useUploadAccidentMedia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files }: { id: string; files: FileList }) => {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;
      const response = await fetch(`${baseUrl}/accidents/${id}/media`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload media");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["road-accident", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["road-accidents"] });
    },
  });
};
