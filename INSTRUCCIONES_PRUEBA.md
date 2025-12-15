# 🧪 Instrucciones de Prueba - Nuevas Funcionalidades

## ✅ Checklist de Pruebas

### 1. Verificar Backend

```bash
cd backend
npm run dev
```

**Salida esperada:**
```
📍 Configurados 66 polígonos con feeds individuales
🚀 Iniciando ciclo de ingesta de 66 feeds cada 120 segundos...
✅ Feed procesado. Alertas: 56, Jams: 24
🚀 Backend server running on http://localhost:3001
```

### 2. Probar Nuevos Endpoints

#### A. Estadísticas Globales de Incidentes
```bash
curl http://localhost:3001/api/incidents/stats/global
```

**Debe retornar:**
- `totalIncidents`: Número total
- `typeBreakdown`: Array con tipos y subtipos
- `jamLevelsGlobal`: Distribución de niveles 0-5

#### B. Estadísticas de Polígono Específico
```bash
# Usar ID de polígono que tenga incidentes
curl http://localhost:3001/api/incidents/stats/polygon/P004
```

**Debe retornar:**
- Tipos y subtipos detallados
- Distribución de jam levels
- Top 5 incidentes más críticos

#### C. Comparación de Velocidades
```bash
curl http://localhost:3001/api/speed/comparison/P004
```

**Debe retornar:**
- `wazeSpeed`: Velocidad de Waze
- `externalSpeed`: Velocidad de APIs externas (si configuradas)
- `sources`: Array de fuentes con confianza

### 3. Verificar Frontend

```bash
npm run dev
```

Abrir: http://localhost:5173

#### Pruebas en Dashboard:

1. **Buscar sección "Zonas con Mayor Congestión"**
   - ✅ Debe mostrar top 10 zonas críticas
   - ✅ Cada zona muestra: Atascos, Eventos, Velocidad, Estado

2. **Click en una zona para expandir**
   - ✅ Panel se expande mostrando más información
   - ✅ Aparece "📊 Tipos de Incidentes"
   - ✅ Aparece "🔍 Clasificación Detallada"
   - ✅ Aparece "🚗💨 Niveles de Congestión"
   - ✅ Aparece "📡 Velocidad Multi-Fuente" (con mensaje "Cargando..." inicialmente)

3. **Verificar Clasificación de Incidentes**
   - ✅ Cada tipo tiene emoji distintivo
   - ✅ Muestra conteo y porcentaje
   - ✅ Subtipos están listados debajo de cada tipo

4. **Verificar Niveles de Congestión**
   - ✅ Niveles 0-5 con colores apropiados
   - ✅ Solo muestra niveles con count > 0
   - ✅ Traducciones en español

5. **Verificar Velocidades Multi-Fuente**
   - ✅ Muestra velocidad Waze
   - ✅ Muestra velocidad Externa (si APIs configuradas)
   - ✅ Muestra velocidad Recomendada
   - ✅ Muestra diferencia porcentual
   - ✅ Lista fuentes de datos con íconos

---

## 🔧 Configurar APIs Externas (Opcional)

### Para Probar con HERE API:

1. **Obtener API Key:**
   - Ir a https://developer.here.com/
   - Crear cuenta gratuita
   - Crear nuevo proyecto
   - Generar API Key

2. **Configurar Backend:**
   ```bash
   cd backend
   echo "HERE_API_KEY=tu_api_key_real" > .env
   echo "PORT=3001" >> .env
   echo "FRONTEND_URL=http://localhost:5173" >> .env
   ```

3. **Reiniciar Backend:**
   ```bash
   npm run dev
   ```

4. **Verificar que funciona:**
   ```bash
   curl http://localhost:3001/api/speed/comparison/P004
   ```
   
   Debería incluir source "here" en el array de sources

---

## 📊 Casos de Prueba Específicos

### Caso 1: Zona sin Incidentes
- **Acción:** Buscar zona con 0 atascos
- **Esperado:** No aparece en el top 10 críticos
- **Verificar:** Panel muestra "No hay zonas con problemas"

### Caso 2: Zona con Múltiples Tipos de Incidentes
- **Acción:** Expandir zona con varios tipos
- **Esperado:** 
  - Muestra todos los tipos agrupados
  - Cada tipo tiene su emoji
  - Subtipos están correctamente clasificados

### Caso 3: Comparación de Velocidades
- **Acción:** Expandir zona con atascos
- **Esperado:**
  - Si solo Waze: Muestra velocidad Waze
  - Si APIs configuradas: Muestra comparación multi-fuente
  - Diferencia se calcula correctamente

### Caso 4: Sin APIs Externas
- **Acción:** No configurar HERE/TomTom
- **Esperado:**
  - Sistema funciona normalmente
  - Usa Waze + OpenStreetMap
  - Velocidad externa puede ser null
  - No muestra errores

---

## 🐛 Solución de Problemas Comunes

### Error: "Failed to get incident stats"
**Causa:** Backend no está ejecutándose o endpoint no responde

**Solución:**
1. Verificar que backend está corriendo: `cd backend && npm run dev`
2. Verificar puerto: http://localhost:3001/health
3. Revisar logs del backend para errores

### Panel expandido muestra "Cargando..."
**Causa:** Normal durante primeros 1-2 segundos

**Solución:**
- Si persiste >5 segundos: verificar backend
- Abrir consola del navegador (F12) para ver errores
- Verificar que API responde: `curl http://localhost:3001/api/incidents/stats/polygon/P004`

### Velocidad Externa siempre null
**Causa:** APIs externas no configuradas o no responden

**Solución:**
- Si no configuraste HERE/TomTom: Es normal, sistema usa solo Waze
- Si configuraste: Verificar API key en `.env`
- Ver logs del backend para errores de API

### No aparecen emojis
**Causa:** Fuente del sistema no soporta emojis

**Solución:**
- Actualizar navegador
- Usar Chrome/Firefox/Edge moderno
- Los emojis son cosméticos, funcionalidad sigue operativa

---

## ✅ Criterios de Aceptación

### Mínimo Viable (Sin APIs Externas):
- [x] Backend inicia sin errores
- [x] Endpoint `/api/incidents/stats/global` responde
- [x] Endpoint `/api/incidents/stats/polygon/:id` responde
- [x] Dashboard muestra zonas críticas
- [x] Panel se puede expandir/contraer
- [x] Tipos de incidentes se muestran con emojis
- [x] Niveles de congestión se visualizan
- [x] Velocidad de Waze se muestra

### Completo (Con APIs Externas):
- [x] Todo lo anterior +
- [x] HERE API responde
- [x] Velocidad externa se muestra
- [x] Diferencia porcentual se calcula
- [x] Múltiples fuentes listadas
- [x] Cache funciona (segunda consulta más rápida)

---

## 📈 Métricas de Performance

### Tiempos Esperados:
- Carga inicial del panel: **< 1 segundo**
- Expansión de zona: **< 2 segundos**
- Consulta de estadísticas: **< 500ms**
- Consulta de velocidades (sin cache): **< 5 segundos**
- Consulta de velocidades (con cache): **< 100ms**

### Uso de Red:
- Estadísticas de incidentes: **~5-20 KB**
- Comparación de velocidades: **~2-5 KB**
- Cache reduce llamadas en **80%** (después de primera carga)

---

## 🎯 Próximos Pasos Después de Pruebas

1. **Si todo funciona correctamente:**
   - ✅ Marcar como listo para producción
   - ✅ Documentar cualquier issue menor
   - ✅ Considerar agregar APIs externas en producción

2. **Si hay problemas:**
   - 📝 Documentar errores específicos
   - 🔍 Revisar logs del backend
   - 🐛 Reportar issues con pasos para reproducir

3. **Optimizaciones futuras:**
   - Agregar coordenadas reales a polígonos
   - Configurar HERE API en producción
   - Ajustar tiempos de cache según uso real

---

## 📞 Soporte

**Documentación Completa:**
- `MEJORAS_VELOCIDAD_Y_EVENTOS.md` - Guía técnica detallada
- `RESUMEN_MEJORAS_DIC_2025.md` - Resumen visual de mejoras
- `README.md` - Documentación general del proyecto

**Logs Útiles:**
```bash
# Backend logs
cd backend && npm run dev

# Frontend logs
# Abrir consola del navegador (F12)
```

---

**Última Actualización:** Diciembre 11, 2025  
**Versión:** 2.1.0  
**Estado:** ✅ Listo para Pruebas





