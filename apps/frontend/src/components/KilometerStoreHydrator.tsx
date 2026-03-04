/**
 * Componente invisible que hidrata el useKilometerStore
 * con datos de la API para uso en servicios no-React (websocket, TTS)
 */
import { useEffect } from "react";
import { useKilometers } from "../hooks/useKilometers";
import { useKilometerStore } from "../stores/useKilometerStore";

export function KilometerStoreHydrator() {
  const { data: markers } = useKilometers(true);

  useEffect(() => {
    if (markers && markers.length > 0) {
      useKilometerStore.getState().setMarkers(
        markers.map((m) => ({
          name: m.name,
          latitude: m.latitude,
          longitude: m.longitude,
        })),
      );
    }
  }, [markers]);

  return null;
}
