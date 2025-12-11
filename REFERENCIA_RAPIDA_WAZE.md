# ⚡ Referencia Rápida: Feeds de Waze

## 🎯 Información Esencial

### **Actualización**
- ⏱️ **Frecuencia:** Cada 2 minutos (120 segundos)
- 🔄 **Fetch recomendado:** Cada 120 segundos
- ⚠️ **Límite:** 5000 eventos máximo por feed

### **Formatos Disponibles**
- ✅ JSON (Recomendado)
- ✅ XML (GeoRSS)

---

## 📊 Tipos de Datos

### **1. ALERTS (Incidentes Reportados)**
```
Principales tipos:
• ACCIDENT (MAJOR, MINOR)
• HAZARD (ON_ROAD, ON_SHOULDER, WEATHER)
• ROAD_CLOSED
• CONSTRUCTION
```

### **2. JAMS (Atascos Automáticos)**
```
Niveles 0-5:
• 0 = Libre (>90% velocidad normal)
• 1 = Ligero (80-90%)
• 2 = Moderado (60-80%)
• 3 = Alto (40-60%)
• 4 = Severo (20-40%)
• 5 = Detenido (<20% o <5 km/h)
```

### **3. IRREGULARITIES (Eventos Mayores)**
```
Calculados automáticamente:
• MAJOR_EVENT
• SIGNIFICANT_JAM
• ACCIDENT_MAJOR
```

---

## 🎯 Scores de Calidad

### **Confidence (0-10)**
```
9-10 = Altamente verificado → Usar para alertas automáticas
7-8  = Bien verificado → Alertas estándar
5-6  = Moderado → Información general
3-4  = Baja verificación → Requiere validación
0-2  = No verificado → Ignorar
```

### **Reliability (0-10)**
```
9-10 = Usuario experto (Editor/Manager)
7-8  = Usuario experimentado (Nivel 5-6)
5-6  = Usuario promedio (Nivel 3-4)
3-4  = Usuario nuevo (Nivel 1-2)
0-2  = Problemático → Descartar
```

### **Regla de Oro**
```python
# Solo usar incidentes confiables
if confidence >= 7 and reliability >= 7:
    # Alta calidad → OK para alertas críticas
    
elif confidence >= 5 and reliability >= 5:
    # Calidad media → OK para información general
    
else:
    # Baja calidad → Requiere validación o ignorar
```

---

## 📋 Campos Importantes

### **Alert (Incidente)**
```json
{
  "uuid": "id-unico",
  "type": "ACCIDENT",
  "subtype": "ACCIDENT_MAJOR",
  "location": {"x": -64.183, "y": -31.417},
  "street": "Av. Colón",
  "confidence": 8,        // ← CLAVE
  "reliability": 9,       // ← CLAVE
  "nThumbsUp": 12,        // ← Validaciones
  "pubMillis": 1702288800000
}
```

### **Jam (Atasco)**
```json
{
  "uuid": "id-unico",
  "level": 4,             // ← 0-5
  "speed": 8.5,           // ← km/h actual
  "delay": 180,           // ← segundos demora
  "length": 1250,         // ← metros
  "roadType": 3,          // ← Tipo de vía
  "blockingAlertUuid": "alert-id", // ← Causa
  "line": [...]           // ← Geometría
}
```

---

## ⚡ Código de Ejemplo Rápido

### **Evaluación de Calidad**
```python
def es_confiable(alert):
    confidence = alert.get('confidence', 0)
    reliability = alert.get('reliability', 0)
    
    if confidence >= 7 and reliability >= 7:
        return 'ALTA'
    elif confidence >= 5 and reliability >= 5:
        return 'MEDIA'
    else:
        return 'BAJA'
```

### **Filtrado por Severidad**
```python
def filtrar_criticos(feed_data):
    # Irregularities críticas
    critical_irregularities = [
        i for i in feed_data.get('irregularities', [])
        if i['severity'] >= 4
    ]
    
    # Alerts confiables y severos
    critical_alerts = [
        a for a in feed_data.get('alerts', [])
        if a.get('confidence', 0) >= 7
        and a['type'] in ['ACCIDENT', 'ROAD_CLOSED']
    ]
    
    # Jams severos
    critical_jams = [
        j for j in feed_data.get('jams', [])
        if j['level'] >= 4
    ]
    
    return {
        'irregularities': critical_irregularities,
        'alerts': critical_alerts,
        'jams': critical_jams
    }
```

### **Monitoreo de Límite**
```python
def check_limit(feed_data):
    total = (
        len(feed_data.get('alerts', [])) +
        len(feed_data.get('jams', [])) +
        len(feed_data.get('irregularities', []))
    )
    
    percentage = (total / 5000) * 100
    
    if total >= 5000:
        print(f"⛔ LÍMITE ALCANZADO: {total} eventos")
    elif percentage >= 90:
        print(f"⚠️ Cerca del límite: {percentage:.0f}%")
    
    return percentage
```

---

## 🚨 Alertas Críticas

### **Situaciones que Requieren Acción Inmediata:**

```
1. Irregularity con severity >= 4
   → Evento mayor confirmado

2. Alert con:
   • type = ROAD_CLOSED
   • confidence >= 7
   → Cierre de calle confiable

3. Alert con:
   • type = ACCIDENT
   • confidence >= 8
   • reliability >= 8
   → Accidente muy probable

4. Jam con:
   • level = 5
   • length > 1000m
   • delay > 600 segundos
   → Atasco severo extenso

5. Feed cerca del límite (>90%)
   → Riesgo de perder datos
```

---

## 💡 Tips y Trucos

### **Optimización**
```
✅ Hacer fetch cada 120 segundos (no más frecuente)
✅ Usar confidence + reliability para filtrar
✅ Cachear datos procesados (no el feed raw)
✅ Monitorear el límite de 5000 eventos
```

### **Detección de Cambios**
```python
# Comparar timestamps
if new_feed['endTimeMillis'] > last_processed:
    # Hay datos nuevos, procesar
    process_feed(new_feed)
```

### **Priorización**
```
1º Irregularities (eventos mayores)
2º Alerts con alta confidence (>= 7)
3º Jams críticos (level >= 4)
4º Resto de datos
```

---

## 🔍 Troubleshooting

### **Problema: Demasiados falsos positivos**
```
Solución:
• Aumentar umbral de confidence a >= 7
• Verificar reliability >= 6
• Ignorar alerts con nThumbsUp = 0 después de 10 min
```

### **Problema: Feed alcanza límite de 5000**
```
Solución:
• Dividir polígono en secciones más pequeñas
• Filtrar por tipo de evento
• Aumentar umbrales de severidad
```

### **Problema: Datos obsoletos**
```
Solución:
• Eliminar eventos con más de 30 min y confidence < 5
• Verificar timestamp del feed
• Confirmar que el fetch sea cada 120 segundos
```

---

## 📖 Documentación Completa

Para información detallada, consultar:
- **ANALISIS_COMPLETO_FEEDS_WAZE.md** - Análisis exhaustivo
- **MEJORAS_API_WAZE.md** - Mejoras implementadas
- [Waze Data Feed Specification](https://support.google.com/waze/partners/answer/10618035)

---

## ⚡ Comandos Útiles

```bash
# Obtener feed
curl "https://www.waze.com/row-partnerhub-api/partners/{id}/waze-feeds/{feed_id}" | jq

# Ver solo alerts críticas
curl "..." | jq '.alerts[] | select(.confidence >= 7)'

# Ver jams severos
curl "..." | jq '.jams[] | select(.level >= 4)'

# Contar eventos
curl "..." | jq '[.alerts, .jams, .irregularities] | map(length) | add'
```

---

**Última actualización:** Diciembre 2024  
**Para más información:** Ver ANALISIS_COMPLETO_FEEDS_WAZE.md
