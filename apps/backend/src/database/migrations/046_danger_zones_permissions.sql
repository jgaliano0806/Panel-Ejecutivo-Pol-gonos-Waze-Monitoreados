-- Permisos granulares para el módulo RAC de zonas peligrosas (zonas_peligrosas).
-- Idempotente: ON CONFLICT DO NOTHING.
--
-- danger_zones.view  → listar / ver en mapa (GET)
-- danger_zones.edit  → alta / modificación / baja (POST, PUT, DELETE)
--
-- Operador: view + edit (operación en sala).
-- Visualizador: solo view.

INSERT INTO permissions (code, name, description, category)
VALUES
  (
    'danger_zones.view',
    'Ver Zonas Peligrosas',
    'Consultar polígonos RAC y visualizarlos en el mapa',
    'danger_zones'
  ),
  (
    'danger_zones.edit',
    'Gestionar Zonas Peligrosas',
    'Crear, modificar y eliminar zonas peligrosas',
    'danger_zones'
  )
ON CONFLICT (code) DO NOTHING;

-- Administrador y Supervisor: ver + gestionar
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Administrador', 'Supervisor')
  AND p.code IN ('danger_zones.view', 'danger_zones.edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Operador: ver + gestionar (misma capacidad operativa que supervisor en este módulo)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Operador'
  AND p.code IN ('danger_zones.view', 'danger_zones.edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Visualizador: solo lectura
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Visualizador'
  AND p.code = 'danger_zones.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
