# Sistema de Scoring de Riesgos Multifactorial

## Resumen Ejecutivo

Se ha implementado un sistema completo de análisis de riesgos multifactorial para todos los tramos monitoreados de CASISA. El sistema calcula un score de 0-100 basado en 5 factores críticos y permite visualización por grupo y tramo individual.

---

## 🎯 Características Principales

### 1. Scoring Multifactorial (0-100 puntos)

El sistema calcula un score ponderado considerando:

| Factor | Peso | Elementos Evaluados |
|--------|------|---------------------|
| **Tráfico y Congestión** | 25% | Cantidad de jams, nivel promedio, tráfico detenido |
| **Incidentes** | 30% | Total de incidentes, incidentes críticos, cierres de ruta, accidentes |
| **Clima** | 20% | Visibilidad, precipitación, temperatura, riesgo de hielo |
| **Velocidad** | 15% | Velocidad promedio, fluidez general |
| **Demoras** | 10% | Demoras totales y promedio en minutos |

### 2. Niveles de Riesgo

| Score | Nivel | Color | Descripción |
|-------|-------|-------|-------------|
| 0-20 | LOW | Verde | Condiciones normales |
| 21-40 | MODERATE | Amarillo | Atención requerida |
| 41-60 | HIGH | Naranja | Situación complicada |
| 61-80 | CRITICAL | Rojo | Requiere intervención |
| 81-100 | SEVERE | Púrpura | Crisis operacional |

### 3. Categorías de Riesgo

- **traffic_congestion**: Dominado por problemas de tráfico
- **incident_zone**: Zona con múltiples incidentes
- **weather_hazard**: Condiciones climáticas adversas
- **mixed**: Combinación de múltiples factores
- **normal**: Operación normal

---

## 🗄️ Base de Datos

### Nueva Tabla: `polygon_criticality_scores`

```sql
CREATE TABLE polygon_criticality_scores (
    id UUID PRIMARY KEY,
    polygon_id VARCHAR(50) NOT NULL,
    polygon_name VARCHAR(200) NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Scores por factor
    traffic_score DECIMAL(5,2),
    incident_score DECIMAL(5,2),
    weather_score DECIMAL(5,2),
    speed_score DECIMAL(5,2),
    delay_score DECIMAL(5,2),

    -- Score final
    final_risk_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    risk_category VARCHAR(50),

    -- Metadata
    alert_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Vista Materializada: `latest_polygon_risk_scores`

Mantiene el score más reciente de cada polígono para consultas rápidas.

---

## 🔧 Backend (TypeScript/Fastify)

### Servicio: `riskScoringService.ts`

#### Métodos Principales

1. **`calculateAllRiskScores()`**: Calcula scores para todos los polígonos
2. **`calculatePolygonRiskScore(polygonId)`**: Recalcula score de un polígono
3. **`getRiskScoresByGroup(groupName?)`**: Obtiene scores filtrados por grupo
4. **`getGroupRiskSummaries()`**: Resumen estadístico por grupo
5. **`getPolygonRiskScore(polygonId)`**: Score de un polígono específico

#### Algoritmo de Cálculo

```typescript
// Factor 1: Tráfico (0-100)
- Cantidad de jams × 3 (máx 30 pts)
- Nivel promedio de jams × 7 (máx 35 pts)
- Tráfico detenido × 8 (máx 35 pts)

// Factor 2: Incidentes (0-100)
- Total incidentes × 5 (máx 30 pts)
- Incidentes críticos × 15 (máx 50 pts)
- Cierres de ruta × 20 (máx 20 pts)

// Factor 3: Clima (0-100)
- Visibilidad < 1km: 25 pts
- Precipitación > 10mm: 30 pts
- Temperatura < 0°C + lluvia: 25 pts
- Condiciones adversas: 20 pts

// Factor 4: Velocidad (0-100)
- Velocidad < 20 km/h: 50 pts
- Fluidez baja: (100 - fluidity) × 0.5

// Factor 5: Demoras (0-100)
- Escala logarítmica:
  - < 5 min: 10 pts
  - < 15 min: 25 pts
  - < 30 min: 40 pts
  - < 60 min: 60 pts
  - > 120 min: 100 pts

// Score Final = Suma ponderada
final_score =
    traffic_score × 0.25 +
    incident_score × 0.30 +
    weather_score × 0.20 +
    speed_score × 0.15 +
    delay_score × 0.10
```

### Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/risk/summary` | Resumen global por grupos |
| GET | `/api/risk/scores?group=X` | Scores filtrados por grupo |
| GET | `/api/risk/polygon/:id` | Score de un polígono |
| POST | `/api/risk/calculate` | Recalcular todos los scores |
| POST | `/api/risk/polygon/:id/recalculate` | Recalcular un polígono |

---

## 🎨 Frontend (React/TypeScript)

### Hook: `useRiskScoring.ts`

```typescript
// Obtener resumen global
const { data } = useRiskSummary();

// Obtener scores por grupo
const { data } = useRiskScores('Ruta Nacional 36');

// Obtener score de un polígono
const { data } = usePolygonRiskScore('P001');

// Recalcular scores
const { mutate } = useCalculateAllScores();
```

### Página: `/riesgos` - Risk Dashboard

#### Componentes Principales

1. **Header**
   - Título y descripción
   - Botón "Recalcular" con indicador de carga
   - Timestamp de última actualización

2. **Panel de Estado Global**
   - 6 tarjetas con distribución de riesgos:
     - Total de tramos monitoreados
     - Riesgo Bajo (verde)
     - Riesgo Moderado (amarillo)
     - Riesgo Alto (naranja)
     - Riesgo Crítico (rojo)
     - Riesgo Severo (púrpura)

3. **Sidebar: Filtro por Grupo**
   - Botón "Todos los Grupos"
   - Lista de grupos disponibles:
     - Autovía A-019
     - Ruta Nacional 9
     - Ruta Nacional 19
     - Ruta Nacional 36
     - Ruta Provincial E53
     - Ruta Provincial E55
     - Ruta Provincial C45
     - Ruta Provincial 5
     - Ruta 20-38 y Alt. 38
     - Área Capital
     - Avenidas Urbanas
   - Badge rojo con contador de tramos críticos por grupo

4. **Lista de Tramos**
   - Cards animadas con:
     - Nombre del tramo
     - Grupo al que pertenece
     - 5 badges con mini-indicadores de cada factor (icono + valor)
     - Score final prominente con color según nivel
     - Click para ver detalle

5. **Panel Detallado (Modal inferior)**
   - Se abre al hacer click en un tramo
   - Muestra:
     - 5 cards detalladas por factor con barra de progreso
     - Categoría de riesgo identificada
     - Indicador de "ALERTA ACTIVA" si aplica

#### Características UX/UI

- ✅ **Animaciones fluidas** con Framer Motion
- ✅ **Colores consistentes** con el diseño actual (Tailwind)
- ✅ **Responsive design**
- ✅ **Iconos descriptivos** (Lucide React)
- ✅ **Hover effects** y transiciones suaves
- ✅ **Loading states** para todas las operaciones async
- ✅ **Actualización automática** cada 2 minutos

---

## 🚀 Navegación

### Nueva Tab en la Barra de Navegación

Se agregó una nueva pestaña entre "Mapa y Zonas" y "Alertas y Eventos":

- **Icono**: ShieldAlert (escudo con alerta)
- **Color**: Gradiente rojo (from-red-500 to-red-600)
- **Label**: "Análisis de Riesgos"
- **Ruta**: `/riesgos`

---

## 📊 Flujo de Uso

### 1. Al Ingresar al Dashboard de Riesgos

```
Usuario accede a /riesgos
    ↓
Se muestra panel de estado global con distribución de riesgos
    ↓
Lista completa de tramos ordenados por score (críticos primero)
```

### 2. Filtrar por Grupo

```
Usuario selecciona un grupo (ej: "Ruta Nacional 36")
    ↓
Lista se filtra mostrando solo tramos de ese grupo
    ↓
Título actualiza: "Tramos de Ruta Nacional 36"
```

### 3. Ver Detalle de un Tramo

```
Usuario hace click en un tramo
    ↓
Se abre panel inferior con detalle completo
    ↓
5 factores desglosados con visualización de barras
    ↓
Categoría de riesgo y estado de alerta
```

### 4. Recalcular Scores

```
Usuario presiona "Recalcular"
    ↓
Se ejecuta cálculo para todos los polígonos
    ↓
Indicador de "Calculando..." con spinner
    ↓
Al completar: datos se actualizan automáticamente
```

---

## 🔄 Actualización Automática

El sistema refresca datos automáticamente:

- **Scores y resúmenes**: Cada 2 minutos
- **Vista materializada**: Al calcular scores
- **Queries React**: Invalidación automática post-mutación

---

## 📈 Casos de Uso Operacionales

### 1. Monitoreo en Tiempo Real

**Operador de CASISA revisa dashboard cada hora**

- Identifica rápidamente grupos con mayor criticidad
- Filtra por grupo problemático
- Ve desglose de factores para cada tramo crítico
- Toma decisiones operativas basadas en datos

### 2. Análisis Post-Evento

**Después de un incidente mayor**

- Recalcula scores para actualizar
- Identifica cascada de impactos (tramos afectados indirectamente)
- Evalúa efectividad de respuesta observando reducción de scores

### 3. Planificación Preventiva

**Análisis de patrones diarios/semanales**

- Identifica tramos con scores consistentemente altos
- Prioriza mantenimiento preventivo
- Asigna recursos según criticidad histórica

### 4. Alertas Automáticas

**Detección de situaciones críticas**

- Tramos con score > 60 generan alerta automática
- Badge de "ALERTA ACTIVA" visible en el tramo
- Operadores pueden filtrar por tramos en alerta

---

## 🎯 Próximos Pasos Sugeridos

1. **Integrar con sistema de notificaciones**
   - Enviar alertas push cuando score > 60
   - Email a responsables de cada grupo

2. **Dashboard histórico**
   - Gráficos de evolución temporal de scores
   - Comparativas día/semana/mes

3. **Exportación de reportes**
   - PDF con scores del día
   - Excel con histórico semanal

4. **Machine Learning (futuro)**
   - Predicción de scores basada en patrones históricos
   - Detección de anomalías

---

## 📝 Archivos Modificados/Creados

### Backend
- ✅ `backend/src/database/migrations/002_scoring_riesgos.sql`
- ✅ `backend/src/services/riskScoringService.ts`
- ✅ `backend/src/server.ts` (nuevos endpoints)

### Frontend
- ✅ `src/hooks/useRiskScoring.ts`
- ✅ `src/pages/RiskDashboard.tsx`
- ✅ `src/router.tsx`
- ✅ `src/components/layout/modern-navigation.tsx`

### Documentación
- ✅ `SCORING_RIESGOS_IMPLEMENTADO.md` (este archivo)

---

## ✅ Estado Actual

- ✅ Base de datos migrada
- ✅ Servicio de scoring funcional
- ✅ Endpoints API operativos
- ✅ Frontend completo e integrado
- ✅ Scores iniciales calculados para todos los polígonos
- ✅ Navegación actualizada
- ✅ Sistema en producción

**El sistema está 100% funcional y listo para uso.**

---

## 🔍 Validación

Para verificar el funcionamiento:

```bash
# 1. Verificar API
curl http://localhost:3001/api/risk/summary

# 2. Verificar scores en BD
psql -U postgres -d panel_waze -c "SELECT polygon_name, final_risk_score, risk_level FROM latest_polygon_risk_scores ORDER BY final_risk_score DESC LIMIT 10;"

# 3. Acceder al frontend
http://localhost:5173/riesgos
```

---

**Implementado por**: AI Assistant
**Fecha**: 24 de diciembre de 2025
**Versión**: 1.0.0



