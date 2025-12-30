---
description: tanstack-query Data fetching con TanStack Query
---

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query
export function useWazeAlerts(polygonId: string) {
  return useQuery({
    queryKey: ['waze', 'alerts', polygonId],
    queryFn: async () => {
      const res = await fetch(`/api/waze/alerts/${polygonId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 60000,       // 1 min
    refetchInterval: 60000, // Auto-refresh
  });
}

// Mutation
export function useCreatePolygon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (polygon: NewPolygon) => {
      const res = await fetch('/api/polygons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(polygon),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polygons'] });
    },
  });
}
Opciones:

staleTime: tiempo antes de refetch
refetchInterval: polling automático
enabled: conditional fetching
retry: reintentos en error
