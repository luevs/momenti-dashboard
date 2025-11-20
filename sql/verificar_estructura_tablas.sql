-- VERIFICAR ESTRUCTURA DE TABLAS ANTES DE EJECUTAR SOLUCIONES
-- Ejecutar PRIMERO para verificar qué columnas están disponibles

-- 1. Ver estructura de customers_
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers_' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver estructura de loyalty_programs
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'loyalty_programs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Ver estructura de order_history
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'order_history' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar si existe el cliente en customers_ de alguna forma
SELECT 'Búsqueda en customers_' as tabla, id, razon_social, alias
FROM customers_ 
WHERE id = '486'
   OR razon_social ILIKE '%IC%'
   OR alias ILIKE '%IC%'
   OR razon_social ILIKE '%estampados%';

-- 5. Verificar datos en order_history para el cliente
SELECT 'Datos en order_history' as tabla, 
       customer_id, client_id, client_name, type, 
       COUNT(*) as pedidos, SUM(meters_consumed) as metros_total
FROM order_history 
WHERE customer_id = '486' 
   OR client_id = '486' 
   OR client_name ILIKE '%IC%'
   OR customer_id ILIKE '%IC%'
GROUP BY customer_id, client_id, client_name, type;

-- 6. Verificar programas existentes con nombres similares
SELECT 'Programas similares' as tabla,
       lp.customer_id, c.razon_social, lp.type, lp.total_meters
FROM loyalty_programs lp
LEFT JOIN customers_ c ON lp.customer_id = c.id
WHERE c.razon_social ILIKE '%IC%' 
   OR c.alias ILIKE '%IC%'
   OR lp.customer_id = '486';