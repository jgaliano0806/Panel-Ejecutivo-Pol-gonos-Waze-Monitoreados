---
description: websocket-emit Emitir update via WebSocket a clientes
---

typescriptimport websocketService from './websocketService';

// Emitir a room específica
websocketService.emitToRoom(
  `polygon:${polygonId}`,
  'waze:update',
  { alerts, jams }
);

// Emitir a todos
websocketService.broadcast('system:alert', {
  message: 'Maintenance in 5 min'
});
Events:

waze:update - Nuevos alerts/jams
weather:update - Clima actualizado
risk:update - Nuevo score
polygon:created - Polígono creado
system:alert - Alerta sistema
