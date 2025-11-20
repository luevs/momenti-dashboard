-- DIAGNÓSTICO PARA CLIENTE ID 486 "IC estampados"

-- 1. Buscar en order_history (todas las variaciones posibles)
SELECT 
    'order_history' as tabla,
    id, customer_id, client_id, client_name, type, meters_consumed, recorded_at
FROM order_history 
WHERE customer_id = '486' 
   OR client_id = '486' 
   OR client_name ILIKE '%IC estampados%'
   OR customer_id ILIKE '%IC%'
   OR client_name ILIKE '%estampados%';

-- 2. Buscar en customers_ 
SELECT 
    'customers_' as tabla,
    id, razon_social, alias, celular
FROM customers_ 
WHERE id = '486'
   OR razon_social ILIKE '%IC estampados%'
   OR razon_social ILIKE '%IC%'
   OR alias ILIKE '%IC%'
   OR razon_social ILIKE '%estampados%';

-- 3. Buscar en loyalty_programs
SELECT 
    'loyalty_programs' as tabla,
    id, customer_id, type, total_meters, remaining_meters, purchase_date
FROM loyalty_programs 
WHERE customer_id = '486'
   OR customer_id IN (
       SELECT id FROM customers_ 
       WHERE razon_social ILIKE '%IC estampados%' 
          OR razon_social ILIKE '%IC%'
          OR alias ILIKE '%IC%'
   );

-- 4. Buscar posibles IDs relacionados en customers_
SELECT 
    'customers_busqueda_amplia' as tabla,
    id, razon_social, alias, celular,
    LENGTH(id) as longitud_id
FROM customers_ 
WHERE razon_social ILIKE '%IC%' 
   OR alias ILIKE '%IC%'
   OR razon_social ILIKE '%estampados%'
ORDER BY id;

-- 5. Verificar si hay programas con customer_id diferente para mismo nombre
SELECT DISTINCT
    lp.customer_id,
    c.razon_social,
    c.alias,
    COUNT(lp.id) as total_programas
FROM loyalty_programs lp
LEFT JOIN customers_ c ON lp.customer_id = c.id
WHERE c.razon_social ILIKE '%IC%' 
   OR c.alias ILIKE '%IC%'
GROUP BY lp.customer_id, c.razon_social, c.alias
ORDER BY lp.customer_id;

-- 6. Buscar registros huérfanos (order_history sin customer en customers_)
SELECT 
    oh.customer_id,
    oh.client_id, 
    oh.client_name,
    COUNT(*) as registros_huerfanos
FROM order_history oh
LEFT JOIN customers_ c1 ON oh.customer_id = c1.id
LEFT JOIN customers_ c2 ON oh.client_id = c2.id
WHERE c1.id IS NULL AND c2.id IS NULL
  AND (oh.customer_id = '486' OR oh.client_id = '486' OR oh.client_name ILIKE '%IC%')
GROUP BY oh.customer_id, oh.client_id, oh.client_name;