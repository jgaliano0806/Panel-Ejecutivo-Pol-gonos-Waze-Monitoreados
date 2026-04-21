-- Texto libre opcional (panel: "Descripción")
ALTER TABLE zonas_peligrosas
  ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT '';
