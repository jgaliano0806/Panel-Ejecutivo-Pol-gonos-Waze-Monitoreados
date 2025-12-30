import { io, Socket } from 'socket.io-client';

/**
 * WebSocket client singleton para conexión con el backend
 */

const SOCKET_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Crear instancia del socket
export const socket: Socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
});

// Event handlers para debugging
socket.on('connect', () => {
    console.log('🟢 WebSocket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('🔴 WebSocket disconnected:', reason);
});

socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 WebSocket reconnection attempt:', attemptNumber);
});

/**
 * Suscribirse a updates de un polígono específico
 */
export function subscribeToPolygon(polygonId: string): void {
    socket.emit('subscribe:polygon', polygonId);
    console.log(`📍 Subscribed to polygon: ${polygonId}`);
}

/**
 * Desuscribirse de un polígono
 */
export function unsubscribeFromPolygon(polygonId: string): void {
    socket.emit('unsubscribe:polygon', polygonId);
    console.log(`📍 Unsubscribed from polygon: ${polygonId}`);
}

/**
 * Suscribirse a updates globales
 */
export function subscribeToGlobal(): void {
    socket.emit('subscribe:global');
    console.log('🌍 Subscribed to global updates');
}

/**
 * Estado de conexión
 */
export function isConnected(): boolean {
    return socket.connected;
}

/**
 * Reconectar manualmente
 */
export function reconnect(): void {
    if (!socket.connected) {
        socket.connect();
    }
}

/**
 * Desconectar
 */
export function disconnect(): void {
    socket.disconnect();
}

export default socket;
