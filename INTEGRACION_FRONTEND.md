# 🎨 Guía de Integración Frontend - Calidad de Datos Waze

## 📋 Descripción

Esta guía explica cómo integrar las nuevas APIs de calidad de datos en el frontend del Panel Ejecutivo para aprovechar los scores de Waze (Confidence y Reliability).

---

## 🎯 Componentes Sugeridos a Crear

### 1. **Indicadores de Calidad en el Mapa**

**Objetivo:** Mostrar visualmente la calidad de cada incidente en el mapa.

**Implementación Sugerida:**

```typescript
// src/components/Map.tsx

interface IncidentWithQuality extends InternalAlert {
  quality?: 'high' | 'medium' | 'low';
  confidence?: number;
  reliability?: number;
}

// Agregar badges de calidad a los popups
const renderIncidentPopup = (incident: IncidentWithQuality) => {
  const qualityBadge = getQualityBadge(incident);
  
  return (
    <div className="popup-content">
      <div className="popup-header">
        <h3>{translateIncidentType(incident.type)}</h3>
        {qualityBadge}
      </div>
      
      {/* Mostrar scores de Waze */}
      <div className="waze-scores">
        <div className="score-badge">
          <span className="label">Confianza:</span>
          <span className="value">{incident.confidence || 'N/A'}/10</span>
          <div className="progress-bar">
            <div style={{ width: `${(incident.confidence || 0) * 10}%` }} />
          </div>
        </div>
        
        <div className="score-badge">
          <span className="label">Confiabilidad:</span>
          <span className="value">{incident.reliability || 'N/A'}/10</span>
          <div className="progress-bar">
            <div style={{ width: `${(incident.reliability || 0) * 10}%` }} />
          </div>
        </div>
      </div>
      
      {/* Resto del contenido del popup */}
    </div>
  );
};

const getQualityBadge = (incident: IncidentWithQuality) => {
  const confidence = incident.confidence || 0;
  const reliability = incident.reliability || 0;
  
  if (confidence >= 7 && reliability >= 7) {
    return <span className="badge badge-success">✓ Verificado</span>;
  } else if (confidence >= 4 && reliability >= 4) {
    return <span className="badge badge-warning">⚠ Moderado</span>;
  } else {
    return <span className="badge badge-danger">? No verificado</span>;
  }
};
```

**CSS Sugerido:**
```css
/* src/components/Map.css */

.waze-scores {
  display: flex;
  gap: 12px;
  margin: 12px 0;
}

.score-badge {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-badge .label {
  font-size: 11px;
  color: #666;
  font-weight: 600;
}

.score-badge .value {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.progress-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar > div {
  height: 100%;
  background: linear-gradient(90deg, #ef4444 0%, #fbbf24 50%, #10b981 100%);
  transition: width 0.3s ease;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-success {
  background: #10b981;
  color: white;
}

.badge-warning {
  background: #fbbf24;
  color: #78350f;
}

.badge-danger {
  background: #ef4444;
  color: white;
}
```

---

### 2. **Card de Métricas de Calidad de Datos**

**Objetivo:** Mostrar métricas globales de calidad en el dashboard.

**Componente Sugerido:**

```typescript
// src/components/DataQualityCard.tsx

import React, { useEffect, useState } from 'react';

interface QualityMetrics {
  totalIncidents: number;
  highQualityIncidents: number;
  mediumQualityIncidents: number;
  lowQualityIncidents: number;
  avgConfidence: number;
  avgReliability: number;
  filteredOutCount: number;
  qualityPercentage: number;
}

export const DataQualityCard: React.FC = () => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/data-quality/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching quality metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Actualizar cada minuto
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return <div className="card">Cargando métricas...</div>;
  }

  return (
    <div className="card data-quality-card">
      <h3 className="card-title">
        📊 Calidad de Datos Waze
      </h3>
      
      <div className="quality-overview">
        <div className="quality-percentage">
          <div className="percentage-circle">
            <svg viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeDasharray={`${metrics.qualityPercentage * 2.827} ${282.7 - metrics.qualityPercentage * 2.827}`}
                strokeDashoffset="0"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold">
                {metrics.qualityPercentage}%
              </text>
            </svg>
          </div>
          <p className="percentage-label">Alta Calidad</p>
        </div>
        
        <div className="quality-breakdown">
          <div className="quality-stat">
            <div className="stat-indicator high"></div>
            <span className="stat-label">Alta calidad</span>
            <span className="stat-value">{metrics.highQualityIncidents}</span>
          </div>
          
          <div className="quality-stat">
            <div className="stat-indicator medium"></div>
            <span className="stat-label">Media calidad</span>
            <span className="stat-value">{metrics.mediumQualityIncidents}</span>
          </div>
          
          <div className="quality-stat">
            <div className="stat-indicator low"></div>
            <span className="stat-label">Baja calidad</span>
            <span className="stat-value">{metrics.lowQualityIncidents}</span>
          </div>
          
          {metrics.filteredOutCount > 0 && (
            <div className="quality-stat filtered">
              <div className="stat-indicator filtered"></div>
              <span className="stat-label">Filtrados</span>
              <span className="stat-value">{metrics.filteredOutCount}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="waze-scores-summary">
        <div className="score-summary">
          <span className="score-label">Confianza promedio</span>
          <span className="score-value">{metrics.avgConfidence.toFixed(1)}/10</span>
        </div>
        
        <div className="score-summary">
          <span className="score-label">Confiabilidad promedio</span>
          <span className="score-value">{metrics.avgReliability.toFixed(1)}/10</span>
        </div>
      </div>
      
      {metrics.qualityPercentage < 50 && (
        <div className="quality-warning">
          ⚠️ Calidad de datos por debajo del 50%
        </div>
      )}
    </div>
  );
};
```

**CSS del Componente:**
```css
/* src/components/DataQualityCard.css */

.data-quality-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.quality-overview {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

.quality-percentage {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.percentage-circle {
  width: 120px;
  height: 120px;
}

.percentage-label {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.quality-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quality-stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.stat-indicator.high {
  background: #10b981;
}

.stat-indicator.medium {
  background: #fbbf24;
}

.stat-indicator.low {
  background: #f97316;
}

.stat-indicator.filtered {
  background: #6b7280;
}

.stat-label {
  flex: 1;
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.waze-scores-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.score-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.score-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.quality-warning {
  margin-top: 16px;
  padding: 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  color: #92400e;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
```

---

### 3. **Filtro de Calidad en AlertsPanel**

**Objetivo:** Permitir filtrar incidentes por calidad.

**Modificación Sugerida:**

```typescript
// src/components/AlertsPanel.tsx

import React, { useState, useMemo } from 'react';

type QualityFilter = 'all' | 'high' | 'high-medium';

export const AlertsPanel: React.FC<{ incidents: InternalAlert[] }> = ({ incidents }) => {
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  
  // Evaluar calidad de cada incidente
  const incidentsWithQuality = useMemo(() => {
    return incidents.map(incident => {
      const confidence = incident.confidence || 0;
      const reliability = incident.reliability || 0;
      
      let quality: 'high' | 'medium' | 'low';
      if (confidence >= 7 && reliability >= 7) {
        quality = 'high';
      } else if (confidence >= 4 && reliability >= 4) {
        quality = 'medium';
      } else {
        quality = 'low';
      }
      
      return { ...incident, quality };
    });
  }, [incidents]);
  
  // Filtrar por calidad
  const filteredIncidents = useMemo(() => {
    switch (qualityFilter) {
      case 'high':
        return incidentsWithQuality.filter(i => i.quality === 'high');
      case 'high-medium':
        return incidentsWithQuality.filter(i => i.quality === 'high' || i.quality === 'medium');
      default:
        return incidentsWithQuality;
    }
  }, [incidentsWithQuality, qualityFilter]);
  
  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3>Alertas Activas ({filteredIncidents.length})</h3>
        
        <div className="quality-filter">
          <select
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
            className="quality-select"
          >
            <option value="all">Todas las calidades</option>
            <option value="high-medium">Alta y media ✓</option>
            <option value="high">Solo alta calidad ✓✓</option>
          </select>
        </div>
      </div>
      
      <div className="alerts-list">
        {filteredIncidents.map((incident) => (
          <div key={incident.id} className={`alert-item quality-${incident.quality}`}>
            {/* Badge de calidad */}
            <div className={`quality-badge badge-${incident.quality}`}>
              {incident.quality === 'high' && '✓✓'}
              {incident.quality === 'medium' && '✓'}
              {incident.quality === 'low' && '?'}
            </div>
            
            {/* Resto del contenido de la alerta */}
            <div className="alert-content">
              <h4>{translateIncidentType(incident.type)}</h4>
              <p>{incident.street || 'Ubicación desconocida'}</p>
              <span className="alert-time">{formatTimestamp(incident.timestamp)}</span>
            </div>
            
            {/* Scores de Waze (tooltip) */}
            <div className="alert-scores" title={`Confianza: ${incident.confidence}/10, Confiabilidad: ${incident.reliability}/10`}>
              <span className="score-icon">ℹ️</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 4. **Hook Personalizado para Datos de Calidad**

**Objetivo:** Simplificar el acceso a las APIs de calidad.

```typescript
// src/hooks/useDataQuality.ts

import { useState, useEffect, useCallback } from 'react';

interface QualityMetrics {
  totalIncidents: number;
  highQualityIncidents: number;
  mediumQualityIncidents: number;
  lowQualityIncidents: number;
  avgConfidence: number;
  avgReliability: number;
  filteredOutCount: number;
  qualityPercentage: number;
}

interface FeedStatus {
  nearLimit: boolean;
  atLimit: boolean;
  totalEvents: number;
  percentage: number;
}

export const useDataQuality = (refreshInterval: number = 60000) => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [feedStatus, setFeedStatus] = useState<FeedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const [metricsRes, statusRes] = await Promise.all([
        fetch('/api/data-quality/metrics'),
        fetch('/api/data-quality/feed-status')
      ]);

      if (!metricsRes.ok || !statusRes.ok) {
        throw new Error('Failed to fetch quality data');
      }

      const metricsData = await metricsRes.json();
      const statusData = await statusRes.json();

      setMetrics(metricsData);
      setFeedStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  return {
    metrics,
    feedStatus,
    loading,
    error,
    refresh: fetchMetrics
  };
};
```

**Uso del Hook:**
```typescript
// En cualquier componente:
const { metrics, feedStatus, loading } = useDataQuality();

if (metrics) {
  console.log(`Calidad: ${metrics.qualityPercentage}%`);
}

if (feedStatus?.atLimit) {
  alert('⚠️ Límite de eventos alcanzado!');
}
```

---

### 5. **Notificaciones de Calidad**

**Objetivo:** Alertar cuando la calidad de datos baje significativamente.

```typescript
// src/components/QualityMonitor.tsx

import React, { useEffect, useState } from 'react';
import { useDataQuality } from '../hooks/useDataQuality';

export const QualityMonitor: React.FC = () => {
  const { metrics, feedStatus } = useDataQuality(30000); // Cada 30 segundos
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!metrics) return;

    // Alertar si la calidad baja del 50%
    if (metrics.qualityPercentage < 50) {
      setShowWarning(true);
      
      // Notificación del navegador (si está permitido)
      if (Notification.permission === 'granted') {
        new Notification('⚠️ Calidad de Datos Baja', {
          body: `Solo ${metrics.qualityPercentage}% de datos son de alta calidad`,
          icon: '/logo_cs.png'
        });
      }
    } else {
      setShowWarning(false);
    }
  }, [metrics]);

  useEffect(() => {
    // Alertar si se alcanza el límite de Waze
    if (feedStatus?.atLimit) {
      if (Notification.permission === 'granted') {
        new Notification('🚨 Límite de Waze Alcanzado', {
          body: `${feedStatus.totalEvents} eventos (máximo 5000)`,
          icon: '/logo_cs.png'
        });
      }
    }
  }, [feedStatus]);

  if (!showWarning && !feedStatus?.nearLimit) {
    return null;
  }

  return (
    <div className="quality-warnings">
      {showWarning && (
        <div className="warning-banner warning-quality">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            Calidad de datos baja: {metrics?.qualityPercentage}%
          </span>
          <button className="warning-close" onClick={() => setShowWarning(false)}>
            ×
          </button>
        </div>
      )}
      
      {feedStatus?.nearLimit && (
        <div className="warning-banner warning-limit">
          <span className="warning-icon">📊</span>
          <span className="warning-text">
            Cerca del límite de Waze: {feedStatus.percentage}%
          </span>
        </div>
      )}
    </div>
  );
};
```

---

## 📊 Integración en Dashboard Principal

**Modificación Sugerida en Dashboard.tsx:**

```typescript
// src/pages/Dashboard.tsx

import { DataQualityCard } from '../components/DataQualityCard';
import { QualityMonitor } from '../components/QualityMonitor';

export const Dashboard: React.FC = () => {
  // ... código existente ...

  return (
    <div className="dashboard">
      <Header />
      
      {/* Monitor de calidad (notificaciones flotantes) */}
      <QualityMonitor />
      
      <div className="dashboard-grid">
        {/* KPIs existentes */}
        <KPICards />
        
        {/* NUEVO: Card de calidad de datos */}
        <DataQualityCard />
        
        {/* Resto del dashboard */}
        <Map />
        <AlertsPanel />
        {/* ... */}
      </div>
    </div>
  );
};
```

---

## 🎨 Estilos Globales Sugeridos

```css
/* src/index.css - Agregar al final */

/* Quality Badges */
.quality-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
}

.badge-high {
  background: #10b981;
  color: white;
}

.badge-medium {
  background: #fbbf24;
  color: #78350f;
}

.badge-low {
  background: #ef4444;
  color: white;
}

/* Warning Banners */
.quality-warnings {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.warning-quality {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  color: #92400e;
}

.warning-limit {
  background: #dbeafe;
  border: 1px solid #3b82f6;
  color: #1e3a8a;
}

.warning-icon {
  font-size: 20px;
}

.warning-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.warning-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.warning-close:hover {
  opacity: 1;
}
```

---

## 🚀 Pasos de Implementación

### **Fase 1: Preparación (1-2 horas)**
1. Crear directorio para nuevos componentes
2. Instalar dependencias si es necesario
3. Crear archivos base

### **Fase 2: Implementación Básica (4-6 horas)**
1. ✅ Crear hook `useDataQuality`
2. ✅ Crear componente `DataQualityCard`
3. ✅ Agregar badge de calidad a popups del mapa
4. ✅ Integrar en dashboard principal

### **Fase 3: Funcionalidades Avanzadas (4-6 horas)**
1. ✅ Implementar filtro de calidad en `AlertsPanel`
2. ✅ Crear componente `QualityMonitor`
3. ✅ Agregar notificaciones del navegador
4. ✅ Agregar tooltips informativos

### **Fase 4: Pruebas y Ajustes (2-3 horas)**
1. Probar con datos reales
2. Ajustar estilos
3. Optimizar rendimiento
4. Documentar cambios

---

## 📝 Checklist de Implementación

- [ ] Crear `src/hooks/useDataQuality.ts`
- [ ] Crear `src/components/DataQualityCard.tsx`
- [ ] Crear `src/components/QualityMonitor.tsx`
- [ ] Modificar `src/components/Map.tsx` (badges de calidad)
- [ ] Modificar `src/components/AlertsPanel.tsx` (filtro de calidad)
- [ ] Modificar `src/pages/Dashboard.tsx` (integración)
- [ ] Agregar estilos CSS
- [ ] Probar con datos reales
- [ ] Documentar cambios en README

---

## 🎓 Mejores Prácticas

### **Performance:**
- ✅ Usar `useMemo` para cálculos de calidad
- ✅ Actualizar métricas cada 60 segundos (no más frecuente)
- ✅ Memoizar componentes pesados

### **UX:**
- ✅ Usar colores consistentes para niveles de calidad
- ✅ Mostrar tooltips explicativos
- ✅ Proporcionar feedback visual claro

### **Datos:**
- ✅ Manejar casos donde confidence/reliability no están disponibles
- ✅ Mostrar "N/A" en lugar de 0 cuando no hay datos
- ✅ Validar respuestas de API antes de usar

---

## 📚 Referencias

- **Backend API:** Ver `MEJORAS_API_WAZE.md`
- **Endpoints:** Ver sección "Nuevos Endpoints de API"
- **Tipos:** Ver `backend/src/services/dataQualityService.ts`

---

**Versión:** 1.0.0  
**Estado:** 📝 Guía de implementación pendiente
