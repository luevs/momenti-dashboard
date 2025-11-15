-- Crear el mapeo correcto entre IDs largos restantes y IDs en loyalty_programs
-- Necesitamos mapear los 6 IDs largos a IDs disponibles

-- Paso 1: Ver qué IDs están disponibles en el rango 713+ (después del último usado)
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
        razon_social,
        ROW_NUMBER() OVER (ORDER BY id) as orden
    FROM customers_ 
    WHERE LENGTH(id) > 3
    ORDER BY id
),
mapeo_final AS (
    SELECT 
        cl.id_original,
        cl.razon_social,
        il.id_disponible::TEXT as id_nuevo
    FROM clientes_largos cl
    JOIN (
        SELECT id_disponible, ROW_NUMBER() OVER (ORDER BY id_disponible) as orden
        FROM ids_libres
    ) il ON cl.orden = il.orden
)
SELECT 
    id_original as "ID Original",
    razon_social as "Cliente",
    id_nuevo as "ID Nuevo"
FROM mapeo_final
ORDER BY id_nuevo;