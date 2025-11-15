-- PASO 3: Actualizar customers_ para que coincida con loyalty_programs
-- ¡EJECUTAR INMEDIATAMENTE!

UPDATE customers_ 
SET id = mapeo.id_nuevo
FROM (
    WITH clientes_largos AS (
        SELECT DISTINCT customer_id
        FROM loyalty_programs 
        WHERE customer_id ~ '^[0-9]+$' AND LENGTH(customer_id) = 3
        -- Estos son los IDs YA actualizados en loyalty_programs (420, 421, etc.)
    ),
    ids_originales AS (
        -- Necesitamos reconstruir el mapeo desde los IDs actuales en loyalty_programs
        SELECT 
            customer_id as id_nuevo,
            (420 + ROW_NUMBER() OVER (ORDER BY customer_id::INTEGER) - 1) as posicion
        FROM clientes_largos
        ORDER BY customer_id::INTEGER
    ),
    mapeo_reverso AS (
        -- Aquí necesitamos los IDs originales de customers_
        SELECT DISTINCT id as id_original
        FROM customers_ 
        WHERE LENGTH(id) > 3
        ORDER BY id
    ),
    mapeo_final AS (
        SELECT 
            mr.id_original,
            (420 + ROW_NUMBER() OVER (ORDER BY mr.id_original) - 1)::TEXT as id_nuevo
        FROM mapeo_reverso mr
    )
    SELECT id_original, id_nuevo
    FROM mapeo_final
) AS mapeo
WHERE customers_.id = mapeo.id_original;