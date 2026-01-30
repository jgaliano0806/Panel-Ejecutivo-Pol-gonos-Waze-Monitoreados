-- Migration: 019_cleanup_duplicate_types.sql
-- Description: Limpia tipos duplicados y actualiza traducciones faltantes
-- Created: 2026-01-26

-- ============================================================================
-- PASO 1: Actualizar subtipos del tipo "hazard" (id:10) con traducciones
-- ============================================================================
UPDATE incident_subtypes SET 
    name = 'Condiciones Climáticas',
    description = 'Condiciones climáticas peligrosas'
WHERE code = 'HAZARD_WEATHER' AND type_id = (SELECT id FROM incident_types WHERE code = 'hazard');

UPDATE incident_subtypes SET 
    name = 'Inundación',
    description = 'Agua acumulada en la calzada'
WHERE code = 'HAZARD_WEATHER_FLOOD' AND type_id = (SELECT id FROM incident_types WHERE code = 'hazard');

UPDATE incident_subtypes SET 
    name = 'Bache',
    description = 'Bache o hueco en el pavimento'
WHERE code = 'HAZARD_ON_ROAD_POT_HOLE' AND type_id = (SELECT id FROM incident_types WHERE code = 'hazard');

UPDATE incident_subtypes SET 
    name = 'Obras',
    description = 'Trabajos de construcción en la vía'
WHERE code = 'HAZARD_ON_ROAD_CONSTRUCTION' AND type_id = (SELECT id FROM incident_types WHERE code = 'hazard');

UPDATE incident_subtypes SET 
    name = 'Vehículo en banquina',
    description = 'Vehículo averiado en el arcén'
WHERE code = 'HAZARD_ON_SHOULDER_CAR_STOPPED' AND type_id = (SELECT id FROM incident_types WHERE code = 'hazard');

UPDATE incident_subtypes SET 
    name = 'Objeto en calzada',
    description = 'Objeto obstruyendo parcialmente la vía'
WHERE code = 'HAZARD_ON_ROAD_OBJECT' AND type_id = (SELECT id FROM incident_types WHERE code = 'hazard');

-- ============================================================================
-- PASO 2: Actualizar tipos duplicados en minúsculas con traducciones correctas
-- ============================================================================
UPDATE incident_types SET 
    name = 'Siniestro vial',
    description = 'Accidentes de tránsito reportados por usuarios',
    icon = 'car',
    color = '#ef4444'
WHERE code = 'accident';

UPDATE incident_types SET 
    name = 'Peligro en la vía',
    description = 'Situaciones peligrosas en la vía que requieren atención',
    icon = 'alert-triangle',
    color = '#dc2626'
WHERE code = 'hazard';

UPDATE incident_types SET 
    name = 'Congestión',
    description = 'Tráfico congestionado y lentitud en las vías',
    icon = 'clock',
    color = '#f97316'
WHERE code = 'jam';

UPDATE incident_types SET 
    name = 'Corte de ruta',
    description = 'Caminos cerrados temporal o permanentemente',
    icon = 'x-circle',
    color = '#dc2626'
WHERE code = 'roadclosed';

-- ============================================================================
-- PASO 3: Mover subtipos de tipos duplicados al tipo principal
-- ============================================================================

-- Mover subtipos de 'hazard' (minúscula) a 'HAZARD' (mayúscula) si no existen
DO $$
DECLARE
    v_hazard_lower_id INTEGER;
    v_hazard_upper_id INTEGER;
    v_subtype RECORD;
BEGIN
    SELECT id INTO v_hazard_lower_id FROM incident_types WHERE code = 'hazard';
    SELECT id INTO v_hazard_upper_id FROM incident_types WHERE code = 'HAZARD';
    
    IF v_hazard_lower_id IS NOT NULL AND v_hazard_upper_id IS NOT NULL THEN
        FOR v_subtype IN SELECT * FROM incident_subtypes WHERE type_id = v_hazard_lower_id LOOP
            -- Si no existe en HAZARD, moverlo
            IF NOT EXISTS (SELECT 1 FROM incident_subtypes WHERE type_id = v_hazard_upper_id AND code = v_subtype.code) THEN
                UPDATE incident_subtypes SET type_id = v_hazard_upper_id WHERE id = v_subtype.id;
                RAISE NOTICE 'Movido subtipo % de hazard a HAZARD', v_subtype.code;
            END IF;
        END LOOP;
    END IF;
END $$;

-- Mover subtipos de 'roadclosed' (minúscula) a 'ROAD_CLOSED' (mayúscula) si no existen
DO $$
DECLARE
    v_rc_lower_id INTEGER;
    v_rc_upper_id INTEGER;
    v_subtype RECORD;
BEGIN
    SELECT id INTO v_rc_lower_id FROM incident_types WHERE code = 'roadclosed';
    SELECT id INTO v_rc_upper_id FROM incident_types WHERE code = 'ROAD_CLOSED';
    
    IF v_rc_lower_id IS NOT NULL AND v_rc_upper_id IS NOT NULL THEN
        FOR v_subtype IN SELECT * FROM incident_subtypes WHERE type_id = v_rc_lower_id LOOP
            -- Si no existe en ROAD_CLOSED, moverlo
            IF NOT EXISTS (SELECT 1 FROM incident_subtypes WHERE type_id = v_rc_upper_id AND code = v_subtype.code) THEN
                UPDATE incident_subtypes SET type_id = v_rc_upper_id WHERE id = v_subtype.id;
                RAISE NOTICE 'Movido subtipo % de roadclosed a ROAD_CLOSED', v_subtype.code;
            END IF;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Desactivar tipos duplicados (mantenerlos por historial)
-- ============================================================================
UPDATE incident_types SET is_active = false WHERE code IN ('accident', 'hazard', 'jam', 'roadclosed');

-- Notificación final
DO $$ BEGIN RAISE NOTICE '✅ Migración 019: Tipos duplicados limpiados y traducciones actualizadas'; END $$;
