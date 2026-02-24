-- Migration: 005_auth_sessions.sql
-- Description: Create user_sessions table for multi-session JWT auth
-- Date: 2026-02-19
-- =====================================================
-- USER SESSIONS (Multi-session support)
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
-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
-- =====================================================
-- INSERT DEFAULT ADMIN USER
-- =====================================================
-- Password: Admin123! (bcrypt hash)
-- Generated with: bcrypt.hashSync('Admin123!', 10)
INSERT INTO users (
        email,
        first_name,
        last_name,
        phone,
        password_hash,
        is_active,
        email_verified
    )
VALUES (
        'admin@casisa.com',
        'Administrador',
        'Sistema',
        '+54 351 000-0000',
        '$2a$10$rKN3vGJO3pCGu.Rl5OXfqeJPFvU9yWNvBkWIVK1gQvJ7xjNpWdHXe',
        true,
        true
    ) ON CONFLICT (email) DO NOTHING;
-- Assign admin role to the default admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id,
    r.id
FROM users u,
    roles r
WHERE u.email = 'admin@casisa.com'
    AND r.name = 'Administrador' ON CONFLICT (user_id, role_id) DO NOTHING;
