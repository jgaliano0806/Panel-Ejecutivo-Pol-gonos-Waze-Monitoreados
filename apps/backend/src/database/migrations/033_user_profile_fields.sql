-- Migration: 031_user_profile_fields.sql
-- Description: Agrega campos para cambio obligatorio de contraseña y avatar de usuario
-- Idempotente: usa IF NOT EXISTS / DO $$ bloques condicionales
-- Date: 2026-02-27
-- =====================================================
-- 1. must_change_password — flag para forzar cambio en primer login
-- =====================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'must_change_password'
) THEN
ALTER TABLE users
ADD COLUMN must_change_password BOOLEAN DEFAULT true;
-- El admin existente no necesita cambiar contraseña
UPDATE users
SET must_change_password = false
WHERE email = 'admin@casisa.com';
END IF;
END;
$$;
-- =====================================================
-- 2. avatar_url — ruta de la imagen de perfil
-- =====================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'avatar_url'
) THEN
ALTER TABLE users
ADD COLUMN avatar_url VARCHAR(500);
END IF;
END;
$$;
