-- Migration: 004_catalogs_and_users.sql
-- Description: Create tables for catalogs, users, roles and permissions management
-- Date: 2025-12-24

-- =====================================================
-- CATALOGS MANAGEMENT
-- =====================================================

-- Incident Types Table
CREATE TABLE IF NOT EXISTS incident_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'alert-triangle',
    color VARCHAR(7) DEFAULT '#6b7280', -- Hex color
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Incident Subtypes Table
CREATE TABLE IF NOT EXISTS incident_subtypes (
    id SERIAL PRIMARY KEY,
    type_id INTEGER NOT NULL REFERENCES incident_types(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type_id, code)
);

-- =====================================================
-- USERS AND ROLES MANAGEMENT
-- =====================================================

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255), -- For local authentication
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Roles Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- SSO Providers Table
CREATE TABLE IF NOT EXISTS sso_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'microsoft', 'google', etc.
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255), -- For Microsoft Azure
    redirect_uri TEXT NOT NULL,
    authorization_url TEXT,
    token_url TEXT,
    user_info_url TEXT,
    scopes TEXT DEFAULT 'openid profile email',
    is_active BOOLEAN DEFAULT false,
    last_tested TIMESTAMP WITH TIME ZONE,
    test_result VARCHAR(20), -- 'success', 'error', 'pending'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_system BOOLEAN DEFAULT false, -- System settings cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'role', 'incident_type', etc.
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Incident Types indexes
CREATE INDEX IF NOT EXISTS idx_incident_types_code ON incident_types(code);
CREATE INDEX IF NOT EXISTS idx_incident_types_active ON incident_types(is_active);

-- Incident Subtypes indexes
CREATE INDEX IF NOT EXISTS idx_incident_subtypes_type_id ON incident_subtypes(type_id);
CREATE INDEX IF NOT EXISTS idx_incident_subtypes_code ON incident_subtypes(code);
CREATE INDEX IF NOT EXISTS idx_incident_subtypes_active ON incident_subtypes(is_active);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);

-- System Settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- =====================================================
-- DEFAULT DATA INSERTION
-- =====================================================

-- Insert default permissions
INSERT INTO permissions (code, name, description, category) VALUES
('admin', 'Administrador', 'Acceso completo al sistema', 'system'),
('users.manage', 'Gestionar Usuarios', 'Crear, editar y eliminar usuarios', 'users'),
('users.view', 'Ver Usuarios', 'Visualizar lista de usuarios', 'users'),
('catalogs.manage', 'Gestionar Catálogos', 'Editar tipos y subtipos de incidentes', 'catalogs'),
('incidents.manage', 'Gestionar Incidentes', 'Crear y modificar incidentes', 'incidents'),
('incidents.view', 'Ver Incidentes', 'Visualizar incidentes en el mapa', 'incidents'),
('reports.view', 'Ver Reportes', 'Acceder a estadísticas y reportes', 'reports'),
('settings.manage', 'Gestionar Configuración', 'Modificar configuración del sistema', 'settings')
ON CONFLICT (code) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description, color) VALUES
('Administrador', 'Acceso completo a todas las funcionalidades del sistema', '#dc2626'),
('Supervisor', 'Supervisión de operaciones y gestión de usuarios básicos', '#ea580c'),
('Operador', 'Gestión básica de incidentes y visualización de reportes', '#2563eb'),
('Visualizador', 'Solo lectura de datos e incidentes', '#16a34a')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to default roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (r.name = 'Administrador')
   OR (r.name = 'Supervisor' AND p.code IN ('users.view', 'reports.view', 'incidents.manage'))
   OR (r.name = 'Operador' AND p.code IN ('incidents.view', 'reports.view'))
   OR (r.name = 'Visualizador' AND p.code = 'incidents.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert default incident types
INSERT INTO incident_types (code, name, description, icon, color) VALUES
('ACCIDENT', 'Accidente Vial', 'Incidentes relacionados con accidentes de tránsito', 'car', '#ef4444'),
('JAM', 'Congestión', 'Tráfico congestionado y lentitud en las vías', 'alert-triangle', '#f59e0b'),
('HAZARD', 'Peligro', 'Situaciones peligrosas en la vía', 'alert-triangle', '#dc2626'),
('WEATHER', 'Clima', 'Condiciones climáticas adversas', 'cloud', '#06b6d4'),
('ROADWORK', 'Obras', 'Trabajos en la vía y construcción', 'wrench', '#8b5cf6'),
('EVENT', 'Evento', 'Eventos especiales que afectan el tráfico', 'map-pin', '#10b981')
ON CONFLICT (code) DO NOTHING;

-- Insert default incident subtypes
INSERT INTO incident_subtypes (type_id, code, name, description, severity) VALUES
-- Accident subtypes
((SELECT id FROM incident_types WHERE code = 'ACCIDENT'), 'ACCIDENT_MINOR', 'Accidente Menor', 'Accidente con daños menores', 'MEDIUM'),
((SELECT id FROM incident_types WHERE code = 'ACCIDENT'), 'ACCIDENT_MAJOR', 'Accidente Grave', 'Accidente con heridos o daños graves', 'HIGH'),
((SELECT id FROM incident_types WHERE code = 'ACCIDENT'), 'ACCIDENT_BLOCKING', 'Accidente Bloqueante', 'Accidente que bloquea completamente la vía', 'CRITICAL'),

-- Jam subtypes
((SELECT id FROM incident_types WHERE code = 'JAM'), 'JAM_MODERATE', 'Congestión Moderada', 'Tráfico lento pero fluido', 'LOW'),
((SELECT id FROM incident_types WHERE code = 'JAM'), 'JAM_HEAVY', 'Congestión Pesada', 'Tráfico muy lento', 'MEDIUM'),
((SELECT id FROM incident_types WHERE code = 'JAM'), 'JAM_STANDSTILL', 'Tráfico Parado', 'Tráfico completamente detenido', 'HIGH'),

-- Hazard subtypes
((SELECT id FROM incident_types WHERE code = 'HAZARD'), 'HAZARD_ON_ROAD', 'Peligro en Calzada', 'Objetos o sustancias peligrosas en la vía', 'HIGH'),
((SELECT id FROM incident_types WHERE code = 'HAZARD'), 'HAZARD_ON_SHOULDER', 'Peligro en Banquina', 'Peligros en la banquina o arcén', 'MEDIUM'),
((SELECT id FROM incident_types WHERE code = 'HAZARD'), 'HAZARD_WEATHER', 'Peligro Climático', 'Condiciones climáticas peligrosas', 'HIGH'),

-- Weather subtypes
((SELECT id FROM incident_types WHERE code = 'WEATHER'), 'WEATHER_FOG', 'Niebla', 'Visibilidad reducida por niebla', 'MEDIUM'),
((SELECT id FROM incident_types WHERE code = 'WEATHER'), 'WEATHER_RAIN', 'Lluvia', 'Precipitaciones que afectan la visibilidad', 'LOW'),
((SELECT id FROM incident_types WHERE code = 'WEATHER'), 'WEATHER_SNOW', 'Nieve', 'Condiciones invernales', 'HIGH'),
((SELECT id FROM incident_types WHERE code = 'WEATHER'), 'WEATHER_ICE', 'Hielo', 'Superficies congeladas', 'CRITICAL'),

-- Roadwork subtypes
((SELECT id FROM incident_types WHERE code = 'ROADWORK'), 'ROADWORK_CONSTRUCTION', 'Construcción', 'Trabajos de construcción en la vía', 'MEDIUM'),
((SELECT id FROM incident_types WHERE code = 'ROADWORK'), 'ROADWORK_MAINTENANCE', 'Mantenimiento', 'Trabajos de mantenimiento', 'LOW'),
((SELECT id FROM incident_types WHERE code = 'ROADWORK'), 'ROADWORK_UTILITIES', 'Servicios Públicos', 'Trabajos de servicios públicos', 'MEDIUM')
ON CONFLICT (type_id, code) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (category, key, value, value_type, description, is_system) VALUES
('database', 'max_connections', '20', 'number', 'Número máximo de conexiones simultáneas', true),
('email', 'enabled', 'true', 'boolean', 'Habilitar envío de notificaciones por email', false),
('email', 'smtp_host', 'smtp.gmail.com', 'string', 'Servidor SMTP para envío de emails', false),
('email', 'smtp_port', '587', 'number', 'Puerto del servidor SMTP', false),
('email', 'from_address', 'noreply@casisasa.com', 'string', 'Dirección de email usada como remitente', false),
('notifications', 'enabled', 'true', 'boolean', 'Habilitar sistema de notificaciones push', false),
('notifications', 'retention_days', '30', 'number', 'Días para mantener notificaciones en el sistema', false),
('notifications', 'critical_alert_emails', 'admin@casisasa.com,supervisor@casisasa.com', 'string', 'Emails separados por coma para alertas críticas', false),
('security', 'session_timeout', '480', 'number', 'Minutos antes de que expire la sesión automáticamente', false),
('security', 'password_min_length', '8', 'number', 'Caracteres mínimos requeridos para contraseñas', false),
('security', 'two_factor_enabled', 'false', 'boolean', 'Requerir autenticación de dos factores', false),
('system', 'timezone', 'America/Argentina/Cordoba', 'string', 'Zona horaria del sistema', true),
('system', 'log_level', 'info', 'string', 'Nivel de detalle para los logs del sistema', false),
('system', 'maintenance_mode', 'false', 'boolean', 'Activar modo mantenimiento (solo administradores)', false)
ON CONFLICT (category, key) DO NOTHING;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_incident_types_updated_at BEFORE UPDATE ON incident_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incident_subtypes_updated_at BEFORE UPDATE ON incident_subtypes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sso_providers_updated_at BEFORE UPDATE ON sso_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

