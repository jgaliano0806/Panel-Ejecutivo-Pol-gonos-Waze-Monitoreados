import { useState, useEffect } from 'react';

/**
 * Hook para calcular tiempo relativo desde un timestamp
 * Se actualiza cada minuto para mantener la precisión
 */
export function useRelativeTime(timestamp: string | Date): number {
    const [minutesAgo, setMinutesAgo] = useState(() => {
        const now = Date.now();
        const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
        return Math.round((now - time) / 60000);
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
            setMinutesAgo(Math.round((now - time) / 60000));
        }, 60000); // Actualizar cada minuto

        return () => clearInterval(interval);
    }, [timestamp]);

    return minutesAgo;
}

