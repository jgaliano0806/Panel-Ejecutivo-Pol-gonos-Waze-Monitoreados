---
description: react-hook Custom hook para lógica reutilizable
---

import { useState, useEffect } from 'react';

interface UseWazeAlertsOptions {
  polygonId: string;
  autoRefresh?: boolean;
}

export function useWazeAlerts({ polygonId, autoRefresh = true }: UseWazeAlertsOptions) {
  const [alerts, setAlerts] = useState<WazeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/waze/alerts/${polygonId}`);
        const data = await response.json();
        setAlerts(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    if (autoRefresh) {
      interval = setInterval(fetchAlerts, 60000); // 1 min
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polygonId, autoRefresh]);

  return { alerts, loading, error };
}
Tipos de hooks:

Data fetching → usar TanStack Query
Local state → useState
Side effects → useEffect
WebSocket → custom hook con cleanup
