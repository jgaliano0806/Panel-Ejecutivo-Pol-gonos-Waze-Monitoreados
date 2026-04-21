-- =============================================================================
-- RAC — Módulo Zonas Peligrosas (geofencing)
-- Tabla: zonas_peligrosas
-- geometria: GeoJSON Polygon en JSONB (evaluación con Turf en Node; opcional PostGIS abajo)
-- =============================================================================

CREATE TABLE IF NOT EXISTS zonas_peligrosas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  geometria JSONB NOT NULL,
  nivel_severidad INTEGER NOT NULL DEFAULT 1
    CHECK (nivel_severidad IN (1, 2)),
  protocolo_accion TEXT NOT NULL DEFAULT '',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activa BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_zonas_peligrosas_activa ON zonas_peligrosas (activa);
CREATE INDEX IF NOT EXISTS idx_zonas_peligrosas_fecha ON zonas_peligrosas (fecha_creacion DESC);

COMMENT ON TABLE zonas_peligrosas IS 'Polígonos de geofencing RAC; nivel_severidad 1=naranja, 2=rojo';

-- Opcional (requiere PostGIS en el servidor): columna nativa y GIST
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE zonas_peligrosas ADD COLUMN IF NOT EXISTS geom_postgis geometry(Polygon,4326);
-- UPDATE zonas_peligrosas SET geom_postgis = ST_SetSRID(ST_GeomFromGeoJSON(geometria::text),4326) WHERE geom_postgis IS NULL;
-- CREATE INDEX IF NOT EXISTS idx_zonas_peligrosas_geom_gist ON zonas_peligrosas USING GIST (geom_postgis);
