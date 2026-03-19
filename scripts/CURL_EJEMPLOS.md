# Ejemplos de cURL para la API

## Kilómetros

**GET activos (público, sin token):**
```bash
curl -s "http://10.1.0.136:3002/api/kilometers?active=true" -H "Accept: application/json"
```

**GET con token (opcional para este endpoint):**
```bash
curl -s "http://10.1.0.136:3002/api/kilometers?active=true" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Accept: application/json"
```

**GET con más parámetros:**
```bash
# Por grupo
curl -s "http://10.1.0.136:3002/api/kilometers?active=true&group_id=1"

# Búsqueda por nombre
curl -s "http://10.1.0.136:3002/api/kilometers?search=RN36"

# Paginado
curl -s "http://10.1.0.136:3002/api/kilometers?limit=50&offset=0"
```

## Variables de entorno (recomendado)

```bash
export API_URL="http://10.1.0.136:3002"
export JWT_TOKEN="eyJ..."

curl -s "$API_URL/api/kilometers?active=true" -H "Authorization: Bearer $JWT_TOKEN"
```
