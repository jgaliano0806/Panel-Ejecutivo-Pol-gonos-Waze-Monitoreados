-- Amplía el CHECK de `nivel_severidad` para admitir el tercer nivel
-- (`extrema` = 3) usado por el panel. Antes solo aceptaba 1 (alta) y 2 (crítica),
-- por lo que al editar una zona y elegir "Extrema" se persistía como 2 y el
-- API la devolvía como "critical".

DO $$
BEGIN
  -- Eliminar el constraint existente (nombre generado por Postgres)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'zonas_peligrosas_nivel_severidad_check'
  ) THEN
    ALTER TABLE zonas_peligrosas
      DROP CONSTRAINT zonas_peligrosas_nivel_severidad_check;
  END IF;
END$$;

ALTER TABLE zonas_peligrosas
  ADD CONSTRAINT zonas_peligrosas_nivel_severidad_check
  CHECK (nivel_severidad IN (1, 2, 3));
