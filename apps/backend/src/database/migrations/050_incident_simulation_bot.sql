-- Migración 050: configuración del bot de simulación de incidentes (presentaciones)
INSERT INTO system_settings (category, key, value, value_type, description, is_system)
VALUES (
  'simulation',
  'incident_bot_enabled',
  'false',
  'boolean',
  'Bot de simulación de incidentes Waze (ACCIDENT, autodetenido, objeto en vía) cada 30s',
  true
)
ON CONFLICT (category, key) DO NOTHING;
