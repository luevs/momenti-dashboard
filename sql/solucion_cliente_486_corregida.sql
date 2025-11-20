-- SOLUCIÓN CORREGIDA PARA CLIENTE ID 486 "IC estampados"
-- Ejecutar DESPUÉS de verificar la estructura con verificar_estructura_tablas.sql

-- PASO 1: Buscar si el cliente ya existe en customers_ con nombre similar
SELECT 
    'BÚSQUEDA INICIAL' as paso,
    id, razon_social, alias, tipo_cliente
FROM customers_ 
WHERE id = '486'
   OR razon_social ILIKE '%IC%'
   OR alias ILIKE '%IC%'
   OR razon_social ILIKE '%estampados%'
ORDER BY id;

-- PASO 2: Ver qué datos tenemos en order_history
SELECT 
    'DATOS ORDER_HISTORY' as paso,
    customer_id, client_id, client_name, type,
    COUNT(*) as total_pedidos,
    SUM(meters_consumed) as metros_consumidos_total,
    MIN(recorded_at) as fecha_primer_pedido,
    MAX(recorded_at) as fecha_ultimo_pedido
FROM order_history 
WHERE customer_id = '486' 
   OR client_id = '486' 
   OR client_name ILIKE '%IC%'
   OR customer_id ILIKE '%IC%'
GROUP BY customer_id, client_id, client_name, type
ORDER BY fecha_primer_pedido;

-- PASO 3A: Si el cliente NO existe en customers_, crearlo
-- (Solo ejecutar si el PASO 1 no devolvió resultados)
INSERT INTO customers_ (id, razon_social, alias, tipo_cliente)
SELECT 
    '486',
    'IC estampados',
    'IC estampados',
    'Revendedor'
WHERE NOT EXISTS (
    SELECT 1 FROM customers_ 
    WHERE id = '486' 
       OR razon_social ILIKE '%IC estampados%'
       OR razon_social ILIKE '%IC%'
);

-- PASO 3B: Si el cliente existe pero con ID diferente, actualizar order_history
-- (Descomentar y ajustar el ID correcto si es necesario)
/*
-- Ejemplo: si el cliente real tiene ID '123' en lugar de '486'
UPDATE order_history 
SET customer_id = '123',  -- Reemplazar con el ID correcto encontrado en PASO 1
    client_id = '123'     -- También actualizar client_id para consistencia
WHERE (customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC%')
  AND customer_id != '123';  -- Evitar actualizar si ya es correcto
*/

-- PASO 4: Crear programa de lealtad si no existe
-- Primero verificar si ya tiene programa
SELECT 
    'VERIFICAR PROGRAMA EXISTENTE' as paso,
    customer_id, type, total_meters, remaining_meters
FROM loyalty_programs 
WHERE customer_id = '486';

-- Crear programa basado en el historial (solo si no existe)
INSERT INTO loyalty_programs (
    customer_id,
    type,
    total_meters,
    remaining_meters,
    purchase_date,
    program_number,
    program_folio
)
SELECT 
    '486' as customer_id,
    COALESCE(main_type.type, 'DTF Textil') as type,
    CASE 
        WHEN COALESCE(main_type.metros_consumidos, 0) <= 10 THEN 20.0
        WHEN COALESCE(main_type.metros_consumidos, 0) <= 30 THEN 50.0
        ELSE 100.0
    END as total_meters,
    CASE 
        WHEN COALESCE(main_type.metros_consumidos, 0) <= 10 THEN 20.0 - COALESCE(main_type.metros_consumidos, 0)
        WHEN COALESCE(main_type.metros_consumidos, 0) <= 30 THEN 50.0 - COALESCE(main_type.metros_consumidos, 0)
        ELSE 100.0 - COALESCE(main_type.metros_consumidos, 0)
    END as remaining_meters,
    main_type.primera_fecha::date as purchase_date,
    COALESCE((SELECT MAX(program_number) FROM loyalty_programs), 0) + 1 as program_number,
    CONCAT('PRG-', LPAD((COALESCE((SELECT MAX(program_number) FROM loyalty_programs), 0) + 1)::TEXT, 6, '0')) as program_folio
FROM (
    SELECT 
        COALESCE(oh.type, 'DTF Textil') as type,
        SUM(oh.meters_consumed) as metros_consumidos,
        MIN(oh.recorded_at) as primera_fecha
    FROM order_history oh
    WHERE oh.customer_id = '486' 
       OR oh.client_id = '486' 
       OR oh.client_name ILIKE '%IC%'
    GROUP BY COALESCE(oh.type, 'DTF Textil')
    ORDER BY SUM(oh.meters_consumed) DESC
    LIMIT 1  -- Tomar el tipo con más metros consumidos
) main_type
WHERE NOT EXISTS (
    SELECT 1 FROM loyalty_programs WHERE customer_id = '486'
)
AND EXISTS (
    SELECT 1 FROM customers_ WHERE id = '486'
);

-- PASO 5: VERIFICACIÓN FINAL
SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    'customers_' as tabla,
    c.id,
    c.razon_social,
    c.alias,
    'N/A' as type,
    'N/A'::NUMERIC as total_meters,
    'N/A'::NUMERIC as remaining_meters,
    0 as programas,
    0 as pedidos
FROM customers_ c
WHERE c.id = '486'

UNION ALL

SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    'loyalty_programs' as tabla,
    lp.customer_id as id,
    c.razon_social,
    c.alias,
    lp.type,
    lp.total_meters,
    lp.remaining_meters,
    1 as programas,
    0 as pedidos
FROM loyalty_programs lp
LEFT JOIN customers_ c ON lp.customer_id = c.id
WHERE lp.customer_id = '486'

UNION ALL

SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    'order_history' as tabla,
    oh.customer_id as id,
    oh.client_name as razon_social,
    'N/A' as alias,
    oh.type,
    'N/A'::NUMERIC as total_meters,
    'N/A'::NUMERIC as remaining_meters,
    0 as programas,
    COUNT(*) as pedidos
FROM order_history oh
WHERE oh.customer_id = '486' OR oh.client_id = '486' OR oh.client_name ILIKE '%IC%'
GROUP BY oh.customer_id, oh.client_name, oh.type

ORDER BY resultado, tabla;

-- RESUMEN FINAL: Un solo query que muestre el estado completo
SELECT 
    c.id as customer_id,
    c.razon_social,
    COUNT(DISTINCT lp.id) as total_programas_lealtad,
    COUNT(DISTINCT oh.id) as total_pedidos_historial,
    STRING_AGG(DISTINCT lp.type, ', ') as tipos_programa,
    SUM(DISTINCT lp.total_meters) as metros_totales_programas,
    SUM(DISTINCT lp.remaining_meters) as metros_restantes_programas,
    SUM(oh.meters_consumed) as metros_consumidos_historial
FROM customers_ c
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
LEFT JOIN order_history oh ON (c.id = oh.customer_id OR c.id = oh.client_id)
WHERE c.id = '486' 
   OR c.razon_social ILIKE '%IC%'
   OR oh.client_name ILIKE '%IC%'
GROUP BY c.id, c.razon_social
HAVING COUNT(DISTINCT lp.id) > 0 OR COUNT(DISTINCT oh.id) > 0;