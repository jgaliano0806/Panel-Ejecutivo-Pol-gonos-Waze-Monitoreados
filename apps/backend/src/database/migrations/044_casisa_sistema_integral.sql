-- Migration: 044_casisa_sistema_integral.sql
-- Description: Tablas para Máquina de Estados, Móviles, Tracking EPI/TySV, Libro Actas
-- Date: 2026-04-20

-- 1. EXTENSIÓN POSTGIS
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ROLES FALTANTES (EPI, INSPECTOR)
INSERT INTO roles (name, description, color) VALUES
  ('Inspector TySV', 'Personal de campo en móviles', '#fbbf24'),
  ('Operador EPI',   'Equipo de Primera Intervención', '#f59e0b')
ON CONFLICT (name) DO NOTHING;

-- 3. MÓVILES FLOTA
CREATE TABLE IF NOT EXISTS moviles_flota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patente VARCHAR(15) UNIQUE NOT NULL,
    numero_interno VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('TySV', 'EPI', 'Otro')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. SESIONES DE TURNO (CHECK-IN)
CREATE TABLE IF NOT EXISTS sesiones_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    movil_id UUID NOT NULL REFERENCES moviles_flota(id),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMPTZ,
    km_inicial INTEGER,
    km_final INTEGER,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Finalizado')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TRACKING GPS (PostGIS)
CREATE TABLE IF NOT EXISTS tracking_gps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_turno_id UUID NOT NULL REFERENCES sesiones_turno(id),
    ubicacion GEOMETRY(Point, 4326) NOT NULL, -- Uso de PostGIS para cercanía geométrica
    velocidad_kmh NUMERIC(5, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tracking_ubicacion ON tracking_gps USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking_gps(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sesion ON tracking_gps(sesion_turno_id);

-- 6. INCIDENTE OFICIAL (Máquina de Estados)
CREATE TABLE IF NOT EXISTS incidente_oficial (
    id SERIAL PRIMARY KEY,
    creador_id INTEGER NOT NULL REFERENCES users(id),
    estado_workflow VARCHAR(50) NOT NULL DEFAULT 'Borrador' CHECK (estado_workflow IN ('Borrador', 'Enviado_A_Base', 'Validado_Base', 'Rechazado', 'Archivado')),
    gravedad INTEGER CHECK (gravedad BETWEEN 1 AND 4),
    codigo_situacion VARCHAR(20), -- Ej: 50, 65, 11
    ruta VARCHAR(50),
    kilometro NUMERIC(10,3),
    ubicacion_absoluta GEOMETRY(Point, 4326),
    hay_lesionados BOOLEAN DEFAULT false,
    hay_obitos BOOLEAN DEFAULT false,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incidente_oficial_ubicacion ON incidente_oficial USING GIST (ubicacion_absoluta);
CREATE INDEX IF NOT EXISTS idx_incidente_oficial_estado ON incidente_oficial(estado_workflow);

-- 7. BITÁCORA DE ESTADOS (Inmutable)
CREATE TABLE IF NOT EXISTS bitacora_estados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id INTEGER NOT NULL REFERENCES incidente_oficial(id) ON DELETE CASCADE,
    validador_id INTEGER REFERENCES users(id),
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    justificacion TEXT,
    fecha_cambio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. ACTIVACIÓN TERCEROS (SLA)
CREATE TABLE IF NOT EXISTS activacion_terceros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id INTEGER NOT NULL REFERENCES incidente_oficial(id) ON DELETE CASCADE,
    servicio_tipo VARCHAR(50) NOT NULL CHECK (servicio_tipo IN ('Medico', 'Grua_Pesada', 'Grua_Liviana', 'Policia', 'Bomberos')),
    hora_aviso TIMESTAMPTZ NOT NULL,
    hora_arribo TIMESTAMPTZ,
    demora_calculada_minutos INTEGER,
    sla_incumplido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. CACHE ALERTA WAZE RELACIONADA
CREATE TABLE IF NOT EXISTS alerta_waze_absorbida (
    uuid VARCHAR(100) PRIMARY KEY,
    incidente_absorbente_id INTEGER NOT NULL REFERENCES incidente_oficial(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    ubicacion GEOMETRY(Point, 4326),
    is_silenced BOOLEAN DEFAULT true,
    fecha_absorcion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
