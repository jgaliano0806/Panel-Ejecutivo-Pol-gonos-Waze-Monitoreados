-- Migration: 030_users_and_admin.sql
-- Description: Crea tablas de autenticación (users, roles, permissions, sessions) y siembra
--              el usuario admin por defecto. Consolida scripts/migrations/004 y 005.
-- Idempotente: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING en todos los inserts.
-- Date: 2026-02-26

-- =====================================================
-- 1. TABLAS DE PERMISOS Y ROLES
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- =====================================================
-- 2. TABLAS DE USUARIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- =====================================================
-- 3. TABLA DE SESIONES (multi-session JWT)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TABLAS AUXILIARES
-- =====================================================

CREATE TABLE IF NOT EXISTS sso_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255),
    redirect_uri TEXT NOT NULL,
    authorization_url TEXT,
    token_url TEXT,
    user_info_url TEXT,
    scopes TEXT DEFAULT 'openid profile email',
    is_active BOOLEAN DEFAULT false,
    last_tested TIMESTAMPTZ,
    test_result VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active          ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_verified  ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_roles_active          ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_category  ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_active    ON permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_cat   ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key   ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user    ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token   ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);

-- =====================================================
-- 6. TRIGGER updated_at (idempotente con OR REPLACE)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_roles_updated_at') THEN
        CREATE TRIGGER update_roles_updated_at
            BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sso_providers_updated_at') THEN
        CREATE TRIGGER update_sso_providers_updated_at
            BEFORE UPDATE ON sso_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_settings_updated_at') THEN
        CREATE TRIGGER update_system_settings_updated_at
            BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

-- =====================================================
-- 7. DATOS INICIALES: PERMISOS
-- =====================================================

INSERT INTO permissions (code, name, description, category) VALUES
  ('admin',            'Administrador',          'Acceso completo al sistema',                        'system'),
  ('users.manage',     'Gestionar Usuarios',      'Crear, editar y eliminar usuarios',                 'users'),
  ('users.view',       'Ver Usuarios',            'Visualizar lista de usuarios',                      'users'),
  ('catalogs.manage',  'Gestionar Catálogos',     'Editar tipos y subtipos de incidentes',             'catalogs'),
  ('incidents.manage', 'Gestionar Incidentes',    'Crear y modificar incidentes',                      'incidents'),
  ('incidents.view',   'Ver Incidentes',          'Visualizar incidentes en el mapa',                  'incidents'),
  ('reports.view',     'Ver Reportes',            'Acceder a estadísticas y reportes',                 'reports'),
  ('settings.manage',  'Gestionar Configuración', 'Modificar configuración del sistema',               'settings')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 8. DATOS INICIALES: ROLES
-- =====================================================

INSERT INTO roles (name, description, color) VALUES
  ('Administrador', 'Acceso completo a todas las funcionalidades del sistema', '#dc2626'),
  ('Supervisor',    'Supervisión de operaciones y gestión de usuarios básicos', '#ea580c'),
  ('Operador',      'Gestión básica de incidentes y visualización de reportes',  '#2563eb'),
  ('Visualizador',  'Solo lectura de datos e incidentes',                        '#16a34a')
ON CONFLICT (name) DO NOTHING;

-- Asignar permisos a roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (r.name = 'Administrador')
   OR (r.name = 'Supervisor'   AND p.code IN ('users.view', 'reports.view', 'incidents.manage', 'catalogs.manage'))
   OR (r.name = 'Operador'     AND p.code IN ('incidents.view', 'incidents.manage', 'reports.view'))
   OR (r.name = 'Visualizador' AND p.code  = 'incidents.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- 9. DATOS INICIALES: CONFIGURACIÓN DEL SISTEMA
-- =====================================================

INSERT INTO system_settings (category, key, value, value_type, description, is_system) VALUES
  ('system',        'timezone',              'America/Argentina/Cordoba',              'string',  'Zona horaria del sistema',                                   true),
  ('system',        'log_level',             'info',                                   'string',  'Nivel de detalle para los logs del sistema',                  false),
  ('system',        'maintenance_mode',      'false',                                  'boolean', 'Activar modo mantenimiento (solo administradores)',            false),
  ('database',      'max_connections',       '20',                                     'number',  'Número máximo de conexiones simultáneas',                     true),
  ('email',         'enabled',               'false',                                  'boolean', 'Habilitar envío de notificaciones por email',                 false),
  ('email',         'smtp_host',             'smtp.gmail.com',                         'string',  'Servidor SMTP para envío de emails',                          false),
  ('email',         'smtp_port',             '587',                                    'number',  'Puerto del servidor SMTP',                                    false),
  ('email',         'from_address',          'noreply@casisa.com',                     'string',  'Dirección de email usada como remitente',                     false),
  ('notifications', 'enabled',               'true',                                   'boolean', 'Habilitar sistema de notificaciones push',                    false),
  ('notifications', 'retention_days',        '30',                                     'number',  'Días para mantener notificaciones en el sistema',             false),
  ('security',      'session_timeout',       '480',                                    'number',  'Minutos antes de que expire la sesión automáticamente',       false),
  ('security',      'password_min_length',   '8',                                      'number',  'Caracteres mínimos requeridos para contraseñas',              false),
  ('security',      'two_factor_enabled',    'false',                                  'boolean', 'Requerir autenticación de dos factores',                      false)
ON CONFLICT (category, key) DO NOTHING;

-- =====================================================
-- 10. USUARIO ADMIN POR DEFECTO
--     Email:    admin@casisa.com
--     Password: Admin123!  (hash bcrypt rounds=10)
-- =====================================================

INSERT INTO users (
    email, first_name, last_name, phone,
    password_hash, is_active, email_verified
) VALUES (
    'admin@casisa.com',
    'Administrador',
    'Sistema',
    '+54 351 000-0000',
    '$2a$10$rKN3vGJO3pCGu.Rl5OXfqeJPFvU9yWNvBkWIVK1gQvJ7xjNpWdHXe',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Asignar rol Administrador al usuario admin
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@casisa.com'
  AND r.name  = 'Administrador'
ON CONFLICT (user_id, role_id) DO NOTHING;
