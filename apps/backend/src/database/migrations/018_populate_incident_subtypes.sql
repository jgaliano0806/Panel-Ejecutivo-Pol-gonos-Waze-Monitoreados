-- Migration: 018_populate_incident_subtypes.sql
-- Description: Poblar subtipos de incidentes con traducciones al español
-- Esta migración asegura que existan los subtipos más comunes con traducciones correctas
-- Created: 2026-01-26

-- ============================================================================
-- SUBTIPOS DE ACCIDENTES (type_id de ACCIDENT)
-- ============================================================================
DO $$
DECLARE
    v_accident_id INTEGER;
    v_jam_id INTEGER;
    v_hazard_id INTEGER;
    v_weatherhazard_id INTEGER;
    v_road_closed_id INTEGER;
    v_construction_id INTEGER;
    v_police_id INTEGER;
BEGIN
    -- Obtener IDs de tipos existentes
    SELECT id INTO v_accident_id FROM incident_types WHERE code = 'ACCIDENT';
    SELECT id INTO v_jam_id FROM incident_types WHERE code = 'JAM';
    SELECT id INTO v_hazard_id FROM incident_types WHERE code = 'HAZARD';
    SELECT id INTO v_weatherhazard_id FROM incident_types WHERE code = 'WEATHERHAZARD';
    SELECT id INTO v_road_closed_id FROM incident_types WHERE code = 'ROAD_CLOSED';
    SELECT id INTO v_construction_id FROM incident_types WHERE code = 'CONSTRUCTION';
    SELECT id INTO v_police_id FROM incident_types WHERE code = 'POLICE';

    -- ========================================================================
    -- SUBTIPOS DE ACCIDENTES
    -- ========================================================================
    IF v_accident_id IS NOT NULL THEN
        INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active)
        VALUES
            (v_accident_id, 'ACCIDENT_MINOR', 'Accidente leve', 'Accidente con daños menores, sin heridos graves', 'MEDIUM', true),
            (v_accident_id, 'ACCIDENT_MAJOR', 'Colisión múltiple', 'Accidente grave con múltiples vehículos involucrados', 'CRITICAL', true),
            (v_accident_id, 'ACCIDENT_OTHER_SIDE', 'Accidente al otro lado', 'Accidente reportado en el carril contrario', 'LOW', true)
        ON CONFLICT (type_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    -- ========================================================================
    -- SUBTIPOS DE CONGESTIÓN
    -- ========================================================================
    IF v_jam_id IS NOT NULL THEN
        INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active)
        VALUES
            (v_jam_id, 'JAM_LIGHT_TRAFFIC', 'Tránsito lento', 'Flujo de tráfico reducido pero circulando', 'LOW', true),
            (v_jam_id, 'JAM_MODERATE_TRAFFIC', 'Tránsito denso', 'Congestión moderada con demoras', 'MEDIUM', true),
            (v_jam_id, 'JAM_HEAVY_TRAFFIC', 'Embotellamiento', 'Congestión severa con tráfico muy lento', 'HIGH', true),
            (v_jam_id, 'JAM_STAND_STILL_TRAFFIC', 'Tránsito detenido', 'Tráfico completamente detenido', 'CRITICAL', true)
        ON CONFLICT (type_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    -- ========================================================================
    -- SUBTIPOS DE PELIGROS
    -- ========================================================================
    IF v_hazard_id IS NOT NULL THEN
        INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active)
        VALUES
            -- Peligros en calzada
            (v_hazard_id, 'HAZARD_ON_ROAD', 'Peligro en calzada', 'Peligro genérico en la calzada', 'MEDIUM', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_OBJECT', 'Objeto en calzada', 'Objeto obstruyendo parcialmente la vía', 'HIGH', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_POT_HOLE', 'Bache', 'Bache o hueco en el pavimento', 'MEDIUM', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_ROAD_KILL', 'Animal muerto en calzada', 'Animal atropellado en la vía', 'MEDIUM', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_LANE_CLOSED', 'Carril cerrado', 'Uno o más carriles cerrados', 'HIGH', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_OIL', 'Derrame de aceite', 'Superficie resbaladiza por derrame', 'HIGH', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_ICE', 'Hielo en calzada', 'Superficie congelada o resbaladiza', 'CRITICAL', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_CONSTRUCTION', 'Obras', 'Trabajos de construcción en la vía', 'MEDIUM', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_CAR_STOPPED', 'Vehículo detenido en carril', 'Vehículo parado obstruyendo el tráfico', 'HIGH', true),
            (v_hazard_id, 'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT', 'Semáforo averiado', 'Semáforo sin funcionar correctamente', 'HIGH', true),
            -- Peligros en banquina
            (v_hazard_id, 'HAZARD_ON_SHOULDER', 'Vehículo en banquina', 'Vehículo detenido en el arcén', 'LOW', true),
            (v_hazard_id, 'HAZARD_ON_SHOULDER_CAR_STOPPED', 'Vehículo en banquina', 'Vehículo averiado en el arcén', 'LOW', true),
            (v_hazard_id, 'HAZARD_ON_SHOULDER_ANIMALS', 'Animales en banquina', 'Presencia de animales cerca de la vía', 'MEDIUM', true),
            (v_hazard_id, 'HAZARD_ON_SHOULDER_MISSING_SIGN', 'Señal faltante', 'Señalización vial ausente o dañada', 'MEDIUM', true)
        ON CONFLICT (type_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    -- ========================================================================
    -- SUBTIPOS DE CLIMA
    -- ========================================================================
    IF v_weatherhazard_id IS NOT NULL THEN
        INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active)
        VALUES
            (v_weatherhazard_id, 'HAZARD_WEATHER', 'Mal tiempo', 'Condiciones climáticas adversas genéricas', 'MEDIUM', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_FOG', 'Niebla', 'Visibilidad reducida por niebla', 'HIGH', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_HAIL', 'Granizo', 'Precipitación de granizo', 'HIGH', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_HEAVY_RAIN', 'Mal tiempo', 'Lluvia intensa reduciendo visibilidad', 'HIGH', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_HEAVY_SNOW', 'Nieve en el camino', 'Acumulación de nieve en la vía', 'CRITICAL', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_FLOOD', 'Inundación', 'Agua acumulada en la calzada', 'CRITICAL', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_MONSOON', 'Lluvia intensa', 'Lluvia torrencial', 'HIGH', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_TORNADO', 'Tornado', 'Tornado activo en la zona', 'CRITICAL', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_HEAT_WAVE', 'Ola de calor', 'Temperaturas extremadamente altas', 'MEDIUM', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_HURRICANE', 'Huracán', 'Condiciones de huracán', 'CRITICAL', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_FREEZING_RAIN', 'Camino con hielo', 'Lluvia que se congela al contacto', 'CRITICAL', true),
            (v_weatherhazard_id, 'HAZARD_WEATHER_SLIPPERY_ROAD', 'Camino resbaladizo', 'Superficie de la vía resbaladiza', 'HIGH', true)
        ON CONFLICT (type_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    -- ========================================================================
    -- SUBTIPOS DE CIERRE DE CAMINO
    -- ========================================================================
    IF v_road_closed_id IS NOT NULL THEN
        INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active)
        VALUES
            (v_road_closed_id, 'ROAD_CLOSED_HAZARD', 'Cierre por peligro', 'Vía cerrada por situación de peligro', 'HIGH', true),
            (v_road_closed_id, 'ROAD_CLOSED_CONSTRUCTION', 'Cierre por obras', 'Vía cerrada por trabajos de construcción', 'MEDIUM', true),
            (v_road_closed_id, 'ROAD_CLOSED_EVENT', 'Cierre por evento', 'Vía cerrada por evento especial', 'MEDIUM', true)
        ON CONFLICT (type_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    -- ========================================================================
    -- SUBTIPOS DE POLICÍA
    -- ========================================================================
    IF v_police_id IS NOT NULL THEN
        INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active)
        VALUES
            (v_police_id, 'POLICE_VISIBLE', 'Policía visible', 'Control policial a la vista', 'LOW', true),
            (v_police_id, 'POLICE_HIDDEN', 'Policía oculto', 'Control policial no visible', 'MEDIUM', true),
            (v_police_id, 'POLICE_SPEED_TRAP', 'Radar móvil', 'Control de velocidad activo', 'MEDIUM', true),
            (v_police_id, 'POLICE_OTHER_SIDE', 'Policía al otro lado', 'Control policial en carril contrario', 'LOW', true)
        ON CONFLICT (type_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    RAISE NOTICE '✅ Migración 018: Subtipos de incidentes poblados con traducciones al español';
END $$;
