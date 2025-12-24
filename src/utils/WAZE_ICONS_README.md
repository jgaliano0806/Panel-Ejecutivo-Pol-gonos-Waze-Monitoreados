# Iconos y Traducciones de Waze

Este documento describe el sistema de iconos y traducciones implementado basado en los iconos oficiales de la aplicación Waze.

## Categorías de Eventos

### 1. Informar sobre un peligro
| Icono | Nombre Original | Traducción |
|-------|-----------------|------------|
| ⚠️ | Peligro | Peligro |
| 🏗️ | Obras | Obras |
| 🚗 | Auto en orilla | Auto en orilla |
| 🚦 | Semáforo averiado | Semáforo averiado |
| 🕳️ | Bache | Bache |
| 📦 | Objeto | Objeto en calzada |

### 2. Informar sobre control policial
| Icono | Nombre Original | Traducción |
|-------|-----------------|------------|
| 👮 | Policía | Policía visible |
| 📹 | Radar móvil | Radar móvil |
| 👤 | Oculto | Policía oculto |
| 📱 | Al otro lado | Policía al otro lado |

### 3. Menú principal (¿Qué ves?)
| Icono | Nombre Original | Traducción |
|-------|-----------------|------------|
| 🚗🚗 | Tráfico | Congestión |
| 👮 | Policía | Control policial |
| 💥 | Accidente | Accidente |
| ⚠️ | Peligro | Peligro |
| 🚧 | Cierre | Cierre de vía |
| 🚧 | Carril bloqueado | Carril bloqueado |
| ❌ | Error en el mapa | Error en el mapa |
| 🌧️ | Mal tiempo | Mal tiempo |
| ⛽ | Precios de combustible | Precios de combustible |
| 🛟 | Asistencia en la ruta | Asistencia en la ruta |
| 💬 | Chat del mapa | Chat del mapa |
| 📍 | Lugar | Lugar |

### 4. Informar sobre carril bloqueado
| Icono | Nombre Original | Traducción |
|-------|-----------------|------------|
| 🔶 | Carril bloqueado | Carril bloqueado |
| ⬅️ | Carril izquierdo | Carril izquierdo bloqueado |
| ➡️ | Carril derecho | Carril derecho bloqueado |
| ⬆️ | Carril central | Carril central bloqueado |

### 5. Informar sobre accidente
| Icono | Nombre Original | Traducción |
|-------|-----------------|------------|
| 💥 | Accidente | Accidente |
| 💥💥 | Colisión múltiple | Colisión múltiple |
| 📱 | Al otro lado | Accidente al otro lado |

### 6. Informar sobre mal tiempo
| Icono | Nombre Original | Traducción |
|-------|-----------------|------------|
| ⛈️ | Mal tiempo | Mal tiempo |
| 🌊 | Camino resbaladizo | Camino resbaladizo |
| 🌊 | Inundación | Inundación |
| ❄️ | Nieve en el camino | Nieve en el camino |
| 🌫️ | Niebla | Niebla |
| 🧊 | Camino con hielo | Camino con hielo |

## Archivos del Sistema

- `src/utils/wazeTranslations.ts` - Traducciones de tipos y subtipos
- `src/utils/wazeIcons.ts` - SVGs inline y mapeo de iconos
- `src/components/WazeIcon.tsx` - Componentes React para iconos
- `src/utils/wazeIndex.ts` - Exportaciones centralizadas

## Uso

```tsx
import {
    getIncidentDescription,
    getIncidentEmoji,
    WazeIcon,
    WazeIconBadge
} from '../utils/wazeIndex';

// Obtener descripción traducida
const description = getIncidentDescription('hazard', 'HAZARD_ON_SHOULDER_CAR_STOPPED');
// Resultado: "Auto en orilla"

// Obtener emoji
const emoji = getIncidentEmoji('accident', 'ACCIDENT_MAJOR');
// Resultado: "💥"

// Usar componente de icono
<WazeIcon type="accident" subtype="ACCIDENT_MAJOR" size="lg" />

// Usar badge con contador
<WazeIconBadge
    type="hazard"
    label="Peligros"
    count={5}
    onClick={() => console.log('clicked')}
/>
```

## Mapeo de Subtipos RAW

Los subtipos que llegan del feed de Waze en formato RAW (ej: `HAZARD_ON_SHOULDER_CAR_STOPPED`) se traducen automáticamente a español usando el diccionario `SUBTYPE_DIRECT_TRANSLATIONS`.

Si un subtipo no existe en el diccionario, se convierte automáticamente a formato legible (ej: "Hazard On Shoulder Car Stopped").


