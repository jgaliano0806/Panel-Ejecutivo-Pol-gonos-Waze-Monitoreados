-- Migration: 020_remove_duplicate_subtypes.sql
-- Description: Elimina subtipos duplicados manteniendo el que tiene mejor traducción
-- Created: 2026-01-26

-- ============================================================================
-- Eliminar subtipos duplicados del tipo HAZARD
-- Mantener los que tienen las traducciones correctas (los primeros agregados)
-- ============================================================================

DO $$
DECLARE
    v_hazard_id INTEGER;
    v_duplicate_codes TEXT[] := ARRAY[
        'HAZARD_WEATHER',
        'HAZARD_ON_ROAD_POT_HOLE', 
        'HAZARD_ON_ROAD_CONSTRUCTION',
        'HAZARD_ON_SHOULDER_CAR_STOPPED',
        'HAZARD_ON_ROAD_OBJECT',
        'HAZARD_WEATHER_FLOOD'
    ];
    v_code TEXT;
    v_min_id INTEGER;
BEGIN
    SELECT id INTO v_hazard_id FROM incident_types WHERE code = 'HAZARD';
    
    IF v_hazard_id IS NOT NULL THEN
        FOREACH v_code IN ARRAY v_duplicate_codes LOOP
            -- Encontrar el ID mínimo (el original con mejor traducción)
            SELECT MIN(id) INTO v_min_id 
            FROM incident_subtypes 
            WHERE type_id = v_hazard_id AND code = v_code;
            
            -- Eliminar duplicados manteniendo el ID mínimo
            IF v_min_id IS NOT NULL THEN
                DELETE FROM incident_subtypes 
                WHERE type_id = v_hazard_id 
                AND code = v_code 
                AND id > v_min_id;
                
                IF FOUND THEN
                    RAISE NOTICE 'Eliminados duplicados de % en HAZARD', v_code;
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- Actualizar traducciones de los subtipos que quedaron sin traducir
-- ============================================================================

-- Corregir HAZARD_WEATHER_FLOOD que tiene severidad incorrecta
UPDATE incident_subtypes SET 
    severity = 'CRITICAL',
    description = 'Agua acumulada en la calzada'
WHERE code = 'HAZARD_WEATHER_FLOOD' 
AND type_id = (SELECT id FROM incident_types WHERE code = 'HAZARD');

-- Corregir HAZARD_ON_ROAD_POT_HOLE severidad
UPDATE incident_subtypes SET 
    severity = 'MEDIUM'
WHERE code = 'HAZARD_ON_ROAD_POT_HOLE'
AND type_id = (SELECT id FROM incident_types WHERE code = 'HAZARD');

-- ============================================================================
-- Limpiar subtipos huérfanos de tipos desactivados
-- ============================================================================
DELETE FROM incident_subtypes 
WHERE type_id IN (
    SELECT id FROM incident_types WHERE is_active = false
);

DO $$ BEGIN RAISE NOTICE '✅ Migración 020: Subtipos duplicados eliminados'; END $$;
