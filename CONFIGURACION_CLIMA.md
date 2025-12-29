# 🌤️ Configuración de Proveedores de Clima

## Estado Actual

El sistema está configurado para usar **Open-Meteo** por defecto (gratuito). También soporta **AccuWeather** para mayor precisión.

## Configuración Rápida

### Opción 1: Usar Open-Meteo (Actual - Gratuito)

El sistema ya está configurado para usar Open-Meteo. No requiere configuración adicional.

**Ventajas:**
- ✅ Gratuito
- ✅ Sin límites de uso
- ✅ Funciona inmediatamente

**Desventajas:**
- ⚠️ Puede tener menor precisión en algunos casos
- ⚠️ Datos de precipitación pueden no ser tan precisos

### Opción 2: Usar AccuWeather (Recomendado para mayor precisión)

#### Paso 1: Obtener API Key

1. Visita: https://developer.accuweather.com/
2. Crea una cuenta (requiere plan de pago)
3. Crea una nueva aplicación
4. Copia tu **API Key**

#### Paso 2: Configurar Variables de Entorno

Edita el archivo `backend/.env` y agrega:

```env
# Configuración de Clima
WEATHER_PROVIDER=accuweather
ACCUWEATHER_API_KEY=tu_api_key_aqui
```

#### Paso 3: Reiniciar el Servidor

```bash
cd backend
npm run dev
```

## Script de Configuración Automática

También puedes usar el script interactivo:

```bash
cd backend
npx ts-node scripts/setup-accuweather.ts
```

Este script te guiará paso a paso para configurar AccuWeather.

## Verificación

### Verificar que está funcionando:

1. **Revisa los logs al iniciar el servidor:**
   ```
   🌤️ Proveedor de clima configurado: accuweather
   ✅ AccuWeather API Key configurada
   ```

2. **Busca en los logs cuando se obtiene clima:**
   ```
   🌤️ AccuWeather data for [polygon_id]: ...
   🌧️ LLUVIA DETECTADA (AccuWeather) en [polygon_id]: ...
   ```

3. **Verifica en la base de datos:**
   ```sql
   SELECT polygon_id, timestamp, weather_description, precipitation_mm, rain_mm
   FROM polygon_weather_data
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

## Fallback Automático

El sistema tiene un **fallback automático**:
- Si AccuWeather está configurado pero falla, automáticamente usa Open-Meteo
- Si AccuWeather no está configurado, usa Open-Meteo directamente
- No hay interrupciones en el servicio

## Comparación de Proveedores

| Característica | Open-Meteo | AccuWeather |
|----------------|------------|-------------|
| Costo | Gratuito | De pago |
| Precisión | Buena | Excelente |
| Detección de lluvia | Basada en códigos WMO | Basada en datos reales |
| Visibilidad | Limitada | Completa |
| Humedad | No | Sí |
| Actualización | Cada hora aprox. | En tiempo real |
| Cobertura | Global | Global (mejor para Argentina) |

## Solución de Problemas

### Error: "ACCUWEATHER_API_KEY no está definida"
- Verifica que la variable esté en `backend/.env`
- Asegúrate de que no tenga espacios extra
- Reinicia el servidor después de agregar la variable

### Error: "AccuWeather API error: 401"
- Verifica que tu API Key sea válida
- Asegúrate de que tu cuenta esté activa
- Revisa los límites de tu plan

### Error: "No se pudo obtener location key"
- Verifica que las coordenadas sean válidas
- AccuWeather puede tener limitaciones en algunas áreas
- El sistema automáticamente usará Open-Meteo como fallback

## Estado Actual del Sistema

- ✅ Código implementado y compilando correctamente
- ✅ Fallback automático configurado
- ✅ Logging detallado para diagnóstico
- ✅ Compatible con ambos proveedores
- ⚠️ **Pendiente**: Agregar API Key de AccuWeather al `.env` si deseas usarlo

## Próximos Pasos

1. **Si quieres usar AccuWeather:**
   - Obtén tu API Key de https://developer.accuweather.com/
   - Agrega `WEATHER_PROVIDER=accuweather` y `ACCUWEATHER_API_KEY=tu_key` al `.env`
   - Reinicia el servidor

2. **Si prefieres Open-Meteo:**
   - No necesitas hacer nada, ya está configurado
   - El sistema funcionará automáticamente

