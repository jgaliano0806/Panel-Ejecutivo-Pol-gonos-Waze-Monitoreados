-- ===========================================
-- MIGRATION: 048_postgresql_timeouts
-- Configura timeouts para evitar conexiones zombie y queries lentas
-- ===========================================

-- 1. Timeout para transacciones idle (conexiones que abren transacción y no la cierran)
-- Mata conexiones que están en estado "idle in transaction" por más de 5 minutos
ALTER DATABASE panel_waze SET idle_in_transaction_session_timeout = '5min';

-- 2. Timeout para statements (queries que tardan demasiado)
-- Cancela queries que toman más de 30 segundos
ALTER DATABASE panel_waze SET statement_timeout = '30s';

-- NOTA: Para aplicar sin reiniciar, ejecutar manualmente en la sesión actual:
-- SET idle_in_transaction_session_timeout = '5min';
-- SET statement_timeout = '30s';

-- Verificar configuración:
-- SHOW idle_in_transaction_session_timeout;
-- SHOW statement_timeout;

COMMENT ON DATABASE panel_waze IS 'Panel Waze con timeouts configurados: idle_in_transaction=5min, statement=30s';
