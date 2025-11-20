-- SOLUCIONES PARA CLIENTE ID 486 "IC estampados"
-- Ejecutar DESPUÉS de correr el diagnóstico

-- ESCENARIO 1: El cliente existe en customers_ pero con ID diferente
-- Buscar el ID correcto del cliente y actualizar order_history

-- Paso 1: Encontrar el ID correcto del cliente
WITH cliente_correcto AS (
    SELECT id as id_correcto, razon_social, alias
    FROM customers_
    WHERE razon_social ILIKE '%IC estampados%' 
       OR razon_social ILIKE '%IC%'
       OR alias ILIKE '%IC%'
    LIMIT 1
)
SELECT 
    'Cliente encontrado:' as mensaje,
    id_correcto,
    razon_social,
    alias
FROM cliente_correcto;

-- ESCENARIO 2: Si el cliente no existe en customers_, crearlo
-- (Ejecutar solo si el paso anterior no devuelve resultados)

-- Primero, obtener datos del cliente desde order_history
SELECT DISTINCT
    customer_id,
    client_id,
    client_name,
    COUNT(*) as pedidos_totales
FROM order_history 
WHERE customer_id = '486' 
   OR client_id = '486' 
   OR client_name ILIKE '%IC%'
GROUP BY customer_id, client_id, client_name;

-- SOLUCIÓN A: Crear cliente faltante en customers_
INSERT INTO customers_ (id, razon_social, alias, tipo_cliente)
SELECT 
    '486' as id,
    'IC estampados' as razon_social,
    'IC estampados' as alias,
    'Revendedor' as tipo_cliente
WHERE NOT EXISTS (
    SELECT 1 FROM customers_ WHERE id = '486'
);

-- SOLUCIÓN B: Crear programa de lealtad si no existe
-- (Solo ejecutar después de confirmar que el cliente existe)

-- Verificar si necesita programa de lealtad
SELECT 
    oh.client_name,
    oh.type,
    SUM(oh.meters_consumed) as metros_total_consumidos,
    COUNT(*) as pedidos_totales,
    MIN(oh.recorded_at) as primer_pedido,
    MAX(oh.recorded_at) as ultimo_pedido
FROM order_history oh
WHERE oh.customer_id = '486' 
   OR oh.client_id = '486' 
   OR oh.client_name ILIKE '%IC%'
GROUP BY oh.client_name, oh.type;

-- Crear programa de lealtad basado en historial
-- (Ajustar metros_totales según sea necesario)
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
    COALESCE(oh.type, 'DTF Textil') as type,
    50.0 as total_meters, -- Ajustar según corresponda
    50.0 - COALESCE(SUM(oh.meters_consumed), 0) as remaining_meters,
    MIN(oh.recorded_at)::date as purchase_date,
    (SELECT COALESCE(MAX(program_number), 0) + 1 FROM loyalty_programs) as program_number,
    CONCAT('PRG-', LPAD((SELECT COALESCE(MAX(program_number), 0) + 1 FROM loyalty_programs)::TEXT, 6, '0')) as program_folio
FROM order_history oh
WHERE oh.customer_id = '486' 
   OR oh.client_id = '486' 
   OR oh.client_name ILIKE '%IC%'
GROUP BY oh.type
HAVING NOT EXISTS (
    SELECT 1 FROM loyalty_programs WHERE customer_id = '486'
);

-- SOLUCIÓN C: Actualizar customer_id en order_history si está mal
-- (Solo si encontramos que el ID correcto es diferente)

-- Ejemplo: si el cliente real tiene ID '123' en lugar de '486'
/*
UPDATE order_history 
SET customer_id = '123'  -- Reemplazar con el ID correcto
WHERE customer_id = '486' 
   OR client_id = '486'
   OR client_name ILIKE '%IC%';
*/

-- VERIFICACIÓN FINAL: Comprobar que todo está conectado
SELECT 
    'VERIFICACION' as resultado,
    c.id as customer_id,
    c.razon_social,
    COUNT(lp.id) as programas_lealtad,
    COUNT(oh.id) as pedidos_historial
FROM customers_ c
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
LEFT JOIN order_history oh ON c.id = oh.customer_id OR c.id = oh.client_id
WHERE c.id = '486' 
   OR c.razon_social ILIKE '%IC%'
GROUP BY c.id, c.razon_social;