-- ===========================================
-- MIGRACIÓN 042: Generación automática de particiones de polygon_weather_data
--
-- Crea una función idempotente `ensure_weather_partitions(months_ahead INT)`
-- que detecta la última partición existente y genera las mensuales faltantes
-- hasta cubrir `months_ahead` meses hacia adelante desde hoy.
--
-- El OpenMeteoService la invoca al arrancar y cada 24 h, así nunca se queda
-- sin particiones futuras (Open-Meteo inserta ~1 fila/h por polígono).
-- ===========================================

CREATE OR REPLACE FUNCTION ensure_weather_partitions(months_ahead INTEGER DEFAULT 24)
RETURNS TABLE(created TEXT) AS $$
DECLARE
    last_upper        TIMESTAMPTZ;
    target_horizon    TIMESTAMPTZ;
    m_start           TIMESTAMPTZ;
    m_end             TIMESTAMPTZ;
    partition_name    TEXT;
BEGIN
    -- 1) Detectar bound superior de la última partición mensual existente.
    --    Se ignora la partición default (history) y cualquier partición que no
    --    siga el patrón estándar polygon_weather_data_yYYYYmMM.
    SELECT MAX(
        ( regexp_match(pg_get_expr(c.relpartbound, c.oid),
                       'TO \(''([^'']+)''\)') )[1]::TIMESTAMPTZ
    )
    INTO last_upper
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'polygon_weather_data'::regclass
      AND c.relname ~ '^polygon_weather_data_y[0-9]{4}m[0-9]{2}$';

    -- 2) Horizonte objetivo: inicio del mes (hoy + months_ahead + 1)
    target_horizon := date_trunc('month', NOW())
                      + ((months_ahead + 1) || ' months')::INTERVAL;

    -- 3) Si no había ninguna partición mensual, arrancar desde el mes actual
    IF last_upper IS NULL THEN
        last_upper := date_trunc('month', NOW());
    END IF;

    -- 4) Crear particiones mensuales hasta cubrir el horizonte
    WHILE last_upper < target_horizon LOOP
        m_start := last_upper;
        m_end   := m_start + INTERVAL '1 month';
        partition_name := 'polygon_weather_data_y'
                          || to_char(m_start AT TIME ZONE 'UTC', 'YYYY')
                          || 'm'
                          || to_char(m_start AT TIME ZONE 'UTC', 'MM');

        BEGIN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF polygon_weather_data '
                || 'FOR VALUES FROM (%L) TO (%L)',
                partition_name, m_start, m_end
            );
            created := partition_name;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ensure_weather_partitions skip %: %',
                         partition_name, SQLERRM;
        END;

        last_upper := m_end;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ensure_weather_partitions(INTEGER) IS
  'Crea las particiones mensuales faltantes de polygon_weather_data para cubrir N meses hacia adelante. Idempotente.';

-- Ejecutar al aplicar la migración para garantizar buffer de 24 meses.
SELECT * FROM ensure_weather_partitions(24);
