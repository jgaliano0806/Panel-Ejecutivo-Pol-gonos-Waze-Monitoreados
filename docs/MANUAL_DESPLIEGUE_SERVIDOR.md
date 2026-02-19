# Manual de Despliegue en Servidor – Panel Ejecutivo Waze

**Versión:** 1.0  
**Fecha:** Febrero 2025  
**Proyecto:** Panel Ejecutivo para monitoreo de tráfico en tiempo real con datos de Waze

---

## 1. Introducción

Este manual describe paso a paso cómo desplegar el **Panel Ejecutivo Waze** en un servidor Linux con base de datos PostgreSQL, Redis y todas las dependencias necesarias. El método recomendado es **Docker Compose**.

### 1.1 Requisitos del servidor

| Requisito | Especificación mínima |
|-----------|------------------------|
| Sistema Operativo | Linux (Ubuntu 22.04, Debian 12, Rocky 9, Alma 9, RHEL 8+) |
| RAM | 4 GB |
| Disco | 20 GB libres |
| Puertos | 80 (HTTP), 5432 (PostgreSQL), 6379 (Redis) |
| Software | Docker 24+ y Docker Compose v2 |

---

## 2. Prerrequisitos del sistema

### 2.1 Instalación de Docker y Docker Compose

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para aplicar el grupo
```

**Rocky/Alma/RHEL:**
```bash
sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

**Verificación:**
```bash
docker --version
docker compose version
```

### 2.2 Configuración del Firewall

**Ubuntu (ufw):**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

**Rocky/Alma (firewalld):**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 3. Preparación del proyecto

### 3.1 Obtener el código en el servidor

**Opción A – Git:**
```bash
cd /opt
sudo git clone https://github.com/TU_ORGANIZACION/Panel-Waze-Monitoreados.git
sudo chown -R $USER:$USER Panel-Waze-Monitoreados
cd Panel-Waze-Monitoreados
```

**Opción B – Transferencia SCP/SFTP:**
```bash
scp -r /ruta/local/Panel-Waze-Monitoreados usuario@servidor:/opt/
```

### 3.2 Estructura del proyecto

Debe existir la siguiente estructura:
```
/opt/Panel-Waze-Monitoreados/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── apps/
│   ├── frontend/
│   └── backend/
├── packages/
└── docker/
    ├── nginx.conf
    └── start.sh
```

---

## 4. Variables de entorno

### 4.1 Crear archivo .env

En la raíz del proyecto:

```bash
cd /opt/Panel-Waze-Monitoreados
nano .env
```

**Contenido mínimo:**
```env
# Base de datos PostgreSQL
DB_PASSWORD=contraseña_segura_mínimo_16_caracteres

# API de mapas (opcional)
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps

# Producción
VITE_API_URL=/api
```

> **Importante:** Use contraseñas seguras en producción. No suba el archivo `.env` al control de versiones.

---

## 5. Despliegue con Docker Compose

### 5.1 Ejecutar en modo producción

```bash
cd /opt/Panel-Waze-Monitoreados

docker compose --profile prod up -d --build
```

Esto levantará:
- **PostgreSQL 16** – Base de datos
- **Redis 7** – Cache y rate limiting
- **App** – Frontend + Backend + Nginx (todo en un contenedor)

### 5.2 Verificar que los contenedores están corriendo

```bash
docker compose --profile prod ps
```

Salida esperada:
```
NAME                    STATUS
panel-waze-postgres     Up (healthy)
panel-waze-redis        Up (healthy)
panel-waze-monitoreados-app-1   Up (healthy)
```

### 5.3 Ver logs en tiempo real

```bash
docker compose --profile prod logs -f app
```

---

## 6. Inicialización de la base de datos

### 6.1 Esquema inicial

El esquema se aplica automáticamente al crear el volumen de PostgreSQL. El archivo `apps/backend/src/database/schema.sql` se monta en el contenedor de Postgres como script de inicialización.

### 6.2 Ejecutar migraciones (si existen)

```bash
docker compose --profile prod exec app sh -c "cd /app/apps/backend && node dist/scripts/run-migrations.js"
```

### 6.3 Verificar conexión a la base de datos

```bash
docker compose --profile prod exec postgres psql -U postgres -d panel_waze -c "\dt"
```

---

## 7. Verificación del despliegue

### 7.1 Endpoints disponibles

| URL | Descripción |
|-----|-------------|
| `http://TU_IP_SERVIDOR/` | Panel (frontend) |
| `http://TU_IP_SERVIDOR/api/health` | Health check del backend |
| `http://TU_IP_SERVIDOR/health` | Health check vía Nginx |

### 7.2 Prueba de health check desde el servidor

```bash
curl -s http://localhost/health
curl -s http://localhost/api/health
```

Debería devolver un JSON con `status: "ok"` o similar.

---

## 8. Dependencias y servicios

### 8.1 Resumen de servicios

| Servicio | Puerto | Volumen | Función |
|----------|--------|---------|---------|
| PostgreSQL | 5432 (interno) | postgres-data | Base de datos principal |
| Redis | 6379 (interno) | redis-data | Cache y rate limiting |
| App (Nginx + Backend) | 80, 3001 | backend data | Frontend estático + API |

### 8.2 Persistencia de datos

Los volúmenes Docker mantienen los datos entre reinicios:
- **postgres-data**: Datos de PostgreSQL
- **redis-data**: Datos de Redis  
- **./apps/backend/data**: Datos de aplicación (si aplica)

---

## 9. Mantenimiento

### 9.1 Detener la aplicación

```bash
docker compose --profile prod down
```

### 9.2 Reiniciar solo la aplicación

```bash
docker compose --profile prod restart app
```

### 9.3 Actualizar y redesplegar

```bash
cd /opt/Panel-Waze-Monitoreados
git pull
docker compose --profile prod up -d --build
```

### 9.4 Eliminar todo (incluyendo volúmenes)

```bash
docker compose --profile prod down -v
```
> **Advertencia:** Esto borrará la base de datos y todos los datos.

---

## 10. Configuración HTTPS (opcional)

Para habilitar HTTPS con certificado SSL gratuito (Let's Encrypt):

1. Instalar Certbot en el servidor
2. Configurar un dominio apuntando a la IP del servidor
3. Ejecutar: `sudo certbot certonly --standalone -d tudominio.com`
4. Configurar Nginx o un proxy reverso para usar los certificados generados

---

## 11. Resolución de problemas

### 11.1 La aplicación no arranca

```bash
docker compose --profile prod logs app
```

Revisar variables de entorno y que PostgreSQL esté healthy.

### 11.2 Error de conexión a base de datos

- Verificar que `DB_PASSWORD` coincida con la configuración de Postgres
- Comprobar que el contenedor postgres esté en estado "healthy"
- Revisar la red Docker: `docker network inspect panel-waze-network`

### 11.3 Puerto 80 en uso

Editar `docker-compose.yml` y cambiar el mapeo de puertos:
```yaml
ports:
  - "8080:80"
```
Acceder vía `http://TU_IP:8080`

### 11.4 Falta de espacio en disco

```bash
docker system prune -a
```
Cuidado: elimina imágenes y contenedores no utilizados.

---

## 12. Resumen rápido (checklist)

```
□ 1. Instalar Docker + Docker Compose
□ 2. Clonar proyecto en /opt
□ 3. Crear .env con DB_PASSWORD y VITE_GOOGLE_MAPS_API_KEY
□ 4. Ejecutar: docker compose --profile prod up -d --build
□ 5. Verificar: curl http://localhost/health
```

---

## 13. Documentación adicional

- **DEPLOYMENT.md** – Despliegue general y variables de entorno
- **INSTRUCTIVO_DESPLIEGUE.md** – Despliegue detallado en servidores Red Hat y PC productivas
- **ARCHITECTURE.md** – Arquitectura del sistema
- **REQUISITOS_SISTEMA.md** – Requisitos de hardware y software

---

*Manual generado para el Panel Ejecutivo Waze – CASISA*
