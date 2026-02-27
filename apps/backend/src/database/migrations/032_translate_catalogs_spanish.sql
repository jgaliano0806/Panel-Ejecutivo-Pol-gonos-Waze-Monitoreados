-- ===========================================
-- Traducir catálogos de incidentes a español (contexto vial argentino)
-- Corrige entradas creadas por sync con nombres en inglés crudo
-- ===========================================

-- ===================== SUBTIPOS =====================

-- Peligros en calzada
UPDATE incident_subtypes SET name = 'Bache', description = 'Bache o hueco en el pavimento', severity = 'MEDIUM'
  WHERE code = 'HAZARD_ON_ROAD_POT_HOLE' AND (name ILIKE '%HAZARD ON ROAD%' OR name = code);

UPDATE incident_subtypes SET name = 'Obras en calzada', description = 'Trabajos de construcción en la vía', severity = 'MEDIUM'
  WHERE code = 'HAZARD_ON_ROAD_CONSTRUCTION' AND (name ILIKE '%HAZARD ON ROAD%' OR name = code);

UPDATE incident_subtypes SET name = 'Vehículo en banquina', description = 'Vehículo averiado en la banquina', severity = 'MEDIUM'
  WHERE code = 'HAZARD_ON_SHOULDER_CAR_STOPPED' AND (name ILIKE '%HAZARD ON SHOULDER%' OR name = code);

UPDATE incident_subtypes SET name = 'Peligro en calzada', description = 'Peligro genérico en la calzada', severity = 'HIGH'
  WHERE code = 'HAZARD_ON_ROAD' AND (name = 'En la Calzada' OR name = 'En La Calzada' OR name ILIKE '%HAZARD ON ROAD' OR name = code);

UPDATE incident_subtypes SET name = 'Vehículo en banquina', description = 'Vehículo detenido en el arcén', severity = 'MEDIUM'
  WHERE code = 'HAZARD_ON_SHOULDER' AND (name = 'En la Banquina' OR name = 'En La Banquina' OR name ILIKE '%HAZARD ON SHOULDER' OR name = code);

UPDATE incident_subtypes SET name = 'Peligro climático', description = 'Condiciones climáticas peligrosas', severity = 'HIGH'
  WHERE code = 'HAZARD_WEATHER' AND (name = 'Condiciones Climáticas' OR name ILIKE '%HAZARD WEATHER' OR name = code);

UPDATE incident_subtypes SET name = 'Objeto en calzada', description = 'Objeto obstruyendo parcialmente la vía', severity = 'HIGH'
  WHERE code = 'HAZARD_ON_ROAD_OBJECT' AND (name ILIKE '%HAZARD%' OR name = code);

UPDATE incident_subtypes SET name = 'Animal muerto en calzada', description = 'Animal atropellado en la vía', severity = 'MEDIUM'
  WHERE code = 'HAZARD_ON_ROAD_ROAD_KILL' AND (name ILIKE '%HAZARD%' OR name ILIKE '%ROAD KILL%' OR name = code);

UPDATE incident_subtypes SET name = 'Hielo en calzada', description = 'Superficie congelada o resbaladiza', severity = 'CRITICAL'
  WHERE code = 'HAZARD_ON_ROAD_ICE' AND (name ILIKE '%HAZARD%' OR name = code);

UPDATE incident_subtypes SET name = 'Vehículo detenido en carril', description = 'Vehículo parado obstruyendo el tráfico', severity = 'HIGH'
  WHERE code = 'HAZARD_ON_ROAD_CAR_STOPPED' AND (name ILIKE '%HAZARD%' OR name ILIKE '%CAR STOPPED%' OR name = code);

UPDATE incident_subtypes SET name = 'Semáforo averiado', description = 'Semáforo sin funcionar correctamente', severity = 'HIGH'
  WHERE code = 'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT' AND (name ILIKE '%HAZARD%' OR name ILIKE '%TRAFFIC LIGHT%' OR name = code);

UPDATE incident_subtypes SET name = 'Carril cerrado', description = 'Uno o más carriles cerrados', severity = 'HIGH'
  WHERE code = 'HAZARD_ON_ROAD_LANE_CLOSED' AND (name ILIKE '%HAZARD%' OR name ILIKE '%LANE CLOSED%' OR name = code);

UPDATE incident_subtypes SET name = 'Derrame de aceite', description = 'Superficie resbaladiza por derrame', severity = 'HIGH'
  WHERE code = 'HAZARD_ON_ROAD_OIL' AND (name ILIKE '%HAZARD%' OR name ILIKE '%OIL%' OR name = code);

UPDATE incident_subtypes SET name = 'Animales en banquina', description = 'Presencia de animales cerca de la vía', severity = 'MEDIUM'
  WHERE code = 'HAZARD_ON_SHOULDER_ANIMALS' AND (name ILIKE '%HAZARD%' OR name ILIKE '%ANIMALS%' OR name = code);

UPDATE incident_subtypes SET name = 'Señal faltante', description = 'Señalización vial ausente o dañada', severity = 'LOW'
  WHERE code = 'HAZARD_ON_SHOULDER_MISSING_SIGN' AND (name ILIKE '%HAZARD%' OR name ILIKE '%MISSING%' OR name = code);

-- Peligros climáticos
UPDATE incident_subtypes SET name = 'Niebla', description = 'Visibilidad reducida por niebla', severity = 'MEDIUM'
  WHERE code = 'HAZARD_WEATHER_FOG' AND (name ILIKE '%HAZARD%' OR name ILIKE '%FOG%' OR name = code);

UPDATE incident_subtypes SET name = 'Granizo', description = 'Precipitación de granizo', severity = 'HIGH'
  WHERE code = 'HAZARD_WEATHER_HAIL' AND (name ILIKE '%HAZARD%' OR name ILIKE '%HAIL%' OR name = code);

UPDATE incident_subtypes SET name = 'Lluvia intensa', description = 'Lluvia intensa reduciendo visibilidad', severity = 'HIGH'
  WHERE code = 'HAZARD_WEATHER_HEAVY_RAIN' AND (name ILIKE '%HAZARD%' OR name ILIKE '%HEAVY RAIN%' OR name = code);

UPDATE incident_subtypes SET name = 'Nieve en el camino', description = 'Acumulación de nieve en la vía', severity = 'CRITICAL'
  WHERE code = 'HAZARD_WEATHER_HEAVY_SNOW' AND (name ILIKE '%HAZARD%' OR name ILIKE '%HEAVY SNOW%' OR name = code);

UPDATE incident_subtypes SET name = 'Inundación', description = 'Agua acumulada en la calzada', severity = 'CRITICAL'
  WHERE code = 'HAZARD_WEATHER_FLOOD' AND (name ILIKE '%HAZARD%' OR name ILIKE '%FLOOD%' OR name = code);

UPDATE incident_subtypes SET name = 'Lluvia torrencial', description = 'Lluvia torrencial', severity = 'HIGH'
  WHERE code = 'HAZARD_WEATHER_MONSOON' AND (name ILIKE '%HAZARD%' OR name ILIKE '%MONSOON%' OR name = code);

UPDATE incident_subtypes SET name = 'Tornado', description = 'Tornado activo en la zona', severity = 'CRITICAL'
  WHERE code = 'HAZARD_WEATHER_TORNADO' AND (name ILIKE '%HAZARD%' OR name ILIKE '%TORNADO%' OR name = code);

UPDATE incident_subtypes SET name = 'Ola de calor', description = 'Temperaturas extremadamente altas', severity = 'MEDIUM'
  WHERE code = 'HAZARD_WEATHER_HEAT_WAVE' AND (name ILIKE '%HAZARD%' OR name ILIKE '%HEAT%' OR name = code);

UPDATE incident_subtypes SET name = 'Huracán', description = 'Condiciones de huracán', severity = 'CRITICAL'
  WHERE code = 'HAZARD_WEATHER_HURRICANE' AND (name ILIKE '%HAZARD%' OR name ILIKE '%HURRICANE%' OR name = code);

UPDATE incident_subtypes SET name = 'Camino con hielo', description = 'Lluvia que se congela al contacto', severity = 'CRITICAL'
  WHERE code = 'HAZARD_WEATHER_FREEZING_RAIN' AND (name ILIKE '%HAZARD%' OR name ILIKE '%FREEZING%' OR name = code);

UPDATE incident_subtypes SET name = 'Camino resbaladizo', description = 'Superficie de la vía resbaladiza', severity = 'HIGH'
  WHERE code = 'HAZARD_WEATHER_SLIPPERY_ROAD' AND (name ILIKE '%HAZARD%' OR name ILIKE '%SLIPPERY%' OR name = code);

-- Cierres de ruta
UPDATE incident_subtypes SET name = 'Cierre por obras', description = 'Vía cerrada por trabajos de construcción', severity = 'MEDIUM'
  WHERE code = 'ROAD_CLOSED_CONSTRUCTION' AND (name = 'Por Obras' OR name ILIKE '%ROAD CLOSED%' OR name = code);

UPDATE incident_subtypes SET name = 'Cierre por evento', description = 'Vía cerrada por evento especial', severity = 'HIGH'
  WHERE code = 'ROAD_CLOSED_EVENT' AND (name = 'Por Evento' OR name ILIKE '%ROAD CLOSED%' OR name = code);

UPDATE incident_subtypes SET name = 'Cierre por peligro', description = 'Vía cerrada por situación de peligro', severity = 'CRITICAL'
  WHERE code = 'ROAD_CLOSED_HAZARD' AND (name = 'Por Peligro' OR name ILIKE '%ROAD CLOSED%' OR name = code);

-- Accidentes
UPDATE incident_subtypes SET name = 'Accidente leve', description = 'Accidente con daños menores, sin heridos graves', severity = 'MEDIUM'
  WHERE code = 'ACCIDENT_MINOR' AND (name = 'Accidente Menor' OR name ILIKE '%ACCIDENT MINOR%' OR name = code);

UPDATE incident_subtypes SET name = 'Colisión múltiple', description = 'Accidente grave con múltiples vehículos involucrados', severity = 'HIGH'
  WHERE code = 'ACCIDENT_MAJOR' AND (name = 'Accidente Grave' OR name ILIKE '%ACCIDENT MAJOR%' OR name = code);

UPDATE incident_subtypes SET name = 'Accidente bloqueante', description = 'Accidente que bloquea completamente la vía', severity = 'CRITICAL'
  WHERE code = 'ACCIDENT_BLOCKING' AND (name ILIKE '%ACCIDENT BLOCKING%' OR name = code);

UPDATE incident_subtypes SET name = 'Accidente al otro lado', description = 'Accidente reportado en el carril contrario', severity = 'LOW'
  WHERE code = 'ACCIDENT_OTHER_SIDE' AND (name ILIKE '%ACCIDENT OTHER%' OR name = code);

-- Congestión
UPDATE incident_subtypes SET name = 'Congestión moderada', description = 'Tráfico lento pero fluido', severity = 'LOW'
  WHERE code = 'JAM_MODERATE' AND (name = 'Congestión Moderada' OR name ILIKE '%JAM MODERATE%' OR name = code);

UPDATE incident_subtypes SET name = 'Congestión pesada', description = 'Tráfico muy lento', severity = 'MEDIUM'
  WHERE code = 'JAM_HEAVY' AND (name = 'Congestión Pesada' OR name ILIKE '%JAM HEAVY' OR name = code);

UPDATE incident_subtypes SET name = 'Tráfico parado', description = 'Tráfico completamente detenido', severity = 'HIGH'
  WHERE code = 'JAM_STANDSTILL' AND (name = 'Tráfico Detenido' OR name ILIKE '%JAM STANDSTILL%' OR name = code);

UPDATE incident_subtypes SET name = 'Tránsito lento', description = 'Flujo de tráfico reducido pero circulando', severity = 'LOW'
  WHERE code = 'JAM_LIGHT_TRAFFIC' AND (name ILIKE '%JAM LIGHT%' OR name = code);

UPDATE incident_subtypes SET name = 'Tránsito denso', description = 'Congestión moderada con demoras', severity = 'MEDIUM'
  WHERE code = 'JAM_MODERATE_TRAFFIC' AND (name ILIKE '%JAM MODERATE%' OR name = code);

UPDATE incident_subtypes SET name = 'Embotellamiento', description = 'Congestión severa con tráfico muy lento', severity = 'HIGH'
  WHERE code = 'JAM_HEAVY_TRAFFIC' AND (name ILIKE '%JAM HEAVY%' OR name = code);

UPDATE incident_subtypes SET name = 'Tránsito detenido', description = 'Tráfico completamente detenido', severity = 'HIGH'
  WHERE code = 'JAM_STAND_STILL_TRAFFIC' AND (name ILIKE '%JAM STAND%' OR name = code);

-- Obras
UPDATE incident_subtypes SET name = 'Construcción', description = 'Trabajos de construcción en la vía', severity = 'MEDIUM'
  WHERE code = 'ROADWORK_CONSTRUCTION' AND (name ILIKE '%ROADWORK%' OR name = code);

UPDATE incident_subtypes SET name = 'Mantenimiento', description = 'Trabajos de mantenimiento', severity = 'LOW'
  WHERE code = 'ROADWORK_MAINTENANCE' AND (name ILIKE '%ROADWORK%' OR name = code);

UPDATE incident_subtypes SET name = 'Servicios públicos', description = 'Trabajos de servicios públicos', severity = 'MEDIUM'
  WHERE code = 'ROADWORK_UTILITIES' AND (name ILIKE '%ROADWORK%' OR name = code);

-- Policía
UPDATE incident_subtypes SET name = 'Policía visible', description = 'Control policial a la vista', severity = 'LOW'
  WHERE code = 'POLICE_VISIBLE' AND (name ILIKE '%POLICE%' OR name = code);

UPDATE incident_subtypes SET name = 'Policía oculto', description = 'Control policial no visible', severity = 'LOW'
  WHERE code = 'POLICE_HIDDEN' AND (name ILIKE '%POLICE%' OR name = code);

UPDATE incident_subtypes SET name = 'Radar móvil', description = 'Control de velocidad activo', severity = 'LOW'
  WHERE code = 'POLICE_SPEED_TRAP' AND (name ILIKE '%POLICE%' OR name ILIKE '%SPEED%' OR name = code);

UPDATE incident_subtypes SET name = 'Policía al otro lado', description = 'Control policial en carril contrario', severity = 'LOW'
  WHERE code = 'POLICE_OTHER_SIDE' AND (name ILIKE '%POLICE%' OR name = code);

-- ===================== TIPOS (padres) =====================

UPDATE incident_types SET name = 'Accidente vial', description = 'Incidentes relacionados con accidentes de tránsito'
  WHERE code = 'ACCIDENT' AND (name ILIKE '%accident%' OR name = code);

UPDATE incident_types SET name = 'Congestión de tránsito', description = 'Tráfico congestionado y lentitud en las vías'
  WHERE code = 'JAM' AND (name ILIKE '%jam%' OR name = code);

UPDATE incident_types SET name = 'Peligro en la vía', description = 'Situaciones peligrosas en la vía que requieren atención'
  WHERE code = 'HAZARD' AND (name ILIKE '%hazard%' OR name = code);

UPDATE incident_types SET name = 'Peligro meteorológico', description = 'Condiciones climáticas que afectan la seguridad vial'
  WHERE code = 'WEATHERHAZARD' AND (name ILIKE '%weather%' OR name = code);

UPDATE incident_types SET name = 'Camino cerrado', description = 'Cierres totales o parciales de caminos'
  WHERE code = 'ROAD_CLOSED' AND (name ILIKE '%road%closed%' OR name = code);

UPDATE incident_types SET name = 'Corte de ruta', description = 'Eventos que causan el cierre de caminos'
  WHERE code = 'ROAD_CLOSED_EVENT' AND (name ILIKE '%road%closed%event%' OR name = code);

UPDATE incident_types SET name = 'Obras en la vía', description = 'Trabajos de construcción y mantenimiento vial'
  WHERE code = 'CONSTRUCTION' AND (name ILIKE '%construction%' OR name = code);

UPDATE incident_types SET name = 'Policía', description = 'Presencia policial y controles en la vía'
  WHERE code = 'POLICE' AND (name ILIKE '%police%' OR name = code);

-- Actualizar timestamps
UPDATE incident_subtypes SET updated_at = CURRENT_TIMESTAMP WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '1 second';
UPDATE incident_types SET updated_at = CURRENT_TIMESTAMP WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '1 second';
