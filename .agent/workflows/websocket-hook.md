---
description: websocket-hook Hook para WebSocket real-time
---

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '@/services/websocket';

export function useWazeRealtime(polygonId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.emit('subscribe:polygon', polygonId);

    const handleUpdate = (data: WazeUpdate) => {
      queryClient.setQueryData(['waze', 'alerts', polygonId], data.alerts);
      queryClient.setQueryData(['waze', 'jams', polygonId], data.jams);
    };

    socket.on('waze:update', handleUpdate);

    return () => {
      socket.off('waze:update', handleUpdate);
      socket.emit('unsubscribe:polygon', polygonId);
    };
  }, [polygonId, queryClient]);
}

// Uso en componente
function MapView() {
  const { data: alerts } = useQuery(['waze', 'alerts', polygonId]);
  useWazeRealtime(polygonId); // Auto-update via WebSocket

  return <WazeAlertsLayer alerts={alerts} />;
}
Importante:

Cleanup en return de useEffect
Invalidar/update cache de TanStack Query
NO fetch inicial en el hook
