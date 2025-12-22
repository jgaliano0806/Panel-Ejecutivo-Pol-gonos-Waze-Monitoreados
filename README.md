# 🚦 Panel Ejecutivo - Polígonos Waze Monitoreados

<p align="center">
  <img src="public/logo_cs.png" alt="Caminos de las Sierras" width="200"/>
</p>

<p align="center">
  <strong>Sistema de monitoreo de tráfico en tiempo real para la red vial de Córdoba</strong>
</p>

<p align="center">
  <a href="#características">Características</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#desarrollo">Desarrollo</a> •
  <a href="#producción">Producción</a> •
  <a href="#api">API</a>
</p>

---

## 📋 Descripción

Panel ejecutivo que muestra información de tráfico en tiempo real para los polígonos monitoreados de la red vial de Caminos de las Sierras, utilizando datos de la API de Waze.

### Stack Tecnológico

| Frontend | Backend | DevOps |
|----------|---------|--------|
| React 19 | Fastify 5 | Docker |
| TypeScript 5.9 | Node.js 20 | GitHub Actions |
| Tailwind CSS 3.4 | TypeScript | Nginx |
| Vite 7 | Waze API | Playwright |
| React Query 5 | | |

---

## ✨ Características

- 📊 **Dashboard ejecutivo** con KPIs en tiempo real
- 🗺️ **Mapa interactivo** con polígonos y eventos
- 🚨 **Sistema de alertas** por severidad
- 📈 **Gráficos de tendencias** (últimas 24h)
- 🔄 **Actualización automática** cada 30 segundos
- 📱 **Diseño responsive** (mobile, tablet, desktop)
- ⚡ **Optimizado para performance** (lazy loading, memoización)

---

## 🚀 Instalación

### Requisitos Previos

- Node.js 20+
- npm 10+
- Git
- API Key de Google Maps (opcional, para mapa)

### Clonar el Repositorio

```bash
git clone https://github.com/your-org/panel-ejecutivo-waze.git
cd panel-ejecutivo-waze
```

### Instalar Dependencias

```bash
# Frontend
npm install

# Backend
cd backend && npm install && cd ..
```

### Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus valores
# VITE_GOOGLE_MAPS_API_KEY=tu_api_key
```

---

## 💻 Desarrollo

### Iniciar Servidores de Desarrollo

```bash
# Opción 1: Iniciar ambos servidores
npm run start:all

# Opción 2: Iniciar por separado
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

### URLs de Desarrollo

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo frontend
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Ejecutar ESLint
npm run lint:fix     # Corregir errores de ESLint
npm run typecheck    # Verificar tipos TypeScript
npm run test:e2e     # Tests E2E con Playwright
npm run test:e2e:ui  # Tests E2E con interfaz gráfica
npm run clean        # Limpiar cache y builds
```

---

## 🧪 Testing

### Ejecutar Tests E2E

```bash
# Instalar browsers de Playwright (primera vez)
npx playwright install

# Ejecutar todos los tests
npm run test:e2e

# Ejecutar con interfaz gráfica
npm run test:e2e:ui

# Ejecutar en modo headed (ver navegador)
npm run test:e2e:headed
```

### Estructura de Tests

```
tests/
├── e2e/
│   ├── dashboard.spec.ts    # Tests del dashboard
│   └── api.spec.ts          # Tests de la API
└── fixtures/                # Datos de prueba
```

---

## 🏭 Producción

### Build Local

```bash
# Build de producción
npm run build

# Preview del build
npm run preview
```

### Docker

```bash
# Build de imagen
docker build -t panel-waze .

# Ejecutar contenedor
docker run -p 80:80 -p 3001:3001 \
  -e VITE_GOOGLE_MAPS_API_KEY=tu_key \
  panel-waze
```

### Docker Compose

```bash
# Producción
docker-compose --profile prod up -d

# Desarrollo
docker-compose --profile dev up
```

### Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_GOOGLE_MAPS_API_KEY` | API Key de Google Maps | No* |
| `VITE_API_URL` | URL del backend | No |
| `PORT` | Puerto del backend | No (default: 3001) |
| `NODE_ENV` | Entorno | No |
| `FRONTEND_URL` | URL del frontend (CORS) | No |

*Sin API Key, el mapa mostrará errores.

---

## 🔌 API

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor |
| GET | `/api/polygons` | Lista de polígonos con métricas |
| GET | `/api/polygons/:id` | Detalle de un polígono |
| GET | `/api/incidents/all` | Todos los incidentes activos |
| GET | `/api/jams/all` | Todos los jams activos |
| GET | `/api/alerts/active` | Alertas activas |
| GET | `/api/alerts/stats` | Estadísticas de alertas |
| GET | `/api/kpis/global` | KPIs globales |
| GET | `/api/historical/global` | Datos históricos |
| GET | `/api/trends` | Tendencias y predicciones |

### Ejemplo de Respuesta

```json
// GET /api/polygons
[
  {
    "id": "polygon-1",
    "name": "Centro",
    "group": "urbano",
    "state": "low",
    "metrics": {
      "alertCount": 5,
      "jamCount": 3,
      "totalDelay": 120,
      "avgSpeed": 45
    }
  }
]
```

---

## 📁 Estructura del Proyecto

```
panel-ejecutivo-waze/
├── backend/               # Servidor Fastify
│   ├── src/
│   │   ├── config/       # Configuración de polígonos
│   │   ├── services/     # Servicios de negocio
│   │   ├── types/        # Tipos TypeScript
│   │   └── server.ts     # Entry point
│   └── data/             # Datos históricos
├── src/                  # Frontend React
│   ├── components/       # Componentes UI
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Páginas
│   ├── types/            # Tipos
│   └── utils/            # Utilidades
├── tests/                # Tests E2E
├── docker/               # Configuración Docker
├── .github/              # GitHub Actions
└── public/               # Assets estáticos
```

---

## 🔒 Seguridad

- ✅ CORS configurado
- ✅ Headers de seguridad (en Nginx)
- ✅ Rate limiting
- ✅ Validación de inputs
- ✅ Error handling robusto
- ✅ Variables de entorno para secrets

---

## 📊 Monitoreo

### Health Check

```bash
curl http://localhost:3001/health
```

Respuesta:
```json
{
  "status": "ok",
  "uptime": 3600,
  "alertsCount": 10,
  "jamsCount": 25
}
```

### Métricas

El sistema expone métricas en `/health`:
- Uptime del servidor
- Uso de memoria
- Conteo de alertas y jams
- Última actualización de Waze

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -am 'Add nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Crea un Pull Request

### Convenciones de Código

- ESLint para linting
- TypeScript strict mode
- Conventional Commits para mensajes

---

## 📝 Licencia

Propiedad de CASISA - Caminos de las Sierras. Todos los derechos reservados.

---

## 📞 Soporte

Para soporte técnico, contactar al equipo de desarrollo.

---

<p align="center">
  Desarrollado con ❤️ para <strong>Caminos de las Sierras</strong>
</p>
