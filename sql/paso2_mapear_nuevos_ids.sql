-- PASO 2: Generar mapeo de IDs largos a nuevos IDs empezando desde 420

-- Primero, crear una tabla temporal con el mapeo
WITH clientes_largos AS (
    SELECT DISTINCT customer_id
    FROM loyalty_programs 
    WHERE LENGTH(customer_id) > 3
    ORDER BY customer_id
),
mapeo_nuevos_ids AS (
    SELECT 
        customer_id as id_original,
        (420 + ROW_NUMBER() OVER (ORDER BY customer_id) - 1)::TEXT as id_nuevo
    FROM clientes_largos
)
SELECT 
    id_original as "ID Original",
    id_nuevo as "ID Nuevo"
FROM mapeo_nuevos_ids
ORDER BY id_original;

-- Script para actualizar loyalty_programs
-- (Ejecutar después de revisar el mapeo anterior)

/*
UPDATE loyalty_programs 
SET customer_id = mapeo.id_nuevo
FROM (
    WITH clientes_largos AS (
        SELECT DISTINCT customer_id
        FROM loyalty_programs 
        WHERE LENGTH(customer_id) > 3
        ORDER BY customer_id
    ),
    mapeo_nuevos_ids AS (
        SELECT 
            customer_id as id_original,
            (420 + ROW_NUMBER() OVER (ORDER BY customer_id) - 1)::TEXT as id_nuevo
        FROM clientes_largos
    )
    SELECT id_original, id_nuevo
    FROM mapeo_nuevos_ids
) AS mapeo
WHERE loyalty_programs.customer_id = mapeo.id_original;
*/