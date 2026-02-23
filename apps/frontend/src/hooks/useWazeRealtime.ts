import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  socket,
  subscribeToPolygon,
  unsubscribeFromPolygon,
} from "@/services/websocket";

/**
 * Hook para recibir actualizaciones de un polígono específico vía WebSocket.
 * Actualiza el cache de TanStack Query directamente con los datos recibidos.
 */
export function useWazeRealtime(polygonId: string | null) {
  const queryClient = useQueryClient();

  const handleWazeUpdate = useCallback(
    (data: any) => {
      if (!data || data.polygonId !== polygonId) return;
      queryClient.setQueryData(["waze", "alerts", polygonId], data.alerts);
      queryClient.setQueryData(["waze", "jams", polygonId], data.jams);
      queryClient.invalidateQueries({ queryKey: ["incidents", polygonId] });
    },
    [polygonId, queryClient],
  );

  const handleRiskUpdate = useCallback(
    (data: any) => {
      if (!data || data.polygonId !== polygonId) return;
      queryClient.setQueryData(["risk", polygonId], data.score);
    },
    [polygonId, queryClient],
  );

  useEffect(() => {
    if (!polygonId) return;

    subscribeToPolygon(polygonId);
    socket.on("waze:update", handleWazeUpdate);
    socket.on("risk:update", handleRiskUpdate);

    return () => {
      socket.off("waze:update", handleWazeUpdate);
      socket.off("risk:update", handleRiskUpdate);
      unsubscribeFromPolygon(polygonId);
    };
  }, [polygonId, handleWazeUpdate, handleRiskUpdate]);
}

/**
 * Hook GLOBAL que invalida TODAS las queries de datos Waze cuando el backend
 * termina un ciclo de ingesta y emite `waze:data_updated`.
 *
 * Reemplaza el antiguo sistema de polling (`refetchInterval`) con un mecanismo
 * push-based: el servidor es la fuente única de verdad y notifica a todos los
 * paneles en el mismo instante.
 *
 * Internamente escucha un CustomEvent en window (despachado desde websocket.ts)
 * para evitar importar socket directamente en un hook de React.
 */
export function useGlobalRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const ts = detail?.timestamp ?? new Date().toISOString();

      queryClient.invalidateQueries({ queryKey: ["polygons"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents-stats"] });
      queryClient.invalidateQueries({ queryKey: ["incidents-types"] });
      queryClient.invalidateQueries({ queryKey: ["jams"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-stats"] });
      queryClient.invalidateQueries({ queryKey: ["traffic-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["tvt-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["waze"] });
      queryClient.invalidateQueries({ queryKey: ["risk"] });

      console.log(`📡 Caches invalidadas vía WebSocket (${ts})`);
    };

    window.addEventListener("waze:data_updated", handler);
    return () => window.removeEventListener("waze:data_updated", handler);
  }, [queryClient]);
}

/**
 * Hook para exponer el estado de conexión del WebSocket a la UI
 */
export function useWebSocketStatus() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { isConnected: connected, socketId: socket.id };
}

export default useWazeRealtime;
