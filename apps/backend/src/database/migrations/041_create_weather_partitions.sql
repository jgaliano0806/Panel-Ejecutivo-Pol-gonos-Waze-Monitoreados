-- ===========================================
-- MIGRACIÓN 041: Crear particiones faltantes de polygon_weather_data
-- La tabla es particionada por rango de fechas (timestamp).
-- Falta la partición de marzo 2026 (y meses futuros).
-- ===========================================

DO $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    month_iter DATE;
BEGIN
    -- Crear particiones desde marzo 2026 hasta diciembre 2026
    month_iter := '2026-03-01'::DATE;

    WHILE month_iter < '2027-01-01'::DATE LOOP
        partition_name := 'polygon_weather_data_y' || TO_CHAR(month_iter, 'YYYY') || 'm' || TO_CHAR(month_iter, 'MM');
        start_date := month_iter;
        end_date := month_iter + INTERVAL '1 month';

        -- Verificar si la partición ya existe antes de crearla
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF polygon_weather_data FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                start_date,
                end_date
            );
            RAISE NOTICE 'Partición % creada', partition_name;
        ELSE
            RAISE NOTICE 'Partición % ya existe, omitiendo', partition_name;
        END IF;

        month_iter := month_iter + INTERVAL '1 month';
    END LOOP;
END $$;
