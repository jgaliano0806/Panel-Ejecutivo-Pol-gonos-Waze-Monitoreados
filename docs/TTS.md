# 🔊 Text-to-Speech (TTS)

Documentación del sistema de lectura en voz alta para notificaciones en sala de control.

---

## Modelo utilizado

El proyecto utiliza **Edge TTS** (Microsoft), voces neuronales de alta calidad, **100% gratuitas** para el uso actual. No requiere API key ni cuenta de Azure.

- **Backend**: librería `msedge-tts` en Node.js.
- **Frontend**: llama al endpoint `/api/tts/speak` y reproduce el audio en el navegador.
- **Fallback**: si el backend no está disponible, se usa la Web Speech API del navegador.

---

## Voces disponibles

| ID | Nombre | Descripción |
|----|--------|-------------|
| `es-AR-ElenaNeural` | Elena | Femenina argentina (recomendada) |
| `es-AR-TomasNeural` | Tomás | Masculina argentina |
| `es-MX-DaliaNeural` | Dalia | Femenina mexicana |
| `es-MX-JorgeNeural` | Jorge | Masculina mexicana |

La configuración se guarda en `localStorage` (`tts_config`) y se puede cambiar en **Admin → Configuración del sistema → Voz (TTS)**.

---

## Cola de reproducción

El TTS se procesa con una **cola local** en el frontend para evitar solapamientos:

1. Cada llamada a `speakNotification(title, message)` añade un mensaje a la cola.
2. Un único reproductor procesa la cola en orden (backend TTS o fallback Web Speech).
3. Las notificaciones nuevas llegan por WebSocket; el TTS se ejecuta **solo en el cliente** (`websocket.ts`), una vez por notificación.

### Consultar lecturas pendientes

Para saber cuántas lecturas quedan por reproducir en la cola local:

```ts
import { getTTSQueueStatus } from "@/lib/tts-service";

const { pendingCount, isPlaying, totalPending } = getTTSQueueStatus();
// pendingCount: mensajes en cola esperando
// isPlaying: true si está reproduciendo uno ahora
// totalPending: pendientes en cola + 1 si está reproduciendo
```

**Nota**: Esto refleja solo la **cola del frontend**. Edge TTS no expone una API de "lecturas restantes" o cuota; no hay límite oficial consultable por modelo. Si en el futuro se añade otro proveedor con cuota (ej. Azure Speech), habría que implementar un contador en el backend.

---

## Endpoints TTS (backend)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/tts/speak` | Genera audio. Body: `{ text, voice?, rate?, pitch? }`. Respuesta: audio MP3 (binary). |
| GET | `/api/tts/voices` | Lista voces disponibles. |
| GET | `/api/tts/test` | Prueba: devuelve un audio de demostración. |

---

## Flujo de una notificación con voz

### Alerta estándar (`notification:new`)

1. **Backend**: Tras el ciclo de polling Waze, emite `notification:new` por Socket.IO.
2. **Frontend** (`websocket.ts`): Recibe el evento, traduce el mensaje, añade la notificación al store.
3. Si el incidente **no** es de zona peligrosa (ya anunciado por `red_zone_critical_alert`), aplica filtros TTS y reproduce beep + `speakNotification()`.
4. **TTS** (`tts-service.ts`): Encola el mensaje, pide audio a `/api/tts/speak` y reproduce. Fallback: Web Speech API.

### Alerta zona peligrosa (`red_zone_critical_alert`)

Cuando un incidente cae dentro de una zona peligrosa RAC:

1. El backend emite `red_zone_critical_alert` con datos del incidente y la zona.
2. El frontend reproduce **sirena + TTS prioritario** inmediatamente.
3. El UUID del incidente se registra para **no repetir** la lectura cuando llegue el mismo evento vía `notification:new`.
4. Los filtros TTS de `notification:new` omiten incidentes ya anunciados por zona roja.

### Evento `play_audio_alert`

El servidor emite `play_audio_alert` al detectar alertas críticas (severity ≥ 3), pero el **sonido real se delega** a `notification:new` y `red_zone_critical_alert` para evitar falsas alertas. El frontend solo registra el evento en logs.

Los filtros de qué tipos/subtipos activan TTS están en `config/notificationFilters.ts` (`TTS_SNACKBAR_ALLOWED_INCIDENTS`).

---

## Detener reproducción

```ts
import { stopSpeaking } from "@/lib/tts-service";

stopSpeaking(); // Vacía la cola y detiene el audio actual.
```

---

## Resumen

| Concepto | Dónde |
|----------|--------|
| Cola local (pendientes) | `getTTSQueueStatus()` en `lib/tts-service.ts` |
| Reproducir notificación | `speakNotification(title, message)` en `lib/tts-utils.ts` |
| Configuración de voz | Admin → Voz (TTS) y `lib/tts-service.ts` (`configureTTS`, `getTTSConfig`) |
| Origen del TTS para alertas | Un solo lugar: `services/websocket.ts` (evita doble lectura) |
