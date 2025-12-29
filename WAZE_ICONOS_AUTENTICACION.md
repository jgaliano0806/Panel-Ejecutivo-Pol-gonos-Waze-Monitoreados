# 🔐 Autenticación para Iconos de Waze Partner Hub

## 📋 Situación Actual

Los iconos `pothole.svg` y `weather.svg` del Partner Hub de Waze retornan **403 Forbidden** cuando se intentan cargar desde:
```
https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons/alerts/{icono}.svg
```

## 🔍 Análisis de la Arquitectura de Waze

### 1. **Feeds de Datos (Funcionan con autenticación)**
Los feeds de datos de Waze usan autenticación mediante **partner-id** y **token** en la URL:

```
https://www.waze.com/partnerhub-api/partners/{partner-id}/waze-feeds/{token}?format=1
```

**Ejemplo del proyecto:**
- Partner ID: `11387019565`
- Token: `9d7b4de5-3e05-4416-b6f0-7608008c797c` (único por feed)

### 2. **Iconos (Sin autenticación aparente)**
Los iconos están en un dominio diferente y NO usan el mismo sistema:

```
https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons/alerts/{icono}.svg
```

**Observaciones:**
- ❌ No incluyen `partner-id` ni `token` en la URL
- ❌ Están en un dominio diferente (`web-assets.waze.com` vs `waze.com`)
- ❌ Algunos iconos funcionan (hazard, accident, jam, etc.)
- ❌ Otros dan 403 (pothole, weather)

## 🔐 Opciones para Acceder a los Iconos Protegidos

### **Opción 1: Cookies de Sesión del Partner Hub** ⭐ (Más probable)

Los iconos protegidos probablemente requieren **cookies de sesión** de un usuario autenticado en el Partner Hub.

**Cómo funciona:**
1. Un usuario se autentica en `https://www.waze.com/partnerhub`
2. El navegador guarda cookies de sesión
3. Las solicitudes a `web-assets.waze.com` incluyen estas cookies automáticamente
4. El servidor valida las cookies y permite acceso a iconos protegidos

**Implementación:**
```typescript
// En el backend, hacer fetch con cookies de sesión
const response = await fetch(iconUrl, {
    headers: {
        'Cookie': 'session_cookie=valor; other_cookie=valor'
    }
});
```

**Limitaciones:**
- ⚠️ Las cookies expiran
- ⚠️ Requieren mantener sesión activa
- ⚠️ No es ideal para aplicaciones serverless

### **Opción 2: Headers de Autenticación HTTP**

Algunos recursos pueden requerir headers específicos:

```typescript
const response = await fetch(iconUrl, {
    headers: {
        'Authorization': 'Bearer {token}',
        'X-Partner-ID': '{partner-id}',
        'Referer': 'https://www.waze.com/partnerhub'
    }
});
```

### **Opción 3: Proxy en el Backend** ⭐⭐ (Recomendado)

Crear un endpoint en el backend que actúe como proxy y maneje la autenticación:

```typescript
// backend/src/server.ts
server.get('/api/icons/:iconName', async (request, reply) => {
    const { iconName } = request.params;
    const iconUrl = `https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons/alerts/${iconName}.svg`;

    try {
        // Intentar con autenticación si está disponible
        const response = await axios.get(iconUrl, {
            headers: {
                'Cookie': process.env.WAZE_SESSION_COOKIE || '',
                'Referer': 'https://www.waze.com/partnerhub'
            },
            responseType: 'arraybuffer'
        });

        reply.type('image/svg+xml');
        return Buffer.from(response.data);
    } catch (error) {
        // Fallback a hazard.svg si falla
        const fallback = await axios.get(`${WAZE_ICON_BASE}/hazard.svg`);
        reply.type('image/svg+xml');
        return Buffer.from(fallback.data);
    }
});
```

### **Opción 4: Usar SVG Inline Personalizados** ⭐⭐⭐ (Actual - Más simple)

Ya implementado: usar SVGs inline personalizados para iconos no disponibles.

**Ventajas:**
- ✅ No requiere autenticación
- ✅ Funciona offline
- ✅ Control total sobre el diseño
- ✅ Sin dependencias externas

**Implementación actual:**
```typescript
// En wazeIcons.ts - usar SVG inline para pothole
const potholeSvg = WAZE_ICONS_SVG['pothole'];
const encodedSvg = encodeURIComponent(potholeSvg);
return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
```

## 📝 Pasos para Implementar Autenticación (Si es necesario)

### 1. **Obtener Credenciales del Partner Hub**

1. Acceder a `https://www.waze.com/partnerhub`
2. Iniciar sesión con cuenta de CASISA
3. Abrir DevTools → Network → Cargar un icono protegido
4. Revisar los headers de la solicitud exitosa:
   - Cookies
   - Authorization headers
   - Referer

### 2. **Configurar Variables de Entorno**

```bash
# backend/.env
WAZE_SESSION_COOKIE=session_id=xxx; csrf_token=yyy
WAZE_PARTNER_ID=11387019565
WAZE_API_TOKEN=token-si-existe
```

### 3. **Implementar Proxy de Iconos**

Ver código en "Opción 3" arriba.

### 4. **Actualizar Frontend**

```typescript
// En lugar de:
const iconUrl = getWazePartnerHubIconUrl(type, subtype);

// Usar:
const iconUrl = `/api/icons/${iconName}`;
```

## 🎯 Recomendación

**Mantener la solución actual (SVG inline)** porque:

1. ✅ **No requiere autenticación** - Funciona sin credenciales
2. ✅ **Más confiable** - No depende de cookies que expiran
3. ✅ **Mejor rendimiento** - No requiere requests HTTP adicionales
4. ✅ **Control total** - Podemos personalizar los iconos
5. ✅ **Funciona offline** - Los iconos están embebidos

**Solo considerar autenticación si:**
- Waze requiere iconos oficiales específicos
- Hay requisitos de branding estrictos
- Los iconos personalizados no son aceptables

## 🔗 Recursos

- [Waze Partner Hub](https://www.waze.com/partnerhub)
- [Waze for Cities Documentation](https://developers.google.com/waze/data-feed)
- Partner ID del proyecto: `11387019565`

## 📞 Contacto

Para obtener acceso a iconos protegidos, contactar al soporte de Waze Partner Hub:
- Email: partners@waze.com
- Portal: https://www.waze.com/partnerhub

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd")
**Estado:** Usando SVG inline personalizados (solución recomendada)

