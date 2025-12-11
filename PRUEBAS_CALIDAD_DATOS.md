# 🧪 Guía de Pruebas: Sistema de Calidad de Datos Waze

## 📋 Objetivo

Validar que las mejoras implementadas en la utilización de las APIs de Waze funcionan correctamente y mejoran la precisión del sistema.

---

## 🎯 Pruebas del Backend

### **1. Verificar Servicio de Calidad de Datos**

#### **Test 1.1: Evaluación de Calidad Individual**
```bash
# Endpoint: GET /api/incidents/all
curl http://localhost:3001/api/incidents/all

# Verificar que cada incidente tenga:
# - confidence (número 0-10 o undefined)
# - reliability (número 0-10 o undefined)
# - nThumbsUp (número >= 0 o undefined)

# Resultado esperado:
# ✅ Todos los campos están presentes
# ✅ Los valores están en el rango correcto
```

#### **Test 1.2: Filtrado de Baja Calidad**
```bash
# Endpoint: GET /api/data-quality/incidents/high-quality
curl http://localhost:3001/api/data-quality/incidents/high-quality

# Comparar con GET /api/incidents/all
curl http://localhost:3001/api/incidents/all

# Resultado esperado:
# ✅ high-quality tiene menos incidentes que /all
# ✅ Todos los incidentes en high-quality tienen confidence >= 7 y reliability >= 7
# ✅ Se filtraron incidentes con confidence < 2 o reliability < 2
```

#### **Test 1.3: Priorización de Incidentes**
```bash
# Endpoint: GET /api/data-quality/incidents/prioritized
curl http://localhost:3001/api/data-quality/incidents/prioritized

# Resultado esperado:
# ✅ Los primeros incidentes tienen severidad CRITICAL (4)
# ✅ Incidentes con alta calidad aparecen antes que baja calidad
# ✅ El orden es consistente entre llamadas
```

---

### **2. Verificar Métricas de Calidad**

#### **Test 2.1: Métricas Globales**
```bash
# Endpoint: GET /api/data-quality/metrics
curl http://localhost:3001/api/data-quality/metrics | jq

# Verificar respuesta:
{
  "totalIncidents": 150,
  "highQualityIncidents": 95,
  "mediumQualityIncidents": 40,
  "lowQualityIncidents": 15,
  "avgConfidence": 7.2,
  "avgReliability": 6.8,
  "filteredOutCount": 8,
  "qualityPercentage": 63
}

# Validaciones:
# ✅ totalIncidents = high + medium + low + filteredOut
# ✅ qualityPercentage = (high / (high + medium + low)) * 100
# ✅ avgConfidence y avgReliability están entre 0 y 10
```

#### **Test 2.2: Reporte Completo**
```bash
# Endpoint: GET /api/data-quality/report
curl http://localhost:3001/api/data-quality/report | jq

# Verificar estructura:
# ✅ Tiene timestamp, metrics, byPolygon, lowQualityIncidents
# ✅ byPolygon contiene métricas para cada polígono con incidentes
# ✅ lowQualityIncidents incluye reason del filtrado
```

---

### **3. Verificar Detección de Incidentes Obsoletos**

#### **Test 3.1: Incidentes Obsoletos (30 min)**
```bash
# Endpoint: GET /api/data-quality/incidents/stale?maxAge=30
curl http://localhost:3001/api/data-quality/incidents/stale?maxAge=30 | jq

# Resultado esperado:
# ✅ Solo incluye incidentes con más de 30 minutos
# ✅ Todos tienen confidence < 5
# ✅ La lista se actualiza con el tiempo
```

#### **Test 3.2: Diferentes Umbrales de Edad**
```bash
# 15 minutos
curl http://localhost:3001/api/data-quality/incidents/stale?maxAge=15

# 60 minutos
curl http://localhost:3001/api/data-quality/incidents/stale?maxAge=60

# Resultado esperado:
# ✅ maxAge=15 retorna más incidentes que maxAge=60
# ✅ Todos los incidentes en maxAge=60 también están en maxAge=15
```

---

### **4. Verificar Monitoreo del Límite de Feeds**

#### **Test 4.1: Estado del Feed**
```bash
# Endpoint: GET /api/data-quality/feed-status
curl http://localhost:3001/api/data-quality/feed-status | jq

# Verificar respuesta:
{
  "nearLimit": false,
  "atLimit": false,
  "totalEvents": 1234,
  "percentage": 25
}

# Validaciones:
# ✅ totalEvents = total de incidents + jams
# ✅ percentage = (totalEvents / 5000) * 100
# ✅ nearLimit = true si percentage >= 90
# ✅ atLimit = true si totalEvents >= 5000
```

---

### **5. Verificar Integración con Alertas**

#### **Test 5.1: Alertas Filtradas por Calidad**
```bash
# Obtener todas las alertas
curl http://localhost:3001/api/alerts | jq

# Comparar con alertas sin filtro (logs del backend)
# Buscar en logs del backend:
grep "Filtrados" backend_logs.txt

# Resultado esperado:
# ✅ Los logs muestran "🔍 Filtrados X incidentes de baja calidad"
# ✅ Las alertas se generan solo con incidentes de alta calidad
```

#### **Test 5.2: Causas de Alertas Priorizadas**
```bash
# Obtener alertas activas
curl http://localhost:3001/api/alerts | jq '.[] | select(.type == "total_blockage")'

# Verificar mensaje de alerta
# Resultado esperado:
# ✅ Los mensajes incluyen etiquetas como "(confirmado)" o "(verificado)"
# ✅ Las causas reportadas provienen de incidentes de alta calidad
```

---

### **6. Verificar Umbrales Configurables**

#### **Test 6.1: Consultar Umbrales**
```bash
# Endpoint: GET /api/data-quality/thresholds
curl http://localhost:3001/api/data-quality/thresholds | jq

# Verificar estructura:
{
  "HIGH_QUALITY": {
    "minConfidence": 7,
    "minReliability": 7,
    "minCombined": 14
  },
  "MEDIUM_QUALITY": { ... },
  "LOW_QUALITY": { ... },
  "FILTER_OUT": { ... }
}
```

#### **Test 6.2: Actualizar Umbrales**
```bash
# Endpoint: POST /api/data-quality/thresholds
curl -X POST http://localhost:3001/api/data-quality/thresholds \
  -H "Content-Type: application/json" \
  -d '{
    "HIGH_QUALITY": {
      "minConfidence": 8,
      "minReliability": 8
    }
  }'

# Verificar actualización
curl http://localhost:3001/api/data-quality/thresholds | jq '.HIGH_QUALITY'

# Resultado esperado:
# ✅ Los valores se actualizaron correctamente
# ✅ El backend registra en logs: "🔧 Umbrales de calidad actualizados"
```

---

## 🔍 Pruebas de Integración

### **7. Verificar Logs del Backend**

#### **Test 7.1: Logs de Procesamiento**
```bash
# Revisar logs durante procesamiento de feeds
tail -f backend_logs.txt

# Buscar líneas específicas:
# ✅ "📊 Calidad de datos: X% alta calidad"
# ✅ "🔍 Filtrados X incidentes de baja calidad"
# ✅ "🕐 X incidentes probablemente obsoletos"
# ✅ "⚠️ Cerca del límite: X eventos (Y%)"
```

#### **Test 7.2: Verificar Frecuencia de Logs**
```bash
# Los logs de calidad deben aparecer cada 120 segundos (2 minutos)
grep "Calidad de datos" backend_logs.txt | tail -10

# Resultado esperado:
# ✅ Hay entradas cada ~2 minutos
# ✅ Los porcentajes de calidad varían con el tiempo
```

---

### **8. Pruebas de Carga**

#### **Test 8.1: Múltiples Requests Simultáneos**
```bash
# Ejecutar 10 requests simultáneos
for i in {1..10}; do
  curl http://localhost:3001/api/data-quality/metrics &
done
wait

# Resultado esperado:
# ✅ Todas las requests completan sin error
# ✅ Los valores son consistentes entre requests
# ✅ El tiempo de respuesta es < 100ms
```

#### **Test 8.2: Stress Test de Endpoints**
```bash
# Usar herramienta como Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/data-quality/metrics

# Resultado esperado:
# ✅ 0% de requests fallidos
# ✅ Tiempo promedio < 50ms
# ✅ Sin memory leaks
```

---

## 📊 Pruebas de Validación de Datos

### **9. Verificar Consistencia de Datos**

#### **Test 9.1: Suma de Categorías**
```bash
# Obtener métricas
curl http://localhost:3001/api/data-quality/metrics | jq

# Validar manualmente:
total = high + medium + low + filteredOut

# Usar calculadora o script:
echo "95 + 40 + 15 + 8" | bc  # Debe igualar totalIncidents
```

#### **Test 9.2: Porcentaje de Calidad**
```bash
# Calcular manualmente:
qualityPercentage = (high / (high + medium + low)) * 100

# Ejemplo:
# high = 95, medium = 40, low = 15
# (95 / 150) * 100 = 63.33%

# Comparar con API:
curl http://localhost:3001/api/data-quality/metrics | jq '.qualityPercentage'
```

---

### **10. Verificar Lógica de Filtrado**

#### **Test 10.1: Casos Extremos**

**Caso 1: Incidente con confidence = 0**
```json
{
  "id": "test-1",
  "confidence": 0,
  "reliability": 10,
  ...
}

# Resultado esperado:
# ✅ Se filtra (confidence < 2)
```

**Caso 2: Incidente con reliability = 0**
```json
{
  "id": "test-2",
  "confidence": 10,
  "reliability": 0,
  ...
}

# Resultado esperado:
# ✅ Se filtra (reliability < 2)
```

**Caso 3: Incidente sin confidence/reliability**
```json
{
  "id": "test-3",
  "confidence": undefined,
  "reliability": undefined,
  ...
}

# Resultado esperado:
# ✅ Se trata como calidad media (default 5/5)
# ✅ No se filtra
```

---

## 🎯 Pruebas de Escenarios Reales

### **11. Escenario 1: Alta Calidad de Datos**

**Condiciones:**
- 90% de incidentes con confidence >= 7
- 85% de incidentes con reliability >= 7

**Pruebas:**
```bash
curl http://localhost:3001/api/data-quality/metrics

# Resultado esperado:
# ✅ qualityPercentage >= 80%
# ✅ filteredOutCount < 5%
# ✅ avgConfidence >= 7
# ✅ avgReliability >= 7
```

---

### **12. Escenario 2: Baja Calidad de Datos**

**Condiciones:**
- 30% de incidentes con confidence < 4
- 40% de incidentes con reliability < 4

**Pruebas:**
```bash
curl http://localhost:3001/api/data-quality/metrics

# Resultado esperado:
# ✅ qualityPercentage < 50%
# ✅ filteredOutCount >= 10%
# ✅ Logs muestran advertencia: "⚠️ Calidad de datos por debajo del 50%"
```

---

### **13. Escenario 3: Cerca del Límite de Waze**

**Condiciones:**
- Total de eventos (incidents + jams) >= 4500

**Pruebas:**
```bash
curl http://localhost:3001/api/data-quality/feed-status

# Resultado esperado:
# ✅ nearLimit = true
# ✅ percentage >= 90
# ✅ Logs muestran: "⚠️ Cerca del límite: X eventos (Y%)"
```

---

### **14. Escenario 4: Límite Alcanzado**

**Condiciones:**
- Total de eventos >= 5000

**Pruebas:**
```bash
curl http://localhost:3001/api/data-quality/feed-status

# Resultado esperado:
# ✅ atLimit = true
# ✅ percentage = 100
# ✅ Logs muestran: "⚠️ LÍMITE ALCANZADO: 5000 eventos"
```

---

## 📈 Métricas de Éxito

### **Criterios de Aceptación:**

| Métrica | Valor Objetivo | Estado |
|---------|----------------|--------|
| **Uptime de APIs** | 99.9% | ⏳ |
| **Tiempo de respuesta** | < 100ms | ⏳ |
| **Precisión de filtrado** | 95%+ | ⏳ |
| **Consistencia de datos** | 100% | ⏳ |
| **Detección de obsoletos** | 100% | ⏳ |
| **Falsos positivos** | < 10% | ⏳ |

---

## 🐛 Troubleshooting

### **Problema 1: Métricas no se actualizan**

**Diagnóstico:**
```bash
# Verificar que el backend esté procesando feeds
grep "Feed procesado" backend_logs.txt | tail -5

# Verificar última actualización
curl http://localhost:3001/health | jq '.lastWazeUpdate'
```

**Solución:**
- Verificar que WazeService esté corriendo
- Verificar conectividad con APIs de Waze
- Revisar logs de errores

---

### **Problema 2: Porcentajes no suman correctamente**

**Diagnóstico:**
```bash
# Obtener métricas y validar manualmente
curl http://localhost:3001/api/data-quality/metrics | jq

# Calcular:
# total = high + medium + low + filtered
# percentage = (high / (high + medium + low)) * 100
```

**Solución:**
- Verificar que la suma sea correcta
- Si no coincide, hay un bug en el cálculo
- Revisar código en `dataQualityService.ts`

---

### **Problema 3: Todos los incidentes se filtran**

**Diagnóstico:**
```bash
# Verificar umbrales
curl http://localhost:3001/api/data-quality/thresholds | jq '.FILTER_OUT'

# Verificar datos raw
curl http://localhost:3001/api/incidents/all | jq '.[] | {id, confidence, reliability}'
```

**Solución:**
- Los umbrales pueden estar muy estrictos
- Ajustar umbrales con POST /thresholds
- Verificar que los datos de Waze incluyan confidence/reliability

---

## ✅ Checklist de Validación

### **Backend:**
- [ ] Todos los endpoints responden correctamente
- [ ] Métricas son precisas y consistentes
- [ ] Filtrado funciona según umbrales
- [ ] Priorización ordena correctamente
- [ ] Detección de obsoletos es precisa
- [ ] Monitoreo de límite es correcto
- [ ] Logs muestran información relevante
- [ ] Umbrales son configurables

### **Integración:**
- [ ] AlertService usa datos filtrados
- [ ] WazeService reporta calidad en logs
- [ ] Causas de alertas están priorizadas
- [ ] No hay degradación de performance

### **Datos:**
- [ ] Sumas y porcentajes son correctos
- [ ] Datos son consistentes entre endpoints
- [ ] Casos extremos se manejan correctamente
- [ ] Sin memory leaks o errores

---

## 📝 Registro de Pruebas

### **Plantilla de Registro:**

```markdown
## Prueba: [Nombre]
**Fecha:** [YYYY-MM-DD HH:MM]
**Ejecutor:** [Nombre]
**Entorno:** [Desarrollo/Staging/Producción]

### Setup:
- Backend version: [X.X.X]
- Total incidentes: [N]
- Total jams: [M]

### Pasos:
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

### Resultados:
- ✅ [Resultado esperado 1]
- ✅ [Resultado esperado 2]
- ❌ [Resultado fallido]

### Observaciones:
[Notas adicionales]

### Estado: ✅ PASS / ❌ FAIL / ⚠️ PARCIAL
```

---

## 🚀 Próximos Pasos

1. **Completar todas las pruebas del checklist**
2. **Documentar resultados**
3. **Ajustar umbrales según datos reales**
4. **Implementar integración frontend**
5. **Realizar pruebas de usuario**

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024
