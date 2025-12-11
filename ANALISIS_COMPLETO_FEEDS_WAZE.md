# 🎓 Análisis Completo: Feeds de Waze - Guía Experta

## 📚 Documento de Referencia y Contexto

**Fecha de análisis:** Diciembre 2024  
**Versión:** 2.0.0 (Actualizada con investigación profunda)  
**Propósito:** Documento de contexto experto sobre el funcionamiento completo de los feeds de Waze

---

## 📋 Índice

1. [Introducción a Waze for Cities](#introducción-a-waze-for-cities)
2. [Arquitectura de los Feeds](#arquitectura-de-los-feeds)
3. [Tipos de Datos](#tipos-de-datos)
4. [Estructura JSON Detallada](#estructura-json-detallada)
5. [Scores y Métricas](#scores-y-métricas)
6. [Clasificaciones y Niveles](#clasificaciones-y-niveles)
7. [Feeds Especializados](#feeds-especializados)
8. [Límites y Restricciones](#límites-y-restricciones)
9. [Mejores Prácticas](#mejores-prácticas)
10. [Casos de Uso Avanzados](#casos-de-uso-avanzados)

---

## 🌐 Introducción a Waze for Cities

### **Connected Citizens Program (CCP)**

Waze for Cities es el programa de colaboración bidireccional entre Waze y entidades gubernamentales/municipales. Anteriormente conocido como "Connected Citizens Program (CCP)".

**Características principales:**
- ✅ **Intercambio bidireccional de datos**
- ✅ **Actualización cada 2 minutos**
- ✅ **Formatos: JSON o XML (GeoRSS)**
- ✅ **Definición de polígonos geográficos personalizados**
- ✅ **Acceso a múltiples tipos de datos**

**Beneficios para partners:**
- Acceso a datos de tráfico en tiempo real
- Capacidad de publicar cierres de calles y construcciones
- Análisis de patrones de tráfico históricos
- Integración con sistemas de gestión de tráfico existentes

---

## 🏗️ Arquitectura de los Feeds

### **1. Sistema de Configuración**

```
┌─────────────────────────────────────────────────────────────┐
│                    PARTNER HUB (Configuración)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Definición de Polígonos                           │  │
│  │    • Dibujar en mapa o subir WKT/GeoJSON             │  │
│  │    • Múltiples polígonos permitidos                  │  │
│  │                                                       │  │
│  │ 2. Selección de Tipos de Datos                       │  │
│  │    ☑ Alerts (Incidentes reportados)                  │  │
│  │    ☑ Jams (Atascos detectados)                       │  │
│  │    ☑ Irregularities (Eventos mayores)                │  │
│  │    ☑ Traffic (Datos de flujo)                        │  │
│  │                                                       │  │
│  │ 3. Formato de Salida                                 │  │
│  │    ◉ JSON (Recomendado)                              │  │
│  │    ○ XML (GeoRSS)                                    │  │
│  │                                                       │  │
│  │ 4. Generación de URL del Feed                        │  │
│  │    https://www.waze.com/row-partnerhub-api/          │  │
│  │    partners/{partner_id}/waze-feeds/{feed_id}        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                WAZE BACKEND (Procesamiento)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Recolección de Datos:                                │  │
│  │ • GPS de usuarios activos                            │  │
│  │ • Reportes de usuarios (alerts)                      │  │
│  │ • Sensores de velocidad                              │  │
│  │ • Datos históricos                                   │  │
│  │                                                       │  │
│  │ Procesamiento:                                        │  │
│  │ • Filtrado por polígono                              │  │
│  │ • Cálculo de jams (velocidad actual vs histórica)    │  │
│  │ • Asignación de scores (confidence, reliability)     │  │
│  │ • Detección de irregularidades                       │  │
│  │ • Límite de 5000 eventos por feed                    │  │
│  │                                                       │  │
│  │ Actualización: Cada 2 minutos                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   FEED ENDPOINT (Salida)                    │
│  • URL única por partner/polígono                           │
│  • Formato JSON o XML                                       │
│  • HTTPS requerido                                          │
│  • Sin autenticación (URL es el secreto)                    │
└─────────────────────────────────────────────────────────────┘
```

### **2. Flujo de Actualización**

```
t=0s    ┌────────────┐
        │ Usuario A  │ Reporta accidente
        │ Usuario B  │ Pasa por zona lenta
        │ Usuario C  │ Confirma accidente
        └────────────┘
                ↓
t=5s    ┌────────────┐
        │ Waze       │ Procesa datos
        │ Backend    │ Calcula scores
        └────────────┘
                ↓
t=120s  ┌────────────┐
        │ Feed       │ Actualización completa
        │ Update     │ Todos los eventos incluidos
        └────────────┘
                ↓
        ┌────────────┐
        │ Partner    │ Fetch del feed
        │ Sistema    │ Procesa nueva data
        └────────────┘
```

**Importante:** 
- ⏱️ Actualizaciones cada **2 minutos exactos**
- 🔄 Los eventos se mantienen activos mientras sean relevantes
- ❌ Eventos antiguos se eliminan automáticamente
- 📊 Límite de **5000 eventos por feed** (combinados)

---

## 📦 Tipos de Datos

### **1. ALERTS (Alertas/Incidentes)**

Reportes generados por usuarios de Waze sobre eventos en la vía.

#### **Tipos de Alerts:**

**a) ACCIDENT (Accidentes)**
```
Subtipos:
• ACCIDENT_MAJOR - Accidente grave
• ACCIDENT_MINOR - Accidente menor
```

**b) HAZARD (Peligros)**
```
Subtipos:
• HAZARD_ON_ROAD - Peligro en la vía
• HAZARD_ON_ROAD_OBJECT - Objeto en la vía
• HAZARD_ON_ROAD_POT_HOLE - Bache en la vía
• HAZARD_ON_ROAD_ROAD_KILL - Animal muerto
• HAZARD_ON_SHOULDER - Peligro en el hombro
• HAZARD_ON_SHOULDER_CAR_STOPPED - Vehículo detenido
• HAZARD_ON_SHOULDER_ANIMALS - Animales en hombro
• HAZARD_ON_SHOULDER_MISSING_SIGN - Señal faltante
• HAZARD_WEATHER - Peligro climático
• HAZARD_WEATHER_FOG - Niebla
• HAZARD_WEATHER_HAIL - Granizo
• HAZARD_WEATHER_HEAVY_RAIN - Lluvia fuerte
• HAZARD_WEATHER_HEAVY_SNOW - Nieve fuerte
• HAZARD_WEATHER_FLOOD - Inundación
• HAZARD_WEATHER_MONSOON - Monzón
• HAZARD_WEATHER_TORNADO - Tornado
• HAZARD_WEATHER_HEAT_WAVE - Ola de calor
• HAZARD_WEATHER_HURRICANE - Huracán
• HAZARD_WEATHER_FREEZING_RAIN - Lluvia congelante
```

**c) ROAD_CLOSED (Calles Cerradas)**
```
Subtipos:
• ROAD_CLOSED_HAZARD - Cerrada por peligro
• ROAD_CLOSED_CONSTRUCTION - Cerrada por construcción
• ROAD_CLOSED_EVENT - Cerrada por evento
```

**d) CONSTRUCTION (Construcciones)**
```
Subtipos:
• CONSTRUCTION_MAJOR - Construcción mayor
• CONSTRUCTION_MINOR - Construcción menor
```

**e) JAM (Reportes de Tráfico)**
```
Nota: Diferente de jams automáticos
• JAM_MODERATE_TRAFFIC - Tráfico moderado
• JAM_HEAVY_TRAFFIC - Tráfico pesado
• JAM_STAND_STILL_TRAFFIC - Tráfico detenido
```

#### **Campos de un Alert:**

```json
{
  "uuid": "1234567890abcdef",
  "id": 123456,
  "pubMillis": 1702300800000,
  "type": "ACCIDENT",
  "subtype": "ACCIDENT_MAJOR",
  "location": {
    "x": -64.18333,  // Longitud
    "y": -31.41667   // Latitud
  },
  "street": "Av. Colón",
  "city": "Córdoba",
  "country": "AR",
  "reportDescription": "Choque múltiple, dos carriles bloqueados",
  "reportRating": 3,
  "confidence": 8,      // Score 0-10
  "reliability": 9,     // Score 0-10
  "nThumbsUp": 12,      // Confirmaciones
  "nComments": 3,
  "nImages": 2,
  "reportBy": "username_hash",
  "reportMood": 1,      // 1=happy, 2=sad, etc.
  "magvar": 0,          // Variación magnética
  "additionalInfo": "..."
}
```

---

### **2. JAMS (Atascos de Tráfico)**

Detecciones automáticas de congestión basadas en velocidad de usuarios.

#### **Cómo se Calculan:**

```
1. Velocidad Histórica:
   Waze mantiene un promedio de velocidad por segmento de calle
   para cada día/hora de la semana.
   
   Ejemplo:
   • Av. Colón, Lunes 8:00 AM → Promedio: 45 km/h
   • Datos de últimas 4 semanas

2. Velocidad Actual:
   Se calcula en tiempo real basado en GPS de usuarios activos
   
   Ejemplo:
   • Av. Colón, Lunes 8:00 AM HOY → Actual: 15 km/h

3. Comparación:
   IF (Velocidad Actual < 60% de Velocidad Histórica):
      Existe un JAM
   
   Ejemplo:
   • 15 km/h < (45 km/h × 0.6)
   • 15 km/h < 27 km/h
   • ✓ JAM DETECTADO

4. Nivel del Jam:
   Se asigna según el porcentaje de reducción:
   • Level 0: Sin congestión (velocidad normal)
   • Level 1: Leve (80-90% de velocidad histórica)
   • Level 2: Moderado (60-80% de velocidad histórica)
   • Level 3: Alto (40-60% de velocidad histórica)
   • Level 4: Severo (20-40% de velocidad histórica)
   • Level 5: Detenido (<20% de velocidad histórica o <5 km/h)
```

#### **Campos de un Jam:**

```json
{
  "uuid": "1234567890abcdef",
  "id": 987654,
  "pubMillis": 1702300800000,
  "startMillis": 1702299600000,
  "endMillis": 1702304400000,
  
  // Geometría del atasco
  "line": [
    {"x": -64.18333, "y": -31.41667},  // Inicio
    {"x": -64.18444, "y": -31.41778},  // Punto medio
    {"x": -64.18555, "y": -31.41889}   // Fin
  ],
  
  // Ubicación
  "street": "Av. Colón",
  "city": "Córdoba",
  "country": "AR",
  
  // Métricas del atasco
  "level": 4,                // Severidad 0-5
  "severity": 4,             // Mismo que level
  "speed": 8.5,              // km/h (velocidad promedio actual)
  "speedKMH": 8.5,           // km/h (confirmación)
  "length": 1250,            // metros (longitud del atasco)
  "delay": 180,              // segundos (demora adicional)
  "delaySeconds": 180,
  
  // Clasificación de la vía
  "roadType": 3,             // Tipo de vía (ver tabla abajo)
  "turnType": "NONE",        // Tipo de giro
  "type": "SMALL",           // Tamaño del jam
  
  // Relación con alerts
  "blockingAlertUuid": "abc123",  // Si hay un alert causante
  
  // Información adicional
  "segments": [...]          // Segmentos afectados
}
```

#### **Tipos de Vía (roadType):**

```
1  = Calle local/residencial
2  = Calle principal
3  = Avenida/Arteria principal
4  = Ruta provincial/estatal
5  = Ruta nacional
6  = Autopista sin peaje
7  = Autopista con peaje
8  = Ruta express
9  = Calle privada
10 = Rampa de acceso/salida
15 = Ferry
16 = Sendero peatonal
17 = Sendero
18 = Pasaje peatonal
19 = Escalera
20 = Tren ligero
```

#### **Tipos de Giro (turnType):**

```
"NONE"           - Sin información
"LEFT"           - Giro a la izquierda
"RIGHT"          - Giro a la derecha
"STRAIGHT"       - Continuar recto
"EXIT_LEFT"      - Salida a la izquierda
"EXIT_RIGHT"     - Salida a la derecha
"KEEP_LEFT"      - Mantenerse a la izquierda
"KEEP_RIGHT"     - Mantenerse a la derecha
"U_TURN"         - Vuelta en U
```

---

### **3. IRREGULARITIES (Irregularidades)**

Eventos de tráfico significativos que afectan a muchos usuarios. Son calculados automáticamente por Waze analizando patrones de alerts y jams.

#### **Características:**

- 🎯 **Alto impacto:** Afectan a muchos conductores
- 🔍 **Detección automática:** No requieren reporte de usuario
- 📊 **Análisis de patrones:** Basados en múltiples fuentes
- ⏱️ **Tiempo real:** Se actualizan dinámicamente

#### **Campos de una Irregularity:**

```json
{
  "id": "IRR-123456",
  "detectionDateMillis": 1702300800000,
  "updateDateMillis": 1702302600000,
  "endDateMillis": 1702310000000,
  
  // Ubicación y geometría
  "street": "Av. Colón",
  "city": "Córdoba",
  "location": {
    "x": -64.18333,
    "y": -31.41667
  },
  "line": [...],  // Geometría completa
  
  // Impacto
  "severity": 4,              // 1-5
  "delaySeconds": 900,        // 15 minutos de demora
  "driversCount": 450,        // Conductores afectados
  "length": 2500,             // metros
  "jamLevel": 5,              // Nivel máximo
  "speed": 3.2,               // km/h promedio
  
  // Tipo de irregularidad
  "type": "MAJOR_EVENT",      // o "SIGNIFICANT_JAM"
  "description": "Accidente mayor con múltiples vehículos",
  
  // Causas detectadas
  "alerts": [                 // Alerts relacionados
    {"uuid": "...", "type": "ACCIDENT"},
    {"uuid": "...", "type": "ROAD_CLOSED"}
  ],
  "jams": [...]              // Jams relacionados
}
```

#### **Tipos de Irregularities:**

```
MAJOR_EVENT          - Evento mayor (concierto, partido, etc.)
SIGNIFICANT_JAM      - Atasco significativo
ACCIDENT_MAJOR       - Accidente grave
ROAD_CLOSURE         - Cierre de vía importante
WEATHER_EVENT        - Evento climático severo
CONSTRUCTION_MAJOR   - Construcción mayor
```

---

### **4. TRAFFIC (Datos de Flujo)**

Información agregada sobre el flujo de tráfico por segmentos.

**Nota:** Este tipo de datos está más limitado en el feed estándar. Para datos detallados de flujo, se recomienda usar **Traffic View (TVT)**.

---

## 📊 Estructura JSON Detallada

### **Estructura Completa del Feed:**

```json
{
  "startTime": "2024-12-11T08:00:00-03:00",
  "endTime": "2024-12-11T08:02:00-03:00",
  "startTimeMillis": 1702288800000,
  "endTimeMillis": 1702288920000,
  
  "alerts": [
    {
      "uuid": "alert-uuid-1",
      "pubMillis": 1702288850000,
      "type": "ACCIDENT",
      "subtype": "ACCIDENT_MAJOR",
      "location": {"x": -64.18333, "y": -31.41667},
      "street": "Av. Colón",
      "city": "Córdoba",
      "country": "AR",
      "reportDescription": "Choque de 3 vehículos",
      "reportRating": 3,
      "confidence": 8,
      "reliability": 9,
      "nThumbsUp": 12,
      "nComments": 3
    },
    {
      "uuid": "alert-uuid-2",
      "pubMillis": 1702288870000,
      "type": "HAZARD",
      "subtype": "HAZARD_ON_ROAD_POT_HOLE",
      "location": {"x": -64.19000, "y": -31.42000},
      "street": "Calle San Martín",
      "city": "Córdoba",
      "country": "AR",
      "reportDescription": "Bache grande",
      "confidence": 5,
      "reliability": 6,
      "nThumbsUp": 3
    }
  ],
  
  "jams": [
    {
      "uuid": "jam-uuid-1",
      "id": 123456,
      "pubMillis": 1702288900000,
      "line": [
        {"x": -64.18333, "y": -31.41667},
        {"x": -64.18444, "y": -31.41778},
        {"x": -64.18555, "y": -31.41889}
      ],
      "street": "Av. Colón",
      "city": "Córdoba",
      "country": "AR",
      "level": 4,
      "severity": 4,
      "speed": 8.5,
      "speedKMH": 8.5,
      "length": 1250,
      "delay": 180,
      "roadType": 3,
      "turnType": "NONE",
      "blockingAlertUuid": "alert-uuid-1"
    },
    {
      "uuid": "jam-uuid-2",
      "id": 123457,
      "pubMillis": 1702288910000,
      "line": [
        {"x": -64.19500, "y": -31.42500},
        {"x": -64.19600, "y": -31.42600}
      ],
      "street": "Ruta 9",
      "level": 2,
      "speed": 35,
      "length": 500,
      "delay": 45,
      "roadType": 5,
      "turnType": "STRAIGHT"
    }
  ],
  
  "irregularities": [
    {
      "id": "IRR-001",
      "detectionDateMillis": 1702288800000,
      "updateDateMillis": 1702288900000,
      "severity": 4,
      "delaySeconds": 900,
      "driversCount": 450,
      "length": 2500,
      "jamLevel": 5,
      "speed": 3.2,
      "street": "Av. Colón",
      "city": "Córdoba",
      "location": {"x": -64.18333, "y": -31.41667},
      "type": "SIGNIFICANT_JAM",
      "alerts": ["alert-uuid-1"],
      "jams": ["jam-uuid-1"]
    }
  ]
}
```

---

## 🎯 Scores y Métricas

### **1. Confidence Score (0-10)**

**Definición:** Mide el nivel de validación positiva de un incidente por parte de otros usuarios.

#### **Cómo se Calcula:**

```
Inicio: Score = 5 (neutral)

Por cada acción de usuario:
  • Thumbs Up (+1):     +0.5 a +1.0 puntos
  • Not There (-1):     -1.0 a -2.0 puntos
  • Confirmación GPS:   +0.3 puntos (usuario pasa por la zona)
  • Timeout sin acción: -0.1 por hora

Límites: 0 ≤ confidence ≤ 10

Ejemplo de evolución:
  t=0min:  confidence = 5.0  (reporte inicial)
  t=5min:  confidence = 6.5  (3 thumbs up)
  t=10min: confidence = 7.8  (5 más thumbs up, 1 confirmación GPS)
  t=15min: confidence = 7.2  (1 not there)
  t=60min: confidence = 6.8  (timeout sin nueva actividad)
```

#### **Interpretación:**

```
9-10 = Altamente verificado
      • Múltiples confirmaciones
      • Sin reportes negativos
      • Uso: Alertas críticas automáticas

7-8  = Bien verificado
      • Varias confirmaciones
      • Pocos/ningún reporte negativo
      • Uso: Alertas estándar

5-6  = Verificación moderada
      • Algunas confirmaciones
      • Neutral o mixto
      • Uso: Información general

3-4  = Baja verificación
      • Pocas confirmaciones
      • Algunos reportes negativos
      • Uso: Requiere validación manual

0-2  = No verificado/Dudoso
      • Sin confirmaciones o
      • Múltiples reportes negativos
      • Uso: Ignorar o investigar
```

---

### **2. Reliability Score (0-10)**

**Definición:** Mide la confiabilidad del usuario que reporta basándose en su experiencia y historial.

#### **Cómo se Calcula:**

```
Factores:
1. Nivel del Usuario (Waze Level):
   • Nivel 1-2:   Reliability = 2-3
   • Nivel 3-4:   Reliability = 4-6
   • Nivel 5-6:   Reliability = 7-9
   • Nivel 6+:    Reliability = 10

2. Historial de Reportes:
   • % de reportes confirmados (aumenta score)
   • % de reportes rechazados (disminuye score)
   • Antigüedad de la cuenta (aumenta score)

3. Rol Especial:
   • Usuario regular: Sin modificador
   • Map Editor: +1 punto
   • Area Manager: +2 puntos
   • Country Manager: +3 puntos

4. Penalizaciones:
   • Reportes falsos frecuentes: -3 puntos
   • Spam: -5 puntos (puede llegar a ban)

Valor Inicial: Reliability = 5 (para usuarios nuevos)

Límites: 0 ≤ reliability ≤ 10
```

#### **Interpretación:**

```
9-10 = Usuario experto
      • Editor de mapas o similar
      • Historial excelente
      • 1000+ ediciones confirmadas
      • Uso: Confianza máxima

7-8  = Usuario experimentado
      • Nivel 5-6 de Waze
      • Buen historial
      • 100+ reportes correctos
      • Uso: Alta confianza

5-6  = Usuario promedio
      • Nivel 3-4 de Waze
      • Historial neutral
      • Cuenta activa regular
      • Uso: Confianza moderada

3-4  = Usuario nuevo
      • Nivel 1-2 de Waze
      • Poco historial
      • Cuenta reciente
      • Uso: Requiere validación

0-2  = Usuario problemático
      • Historial negativo
      • Múltiples reportes falsos
      • Posible spam
      • Uso: Descartar reportes
```

---

### **3. Report Rating (0-10)**

**Definición:** Score general del reporte considerando múltiples factores.

```
Cálculo:
  reportRating = (confidence × 0.6) + (reliability × 0.4)
  
  Ajustes adicionales:
  • +1 si tiene imagen
  • +0.5 si tiene descripción detallada
  • +0.5 si otros usuarios comentaron positivamente
  • -1 si es muy antiguo (>4 horas)

Ejemplo:
  confidence = 8
  reliability = 9
  tiene imagen = true
  descripción = "Choque múltiple, ambulancias en camino"
  
  reportRating = (8 × 0.6) + (9 × 0.4) + 1 + 0.5
               = 4.8 + 3.6 + 1.5
               = 9.9 / 10
```

---

### **4. nThumbsUp (Validaciones)**

**Definición:** Contador de usuarios que confirmaron el incidente.

```
Condiciones para contar:
• Usuario debe pasar cerca del incidente (< 200m)
• Usuario debe estar activo en la app
• Solo 1 thumbs up por usuario
• Se puede cambiar a "not there" posteriormente

Valor típico:
• Incidente menor: 0-3 thumbs up
• Incidente moderado: 4-10 thumbs up
• Incidente mayor: 11-30 thumbs up
• Evento masivo: 30+ thumbs up

Uso:
• nThumbsUp > 10 → Alta probabilidad de ser real
• nThumbsUp = 0 después de 10 min → Dudoso
• nThumbsUp < -3 ("not there") → Probablemente falso
```

---

## 📏 Clasificaciones y Niveles

### **1. Jam Levels (Niveles de Atasco)**

```
┌─────────┬──────────┬───────────────┬────────────┬────────────────┐
│ Level   │ Nombre   │ Velocidad     │ Demora     │ Color en App   │
├─────────┼──────────┼───────────────┼────────────┼────────────────┤
│ 0       │ Free     │ > 90% normal  │ 0-15 seg   │ Verde          │
│         │ Flow     │               │            │                │
├─────────┼──────────┼───────────────┼────────────┼────────────────┤
│ 1       │ Light    │ 80-90% normal │ 15-45 seg  │ Verde claro    │
│         │ Traffic  │               │            │                │
├─────────┼──────────┼───────────────┼────────────┼────────────────┤
│ 2       │ Moderate │ 60-80% normal │ 45-120 seg │ Amarillo       │
│         │ Traffic  │               │            │                │
├─────────┼──────────┼───────────────┼────────────┼────────────────┤
│ 3       │ Heavy    │ 40-60% normal │ 2-5 min    │ Naranja        │
│         │ Traffic  │               │            │                │
├─────────┼──────────┼───────────────┼────────────┼────────────────┤
│ 4       │ Severe   │ 20-40% normal │ 5-15 min   │ Rojo           │
│         │ Traffic  │               │            │                │
├─────────┼──────────┼───────────────┼────────────┼────────────────┤
│ 5       │ Stand-   │ < 20% normal  │ > 15 min   │ Rojo oscuro    │
│         │ still    │ o < 5 km/h    │            │                │
└─────────┴──────────┴───────────────┴────────────┴────────────────┘
```

**Ejemplo Práctico:**

```
Av. Colón, Córdoba:
  Velocidad histórica Lunes 8AM: 50 km/h
  
  Escenario 1:
    Velocidad actual: 47 km/h
    → 47 / 50 = 94% → Level 0 (Free Flow)
  
  Escenario 2:
    Velocidad actual: 38 km/h
    → 38 / 50 = 76% → Level 2 (Moderate)
    
  Escenario 3:
    Velocidad actual: 8 km/h
    → 8 / 50 = 16% → Level 5 (Standstill)
```

---

### **2. Severity (Severidad de Eventos)**

```
┌────────┬──────────────┬─────────────────────────────────────┐
│ Level  │ Nombre       │ Descripción                         │
├────────┼──────────────┼─────────────────────────────────────┤
│ 1      │ Informativo  │ • Bache menor                       │
│        │              │ • Objeto pequeño en vía             │
│        │              │ • Advertencia general               │
├────────┼──────────────┼─────────────────────────────────────┤
│ 2      │ Bajo         │ • Vehículo detenido en hombro       │
│        │              │ • Animal en la vía                  │
│        │              │ • Construcción menor                │
├────────┼──────────────┼─────────────────────────────────────┤
│ 3      │ Medio        │ • Accidente menor (sin heridos)     │
│        │              │ • Objeto grande en vía              │
│        │              │ • Bache peligroso                   │
│        │              │ • Inundación leve                   │
├────────┼──────────────┼─────────────────────────────────────┤
│ 4      │ Alto         │ • Accidente con heridos             │
│        │              │ • Cierre parcial de vía             │
│        │              │ • Construcción mayor                │
│        │              │ • Clima severo                      │
├────────┼──────────────┼─────────────────────────────────────┤
│ 5      │ Crítico      │ • Accidente grave/fatal             │
│        │              │ • Cierre completo de vía            │
│        │              │ • Desastre natural                  │
│        │              │ • Evento catastrófico               │
└────────┴──────────────┴─────────────────────────────────────┘
```

---

## 🚀 Feeds Especializados

### **1. Traffic View (TVT) Feed**

Feed especializado para rutas específicas con información detallada de tiempos de viaje.

#### **Diferencias con Feed Estándar:**

```
Feed Estándar:
  • Basado en polígonos (áreas)
  • Todos los eventos en el área
  • Actualización cada 2 minutos
  • Hasta 5000 eventos

Traffic View (TVT):
  • Basado en rutas específicas (A→B)
  • Enfocado en tiempos de viaje
  • Información de sub-rutas
  • Comparación histórica vs actual
```

#### **Estructura TVT:**

```json
{
  "routes": [
    {
      "id": "route-123",
      "name": "Av Colón: Centro → Carlos Paz",
      "from": "Centro",
      "to": "Carlos Paz",
      "length": 35000,  // metros
      
      "segments": [
        {
          "id": 1,
          "from": "Centro",
          "to": "Alta Córdoba",
          "length": 5000,
          "historicTime": 420,      // 7 minutos (segundos)
          "currentTime": 780,       // 13 minutos actual
          "speed": 23,              // km/h actual
          "jamLevel": 3,
          "delay": 360              // 6 min de demora adicional
        },
        {
          "id": 2,
          "from": "Alta Córdoba",
          "to": "Ruta 20",
          "length": 8000,
          "historicTime": 480,
          "currentTime": 510,
          "speed": 56,
          "jamLevel": 1,
          "delay": 30
        }
      ],
      
      "totalHistoricTime": 2100,    // 35 minutos normalmente
      "totalCurrentTime": 3420,     // 57 minutos ahora
      "totalDelay": 1320,           // 22 minutos de demora
      "avgSpeed": 36,               // km/h promedio
      "avgJamLevel": 2.5,
      
      "alerts": [
        {
          "uuid": "alert-123",
          "type": "ACCIDENT",
          "street": "Av Colón",
          "location": {"x": -64.183, "y": -31.417},
          "segmentId": 1
        }
      ]
    }
  ],
  
  "updateTime": 1702300800000
}
```

#### **Casos de Uso TVT:**

1. **Sistemas de Rutas Alternativas**
   - Comparar tiempos de múltiples rutas
   - Sugerir mejor opción en tiempo real

2. **Predicción de Llegada**
   - ETA preciso basado en condiciones actuales
   - Alertas si el tiempo se extiende significativamente

3. **Análisis de Corredores**
   - Identificar segmentos problemáticos
   - Planificación de mejoras viales

---

### **2. Historical Data Feed**

Algunos partners tienen acceso a datos históricos agregados.

```json
{
  "historicalData": {
    "polygonId": "poly-123",
    "period": "2024-12-01 to 2024-12-07",
    "granularity": "hourly",
    
    "aggregations": [
      {
        "timestamp": "2024-12-01T08:00:00Z",
        "totalAlerts": 23,
        "totalJams": 45,
        "avgSpeed": 32,
        "avgDelay": 180,
        "alertsByType": {
          "ACCIDENT": 5,
          "HAZARD": 12,
          "CONSTRUCTION": 6
        },
        "jamsByLevel": {
          "0": 10,
          "1": 15,
          "2": 12,
          "3": 6,
          "4": 2,
          "5": 0
        }
      }
    ]
  }
}
```

---

## ⚠️ Límites y Restricciones

### **1. Límite de 5000 Eventos**

```
Por qué existe:
  • Rendimiento del sistema
  • Ancho de banda
  • Procesamiento del partner
  
Cómo se aplica:
  • Combinación de alerts + jams + irregularities
  • Si se excede, Waze prioriza por:
    1. Severidad
    2. Reciente (eventos nuevos)
    3. Impacto (número de usuarios afectados)
  
Qué hacer si se alcanza:
  • Reducir el tamaño del polígono
  • Dividir en múltiples polígonos
  • Filtrar por tipo de evento
  • Aumentar umbrales de severidad
```

### **2. Frecuencia de Actualización**

```
Frecuencia estándar: 2 minutos
  • No se puede aumentar
  • Hacer requests más frecuentes es innecesario
  • El feed incluye timestamp de última actualización
  
Recomendación:
  • Fetch cada 120 segundos (2 minutos)
  • Usar timestamp para detectar actualizaciones
  • No hacer polling más frecuente (desperdicia recursos)
```

### **3. Retención de Eventos**

```
Alerts:
  • Se mantienen mientras sean relevantes
  • Removidos si:
    - Múltiples "not there" reports
    - Más de 4 horas sin confirmación
    - Usuario que reportó lo elimina
    - Cierre de calle programado expira
  
Jams:
  • Se mantienen mientras exista congestión
  • Removidos si:
    - Velocidad vuelve a normal
    - Más de 30 minutos en level 0
  
Irregularities:
  • Duración variable (minutos a horas)
  • Removidos automáticamente al resolverse
```

### **4. Cobertura Geográfica**

```
Limitaciones:
  • Solo datos dentro del polígono definido
  • Eventos en el borde pueden estar incompletos
  • Sin datos de áreas sin usuarios activos
  
Recomendaciones:
  • Definir polígono con margen adicional
  • Combinar múltiples polígonos solapados
  • Considerar rutas de entrada/salida
```

---

## 💡 Mejores Prácticas

### **1. Procesamiento de Feeds**

```python
# Ejemplo conceptual de procesamiento óptimo

def process_waze_feed():
    """
    Procesa feed de Waze con mejores prácticas
    """
    
    # 1. Fetch con timeout apropiado
    feed_data = fetch_feed(
        url=FEED_URL,
        timeout=10  # 10 segundos max
    )
    
    # 2. Validar timestamp
    if feed_data['endTimeMillis'] <= last_processed_time:
        print("No hay nuevos datos")
        return
    
    # 3. Procesar en orden de prioridad
    
    # A) Irregularities primero (eventos mayores)
    for irregularity in feed_data.get('irregularities', []):
        if irregularity['severity'] >= 4:
            trigger_critical_alert(irregularity)
    
    # B) Alerts de alta calidad
    for alert in feed_data.get('alerts', []):
        quality = evaluate_quality(
            confidence=alert.get('confidence', 5),
            reliability=alert.get('reliability', 5)
        )
        
        if quality == 'HIGH' and alert.get('confidence', 0) >= 7:
            process_trusted_alert(alert)
        elif quality == 'MEDIUM':
            process_standard_alert(alert)
        # Ignorar quality == 'LOW'
    
    # C) Jams por nivel
    critical_jams = [j for j in feed_data.get('jams', []) if j['level'] >= 4]
    moderate_jams = [j for j in feed_data.get('jams', []) if 2 <= j['level'] < 4]
    
    process_jams(critical_jams, priority='HIGH')
    process_jams(moderate_jams, priority='NORMAL')
    
    # 4. Detectar cambios (comparar con estado anterior)
    detect_changes(feed_data, previous_state)
    
    # 5. Limpiar eventos obsoletos
    remove_stale_events(max_age_minutes=30)
    
    # 6. Guardar estado
    last_processed_time = feed_data['endTimeMillis']
    save_state(feed_data)
```

### **2. Sistema de Calidad de Datos**

```python
def evaluate_alert_quality(alert):
    """
    Sistema robusto de evaluación de calidad
    """
    confidence = alert.get('confidence', 5)
    reliability = alert.get('reliability', 5)
    thumbs_up = alert.get('nThumbsUp', 0)
    age_minutes = calculate_age(alert['pubMillis'])
    
    # Score combinado
    quality_score = (
        confidence * 0.4 +
        reliability * 0.3 +
        min(thumbs_up, 10) * 0.2 +  # Max 10 puntos
        (1 if age_minutes < 15 else 0) * 0.1
    )
    
    # Clasificación
    if quality_score >= 8 and confidence >= 7:
        return 'EXCELLENT'  # Usar para alertas automáticas
    elif quality_score >= 6 and confidence >= 5:
        return 'GOOD'       # Usar para información general
    elif quality_score >= 4:
        return 'FAIR'       # Requiere validación
    else:
        return 'POOR'       # Ignorar o verificar manualmente
```

### **3. Manejo de Límite de 5000 Eventos**

```python
def monitor_feed_limit():
    """
    Monitorea y alerta sobre límite de eventos
    """
    total_events = (
        len(feed_data.get('alerts', [])) +
        len(feed_data.get('jams', [])) +
        len(feed_data.get('irregularities', []))
    )
    
    percentage = (total_events / 5000) * 100
    
    if total_events >= 5000:
        alert_critical("LÍMITE ALCANZADO: 5000 eventos")
        recommend_polygon_split()
    elif percentage >= 90:
        alert_warning(f"Cerca del límite: {percentage:.1f}%")
    elif percentage >= 75:
        alert_info(f"Uso alto del límite: {percentage:.1f}%")
    
    return {
        'total_events': total_events,
        'percentage': percentage,
        'at_limit': total_events >= 5000,
        'near_limit': percentage >= 90
    }
```

### **4. Caché y Optimización**

```python
def implement_smart_cache():
    """
    Sistema de caché inteligente
    """
    
    # Niveles de caché
    cache_config = {
        # Datos que cambian lento
        'road_types': {
            'ttl': 3600,  # 1 hora
            'refresh': 'lazy'
        },
        
        # Datos de feed
        'current_feed': {
            'ttl': 120,   # 2 minutos
            'refresh': 'active'
        },
        
        # Métricas calculadas
        'aggregations': {
            'ttl': 300,   # 5 minutos
            'refresh': 'lazy'
        },
        
        # Datos históricos
        'historical': {
            'ttl': 86400,  # 24 horas
            'refresh': 'scheduled'
        }
    }
    
    return cache_config
```

---

## 🎯 Casos de Uso Avanzados

### **Caso 1: Sistema de Alertas Inteligente**

```python
def intelligent_alert_system(feed_data):
    """
    Sistema que combina múltiples fuentes para alertas precisas
    """
    
    # 1. Detectar situaciones críticas
    critical_situations = []
    
    # Combinar irregularities + alerts + jams
    for irregularity in feed_data.get('irregularities', []):
        if irregularity['severity'] >= 4:
            # Buscar alerts relacionados
            related_alerts = find_related_alerts(
                irregularity,
                feed_data['alerts']
            )
            
            # Buscar jams relacionados
            related_jams = find_related_jams(
                irregularity,
                feed_data['jams']
            )
            
            # Crear alerta combinada
            alert = {
                'type': 'CRITICAL_SITUATION',
                'irregularity': irregularity,
                'root_cause': identify_root_cause(related_alerts),
                'impact': {
                    'drivers_affected': irregularity['driversCount'],
                    'delay_minutes': irregularity['delaySeconds'] / 60,
                    'affected_length_km': irregularity['length'] / 1000
                },
                'related_events': {
                    'alerts': related_alerts,
                    'jams': related_jams
                },
                'recommended_action': generate_recommendation(
                    irregularity,
                    related_alerts,
                    related_jams
                )
            }
            
            critical_situations.append(alert)
    
    return critical_situations

def identify_root_cause(alerts):
    """
    Identifica la causa raíz de una situación
    """
    # Priorizar por tipo
    priority = [
        'ROAD_CLOSED',
        'ACCIDENT',
        'CONSTRUCTION',
        'HAZARD',
        'WEATHERHAZARD'
    ]
    
    for alert_type in priority:
        matching = [a for a in alerts if a['type'] == alert_type]
        if matching:
            # Usar el de mayor confidence
            best = max(matching, key=lambda x: x.get('confidence', 0))
            return {
                'type': alert_type,
                'confidence': best.get('confidence'),
                'description': best.get('reportDescription'),
                'location': best.get('street')
            }
    
    return None
```

### **Caso 2: Predicción de Tiempos de Viaje**

```python
def predict_travel_time(route, feed_data):
    """
    Predice tiempo de viaje considerando condiciones actuales
    """
    
    segments = divide_route_into_segments(route)
    total_time = 0
    
    for segment in segments:
        # Tiempo base (histórico)
        base_time = segment['historic_time']
        
        # Buscar jams en el segmento
        jams_in_segment = find_jams_in_segment(
            segment,
            feed_data['jams']
        )
        
        if jams_in_segment:
            # Tomar el jam más severo
            worst_jam = max(jams_in_segment, key=lambda x: x['level'])
            
            # Calcular factor de demora
            delay_factor = calculate_delay_factor(worst_jam['level'])
            
            # Aplicar demora
            segment_time = base_time * delay_factor
        else:
            segment_time = base_time
        
        # Buscar alerts bloqueantes
        blocking_alerts = find_blocking_alerts(
            segment,
            feed_data['alerts']
        )
        
        if blocking_alerts:
            # Si hay cierre, ese segmento es impracticable
            if any(a['type'] == 'ROAD_CLOSED' for a in blocking_alerts):
                return {
                    'status': 'ROUTE_BLOCKED',
                    'reason': 'Calle cerrada en segmento',
                    'suggest_alternative': True
                }
        
        total_time += segment_time
    
    return {
        'status': 'OK',
        'estimated_time_minutes': total_time / 60,
        'confidence': calculate_prediction_confidence(segments, feed_data)
    }

def calculate_delay_factor(jam_level):
    """
    Calcula factor de multiplicación por nivel de jam
    """
    factors = {
        0: 1.0,    # Sin demora
        1: 1.1,    # 10% más lento
        2: 1.3,    # 30% más lento
        3: 1.6,    # 60% más lento
        4: 2.2,    # 120% más lento
        5: 3.5     # 250% más lento
    }
    return factors.get(jam_level, 1.0)
```

### **Caso 3: Análisis de Patrones**

```python
def analyze_traffic_patterns(historical_feeds):
    """
    Analiza patrones de tráfico para predicción
    """
    
    patterns = {
        'recurring_jams': [],
        'accident_hotspots': [],
        'peak_hours': [],
        'problem_areas': []
    }
    
    # Agrupar por ubicación y hora
    location_time_groups = group_events_by_location_time(
        historical_feeds
    )
    
    for location, events_by_time in location_time_groups.items():
        # Detectar jams recurrentes
        jam_frequency = calculate_jam_frequency(events_by_time)
        
        if jam_frequency > 0.7:  # 70% de las veces
            patterns['recurring_jams'].append({
                'location': location,
                'frequency': jam_frequency,
                'typical_hours': identify_peak_hours(events_by_time),
                'avg_duration_minutes': calculate_avg_duration(events_by_time),
                'avg_severity': calculate_avg_severity(events_by_time)
            })
        
        # Detectar accident hotspots
        accident_count = count_accidents(events_by_time)
        
        if accident_count >= 5:  # 5+ accidentes en período
            patterns['accident_hotspots'].append({
                'location': location,
                'accident_count': accident_count,
                'severity_distribution': analyze_severity_distribution(
                    events_by_time
                ),
                'common_types': identify_common_accident_types(
                    events_by_time
                ),
                'recommendation': generate_safety_recommendation(
                    location,
                    events_by_time
                )
            })
    
    return patterns
```

---

## 📝 Resumen Ejecutivo

### **Puntos Clave para Implementación:**

1. **Feeds Waze actualizan cada 2 minutos**
   - Hacer fetch cada 120 segundos
   - Usar timestamps para detectar cambios

2. **Tres tipos principales de datos:**
   - **Alerts:** Reportes de usuarios
   - **Jams:** Detección automática de congestión
   - **Irregularities:** Eventos mayores calculados

3. **Sistema de calidad robusto:**
   - **Confidence (0-10):** Validación de usuarios
   - **Reliability (0-10):** Experiencia del reportante
   - Usar ambos scores para filtrar datos

4. **Límite de 5000 eventos por feed:**
   - Monitorear constantemente
   - Dividir polígonos si es necesario
   - Priorizar por severidad

5. **Jam levels (0-5) basados en:**
   - Comparación velocidad actual vs histórica
   - Level 4-5 son críticos
   - Level 0-1 son fluidos

6. **Mejores prácticas:**
   - Filtrar por confidence >= 7 para alertas críticas
   - Combinar múltiples fuentes (irregularities + alerts + jams)
   - Implementar caché inteligente
   - Detectar cambios entre actualizaciones

---

## 🔗 Referencias y Recursos

### **Documentación Oficial:**
- [Waze Data Feed Specification](https://support.google.com/waze/partners/answer/10618035)
- [Waze Traffic View](https://support.google.com/waze/partners/answer/14210446)
- [Waze for Cities Hub](https://www.waze.com/ccp)
- [Waze Irregularities Documentation](https://support.google.com/waze/partners/answer/13458165)

### **Herramientas Útiles:**
- Partner Hub: Configuración de feeds
- Live Map: Visualización en tiempo real
- Data Download: Acceso a históricos

### **Comunidad:**
- Waze Map Editor Forums
- Waze Connected Citizens Community

---

## 📊 Glosario de Términos

```
CCP          - Connected Citizens Program
TVT          - Traffic View Tool
GeoRSS       - Geographic RSS (formato XML)
UUID         - Universal Unique Identifier
Pub Millis   - Publication timestamp en milisegundos
Road Type    - Clasificación de tipo de vía (1-20)
Turn Type    - Tipo de giro o dirección
Jam Level    - Nivel de congestión (0-5)
Severity     - Severidad de evento (1-5)
Confidence   - Score de validación de usuarios (0-10)
Reliability  - Score de confiabilidad del reportante (0-10)
nThumbsUp    - Número de confirmaciones positivas
Irregularity - Evento mayor detectado automáticamente
Magvar       - Variación magnética (para navegación)
```

---

**Última actualización:** Diciembre 2024  
**Versión del documento:** 2.0.0  
**Mantenido por:** Equipo Panel Ejecutivo CASISA  
**Propósito:** Documento de contexto para desarrollo y operación del sistema

---

Este documento debe ser consultado como referencia principal para cualquier desarrollo o decisión relacionada con los feeds de Waze en el proyecto.
