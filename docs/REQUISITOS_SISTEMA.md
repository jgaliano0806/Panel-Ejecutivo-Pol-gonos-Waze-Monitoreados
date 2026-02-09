# Requisitos del sistema – Panel Ejecutivo Waze

Este documento define los requisitos físicos, lógicos y de carga para ejecutar el Panel en **servidor Red Hat** o en **PC productiva** (desarrollo/productivo local).

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Cargas en base de datos y consumos](#2-cargas-en-base-de-datos-y-consumos)
3. [Requisitos lógicos (software)](#3-requisitos-lógicos-software)
4. [Requisitos físicos (hardware)](#4-requisitos-físicos-hardware)
5. [Requisitos por escenario](#5-requisitos-por-escenario)
6. [Red y conectividad](#6-red-y-conectividad)

---

## 1. Resumen ejecutivo

| Escenario | Uso típico | Stack mínimo |
|-----------|------------|--------------|
| **Servidor Red Hat** | Producción, acceso por red, varios usuarios | Node 18+, PostgreSQL 16+, Redis (opcional), Nginx |
| **PC productiva** | Sala de control, un equipo fijo, uso productivo | Node 18+, PostgreSQL 16+, Redis/Memurai opcional |

El backend realiza **polling periódico** a Waze y Open-Meteo; la base de datos recibe escrituras (upserts, inserts) y lecturas por API y health checks. Redis es opcional (caché y rate limiting con fallback en memoria).

---

## 2. Cargas en base de datos y consumos

### 2.1. Polling y escrituras

| Origen | Frecuencia | Acción en BD |
|--------|-------------|--------------|
| **Waze** | Cada **30 s** | Por cada polígono (~67): `bulkUpsert` en `waze_alerts`, `waze_jams`, `waze_irregularities`; updates de registros inactivos; posibles inserts en `notifications`, `road_accidents`. |
| **Clima (Open-Meteo)** | Cada **1 h** | Inserts/updates en `polygon_weather_data` por polígono con coordenadas. |
| **Snapshots / histórico** | Según jobs/listeners | Inserts en `historical_snapshots`, `polygon_snapshots`, `daily_statistics`, `risk_scores`, etc. |

- **Rate limiting interno**: 100 ms entre requests HTTP a feeds de Waze por ciclo de polling.
- **Límite de referencia por feed Waze**: 5000 eventos (alertas + jams); el sistema monitorea cercanía a ese límite.

### 2.2. Lecturas

- APIs REST: incidentes (hasta `LIMIT 2000`), jams (`LIMIT 1000`), histórico, KPIs, health checks (consultas a tablas recientes, ej. últimas 24 h).
- Rate limiting global: **100 req/min** por cliente; si Redis está disponible se usa para contadores; si no, fallback en memoria.

### 2.3. Volumen orientativo

- **Escrituras**: Decenas de operaciones por minuto en tablas Waze y clima; crecimiento continuo en tablas de histórico/snapshots con retención (ej. 90 días en migraciones).
- **Espacio en disco**: Depende de retención y número de polígonos; se recomienda monitorear crecimiento de `historical_snapshots`, `polygon_snapshots`, `waze_alerts`, `waze_jams`.

### 2.4. Redis

- **Uso**: Caché (Waze, clima) y rate limiting.
- **Opcional**: Si Redis no está disponible, el backend usa fallback en memoria (rate limit con cache interno).

---

## 3. Requisitos lógicos (software)

| Componente | Versión mínima | Notas |
|------------|----------------|-------|
| **Node.js** | 18.x LTS | `package.json` declara `"node": ">=18.0.0"`. |
| **npm** | 8.x | Incluido con Node. |
| **PostgreSQL** | 16+ | Requerido para migraciones y esquema actual. |
| **Redis** | 6+ | Opcional; en Windows puede usarse Memurai. |
| **Git** | 2.x | Para clonar el repositorio. |
| **Nginx** (servidor) | 1.18+ | Recomendado en Red Hat para servir frontend y proxy a la API. |

### Sistema operativo

- **Servidor**: Red Hat Enterprise Linux (RHEL) 8/9, Rocky Linux, AlmaLinux o compatible.
- **PC productiva**: Windows 10/11 o Linux (Ubuntu, Debian, Fedora, etc.).

---

## 4. Requisitos físicos (hardware)

### 4.1. Servidor Red Hat (todo en un solo equipo)

| Recurso | Mínimo | Recomendado |
|---------|--------|--------------|
| **CPU** | 2 núcleos | 4 núcleos |
| **RAM** | 4 GB | 8 GB (Node + PostgreSQL + Redis + sistema) |
| **Disco** | 20 GB | 50 GB SSD (SO + aplicación + logs + crecimiento de BD) |

### 4.2. PC productiva

| Recurso | Mínimo | Recomendado |
|---------|--------|--------------|
| **CPU** | 2 núcleos | 4 núcleos |
| **RAM** | 4 GB | 8 GB |
| **Disco** | 5 GB | 10 GB |

### 4.3. Servidor solo aplicación (BD y Redis en otros servidores)

| Recurso | Mínimo | Recomendado |
|---------|--------|--------------|
| **CPU** | 2 núcleos | 4 núcleos |
| **RAM** | 2 GB | 4 GB |

---

## 5. Requisitos por escenario

### 5.1. Servidor Red Hat (producción)

- **Lógicos**: Node 18+, PostgreSQL 16+, Redis 6+ (opcional), Nginx, usuario no root para la aplicación, systemd para el backend.
- **Físicos**: 4 GB RAM, 4 núcleos, 20–50 GB disco (SSD recomendado para PostgreSQL).
- **Red**: Puertos 80/443 (Nginx); backend escucha en localhost (ej. 3002) o según configuración.

### 5.2. PC productiva (Windows)

- **Lógicos**: Node 18+, PostgreSQL 16+, Memurai o Redis (opcional), script o servicio para arrancar el backend al inicio.
- **Físicos**: 4–8 GB RAM, 2+ núcleos, 5–10 GB disco.
- **Red**: Acceso saliente a Waze y Open-Meteo; puerto local para la API (ej. 3002).

### 5.3. PC productiva (Linux)

- **Lógicos**: Igual que Red Hat pero en una sola máquina; systemd para el backend; frontend puede servirse con `npm run preview` o servidor estático.
- **Físicos**: Igual que PC Windows.

---

## 6. Red y conectividad

- **Salida (backend)**:
  - Waze Partner Hub (feeds por polígono).
  - Open-Meteo API (clima).
  - Posibles otras APIs externas según integraciones.
- **Entrada**: HTTP/HTTPS para usuarios (Nginx o servidor estático + API).
- **Firewall**: Abrir 80/443 en servidor; en PC solo si se accede desde otras máquinas.

---

## Referencias

- [INSTRUCTIVO_DESPLIEGUE.md](./INSTRUCTIVO_DESPLIEGUE.md) – Pasos detallados de instalación y configuración.
- [DEPLOYMENT.md](./DEPLOYMENT.md) – Despliegue con Docker y variables de entorno.
