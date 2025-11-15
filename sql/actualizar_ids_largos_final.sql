-- ACTUALIZACIÓN FINAL: Cambiar los 6 IDs largos restantes en customers_
-- Estos clientes NO tienen programas de lealtad, así que es seguro cambiarlos

UPDATE customers_ 
SET id = mapeo.id_nuevo
FROM (
    WITH ids_disponibles AS (
        SELECT generate_series(713, 720) as id_disponible
    ),
    ids_ocupados AS (
        SELECT id::INTEGER as id_ocupado 
        FROM customers_ 
        WHERE id ~ '^[0-9]+$'
    ),
    ids_libres AS (
        SELECT id_disponible 
        FROM ids_disponibles
        WHERE id_disponible NOT IN (SELECT id_ocupado FROM ids_ocupados)
    ),
    clientes_largos AS (
        SELECT 
            id as id_original,
            ROW_NUMBER() OVER (ORDER BY id) as orden
        FROM customers_ 
        WHERE LENGTH(id) > 3
        ORDER BY id
    ),
    mapeo_final AS (
        SELECT 
            cl.id_original,
            il.id_disponible::TEXT as id_nuevo
        FROM clientes_largos cl
        JOIN (
            SELECT id_disponible, ROW_NUMBER() OVER (ORDER BY id_disponible) as orden
            FROM ids_libres
        ) il ON cl.orden = il.orden
    )
    SELECT id_original, id_nuevo
    FROM mapeo_final
) AS mapeo
WHERE customers_.id = mapeo.id_original;