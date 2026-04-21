-- Ver apps/backend/scripts/create-red-zones-table.sql (mismo contenido)
CREATE TABLE IF NOT EXISTS zonas_peligrosas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  geometria JSONB NOT NULL,
  nivel_severidad INTEGER NOT NULL DEFAULT 1
    CHECK (nivel_severidad IN (1, 2, 3)),
  protocolo_accion TEXT NOT NULL DEFAULT '',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activa BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_zonas_peligrosas_activa ON zonas_peligrosas (activa);
CREATE INDEX IF NOT EXISTS idx_zonas_peligrosas_fecha ON zonas_peligrosas (fecha_creacion DESC);
