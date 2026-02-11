-- ===========================================
-- MIGRACIÓN 027: is_active en polygon_groups
-- ===========================================
ALTER TABLE polygon_groups
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE polygon_groups SET is_active = true WHERE is_active IS NULL;
