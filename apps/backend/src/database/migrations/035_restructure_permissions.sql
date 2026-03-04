-- Migration: 035_restructure_permissions.sql
-- Description: Reestructura permisos para que estén atados a módulos específicos
--              con capacidades granulares (ver, crear, exportar).
-- Idempotente: ON CONFLICT DO NOTHING en todos los inserts.
-- Date: 2026-03-02
-- =====================================================
-- 1. INSERTAR NUEVOS PERMISOS POR MÓDULO
-- =====================================================
INSERT INTO permissions (code, name, description, category)
VALUES (
        'map.view',
        'Ver Mapa',
        'Visualización del mapa, polígonos y alertas Waze',
        'map'
    ),
    (
        'notifications.view',
        'Ver Notificaciones',
        'Visualización de notificaciones del sistema',
        'notifications'
    ),
    (
        'accidents.view',
        'Ver Siniestros',
        'Visualizar listado de siniestros viales',
        'accidents'
    ),
    (
        'accidents.create',
        'Crear Siniestros',
        'Subir y crear información de siniestros',
        'accidents'
    ),
    (
        'accidents.export',
        'Exportar Siniestros',
        'Exportar documentación de siniestros',
        'accidents'
    ),
    (
        'incidents.view',
        'Ver Incidentes',
        'Visualizar listado de incidentes',
        'incidents'
    ),
    (
        'incidents.export',
        'Exportar Incidentes',
        'Exportar listado y documentación de incidentes',
        'incidents'
    ) ON CONFLICT (code) DO NOTHING;
-- El permiso 'admin' ya existe de la migración 030, lo mantenemos.
-- Actualizamos su descripción por claridad
UPDATE permissions
SET description = 'Acceso total al panel de administración — gestionar usuarios, roles, polígonos, catálogos y configuración',
    category = 'admin'
WHERE code = 'admin';
-- =====================================================
-- 2. LIMPIAR ASIGNACIONES VIEJAS DE role_permissions
-- =====================================================
-- Eliminar TODAS las asignaciones actuales para los 4 roles del sistema
DELETE FROM role_permissions
WHERE role_id IN (
        SELECT id
        FROM roles
        WHERE name IN (
                'Administrador',
                'Supervisor',
                'Operador',
                'Visualizador'
            )
    );
-- =====================================================
-- 3. REASIGNAR PERMISOS POR ROL
-- =====================================================
-- Administrador: todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r
    CROSS JOIN permissions p
WHERE r.name = 'Administrador'
    AND p.code IN (
        'admin',
        'map.view',
        'notifications.view',
        'accidents.view',
        'accidents.create',
        'accidents.export',
        'incidents.view',
        'incidents.export'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Supervisor: todo excepto admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r
    CROSS JOIN permissions p
WHERE r.name = 'Supervisor'
    AND p.code IN (
        'map.view',
        'notifications.view',
        'accidents.view',
        'accidents.create',
        'accidents.export',
        'incidents.view',
        'incidents.export'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Operador: ver + crear siniestros, ver incidentes
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r
    CROSS JOIN permissions p
WHERE r.name = 'Operador'
    AND p.code IN (
        'map.view',
        'notifications.view',
        'accidents.view',
        'accidents.create',
        'incidents.view'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Visualizador: solo ver
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r
    CROSS JOIN permissions p
WHERE r.name = 'Visualizador'
    AND p.code IN (
        'map.view',
        'notifications.view',
        'accidents.view',
        'incidents.view'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;
-- =====================================================
-- 4. DESACTIVAR PERMISOS VIEJOS (no eliminar por seguridad)
-- =====================================================
UPDATE permissions
SET is_active = false
WHERE code IN (
        'users.manage',
        'users.view',
        'catalogs.manage',
        'incidents.manage',
        'reports.view',
        'settings.manage'
    )
    AND code NOT IN ('admin', 'incidents.view');
-- incidents.view ya existe y sigue activo (mismo código)
-- admin ya existe y sigue activo
