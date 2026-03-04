-- Migration: 034_fix_supervisor_permissions.sql
-- Description: Agrega incidents.view al Supervisor (faltante en migración original 030)
-- Idempotente: ON CONFLICT DO NOTHING
-- Date: 2026-03-02
-- El Supervisor tenía incidents.manage pero no incidents.view,
-- lo que impedía el acceso a Dashboard, Mapa, Alertas, Siniestros.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r,
    permissions p
WHERE r.name = 'Supervisor'
    AND p.code = 'incidents.view' ON CONFLICT (role_id, permission_id) DO NOTHING;
