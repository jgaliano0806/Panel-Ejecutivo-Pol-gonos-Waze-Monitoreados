import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket, subscribeToPolygon, unsubscribeFromPolygon } from '@/services/websocket';

/**
 * Hook para recibir actualizaciones de Waze en tiempo real via WebSocket
 * Actualiza automáticamente el cache de TanStack Query
 */
export function useWazeRealtime(polygonId: string | null) {
    const queryClient = useQueryClient();

    const handleWazeUpdate = useCallback((data: any) => {
        if (!data || data.polygonId !== polygonId) return;

        console.log('📥 Received waze:update for', polygonId, data);

        // Actualizar cache de alerts
        queryClient.setQueryData(['waze', 'alerts', polygonId], data.alerts);

        // Actualizar cache de jams
        queryClient.setQueryData(['waze', 'jams', polygonId], data.jams);

        // Invalidar queries relacionadas para refetch
        queryClient.invalidateQueries({ queryKey: ['incidents', polygonId] });
    }, [polygonId, queryClient]);

    const handleWeatherUpdate = useCallback((data: any) => {
        if (!data || data.polygonId !== polygonId) return;

        console.log('🌤️ Received weather:update for', polygonId, data);

        // Actualizar cache de clima
        queryClient.setQueryData(['weather', polygonId], data.weather);

        // Invalidar si es condición peligrosa para alertar
        if (data.isDangerous) {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
    }, [polygonId, queryClient]);

    const handleRiskUpdate = useCallback((data: any) => {
        if (!data || data.polygonId !== polygonId) return;

        console.log('⚠️ Received risk:update for', polygonId, data);

        // Actualizar cache de riesgo
        queryClient.setQueryData(['risk', polygonId], data.score);
    }, [polygonId, queryClient]);

    useEffect(() => {
        if (!polygonId) return;

        // Suscribirse al polígono
        subscribeToPolygon(polygonId);

        // Registrar event handlers
        socket.on('waze:update', handleWazeUpdate);
        socket.on('weather:update', handleWeatherUpdate);
        socket.on('risk:update', handleRiskUpdate);

        // Cleanup al desmontar o cambiar de polígono
        return () => {
            socket.off('waze:update', handleWazeUpdate);
            socket.off('weather:update', handleWeatherUpdate);
            socket.off('risk:update', handleRiskUpdate);
            unsubscribeFromPolygon(polygonId);
        };
    }, [polygonId, handleWazeUpdate, handleWeatherUpdate, handleRiskUpdate]);
}

/**
 * Hook para recibir actualizaciones globales (todos los polígonos)
 */
export function useGlobalRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleGlobalUpdate = (data: any) => {
            console.log('🌍 Received global update:', data);

            // Invalidar todas las queries de waze para refetch
            queryClient.invalidateQueries({ queryKey: ['waze'] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
        };

        socket.emit('subscribe:global');
        socket.on('global:update', handleGlobalUpdate);

        return () => {
            socket.off('global:update', handleGlobalUpdate);
        };
    }, [queryClient]);
}

/**
 * Hook para estado de conexión WebSocket
 */
export function useWebSocketStatus() {
    const isConnected = socket.connected;

    return {
        isConnected,
        socketId: socket.id,
    };
}

export default useWazeRealtime;
