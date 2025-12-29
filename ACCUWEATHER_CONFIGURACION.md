# Configuración de AccuWeather API

## Descripción

El sistema ahora soporta **AccuWeather** como proveedor de datos meteorológicos, proporcionando información más precisa y detallada que Open-Meteo. El sistema incluye un fallback automático a Open-Meteo si AccuWeather no está disponible o falla.

## Ventajas de AccuWeather

- ✅ **Mayor precisión**: Datos meteorológicos más confiables y actualizados
- ✅ **Detección de lluvia**: Información más precisa sobre precipitación actual
- ✅ **Datos detallados**: Incluye visibilidad, humedad, y condiciones más específicas
- ✅ **Cobertura global**: Datos precisos para Córdoba y toda Argentina

## Configuración

### 1. Obtener API Key de AccuWeather

1. Visita: https://developer.accuweather.com/
2. Crea una cuenta (requiere plan de pago)
3. Crea una nueva aplicación
4. Copia tu **API Key**

### 2. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env` en el directorio `backend/`:

```env
# Proveedor de clima: 'accuweather' o 'openmeteo'
WEATHER_PROVIDER=accuweather

# API Key de AccuWeather (obligatorio si usas accuweather)
ACCUWEATHER_API_KEY=tu_api_key_aqui
```

### 3. Reiniciar el Servidor

Después de configurar las variables de entorno, reinicia el servidor backend:

```bash
cd backend
npm run dev
```

## Funcionamiento

### Sistema de Fallback

El sistema funciona de la siguiente manera:

1. **Si `WEATHER_PROVIDER=accuweather` y `ACCUWEATHER_API_KEY` está configurada:**
   - Intenta obtener datos de AccuWeather
   - Si AccuWeather falla, automáticamente usa Open-Meteo como fallback

2. **Si `WEATHER_PROVIDER=openmeteo` o no está configurado:**
   - Usa Open-Meteo directamente (gratuito, sin API key)

### Logs de Diagnóstico

El sistema registra información detallada en los logs:

- `🌤️ AccuWeather data for [polygon_id]:` - Datos recibidos de AccuWeather
- `🌧️ LLUVIA DETECTADA (AccuWeather) en [polygon_id]:` - Cuando se detecta lluvia
- `⚠️ AccuWeather falló para [polygon_id], usando Open-Meteo como fallback` - Fallback automático

## Comparación de Datos

### AccuWeather proporciona:
- Temperatura actual y sensación térmica
- Precipitación actual y última hora
- Tipo de precipitación (lluvia, nieve, etc.)
- Visibilidad en kilómetros
- Humedad relativa
- Cobertura de nubes
- Velocidad y dirección del viento
- Ráfagas de viento
- Descripción textual del clima en español

### Open-Meteo proporciona:
- Temperatura y sensación térmica
- Precipitación acumulada
- Código WMO del clima
- Visibilidad (si está disponible)
- Velocidad del viento

## Costos

⚠️ **Importante**: AccuWeather es un servicio de pago. Revisa los planes disponibles en:
https://developer.accuweather.com/packages

Los planes típicamente incluyen:
- **Free Trial**: Limitado (solo para pruebas)
- **Standard**: Para uso comercial con límites de llamadas
- **Enterprise**: Para uso intensivo

## Solución de Problemas

### Error: "ACCUWEATHER_API_KEY no está definida"
- Verifica que la variable esté en el archivo `.env`
- Asegúrate de que el archivo `.env` esté en el directorio `backend/`
- Reinicia el servidor después de agregar la variable

### Error: "AccuWeather API error: 401"
- Verifica que tu API Key sea válida
- Asegúrate de que tu cuenta de AccuWeather esté activa
- Revisa los límites de tu plan

### Error: "No se pudo obtener location key"
- Verifica que las coordenadas sean válidas
- AccuWeather puede tener limitaciones de cobertura en algunas áreas
- El sistema automáticamente usará Open-Meteo como fallback

## Migración desde Open-Meteo

Si ya estás usando Open-Meteo, puedes migrar a AccuWeather sin cambios en el código:

1. Agrega las variables de entorno
2. Reinicia el servidor
3. El sistema automáticamente comenzará a usar AccuWeather
4. Los datos se guardan en la misma estructura de base de datos

## Verificación

Para verificar que AccuWeather está funcionando:

1. Revisa los logs del backend al iniciar
2. Busca mensajes como `🌤️ AccuWeather data for...`
3. Verifica en la base de datos que los datos de clima se están actualizando:
   ```sql
   SELECT polygon_id, timestamp, weather_description, precipitation_mm, rain_mm
   FROM polygon_weather_data
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

## Notas Adicionales

- El sistema mantiene compatibilidad total con Open-Meteo
- Puedes cambiar entre proveedores simplemente cambiando `WEATHER_PROVIDER`
- Los datos se normalizan al mismo formato independientemente del proveedor
- El fallback automático asegura que el sistema siempre tenga datos de clima

