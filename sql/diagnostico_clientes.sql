-- DIAGNÓSTICO: Verificar datos en las tablas

-- 1. Verificar cuántos clientes hay en total
SELECT COUNT(*) as total_customers FROM customers_;

-- 2. Verificar cuántos programas de lealtad hay
SELECT COUNT(*) as total_loyalty_programs FROM loyalty_programs;

-- 3. Verificar cuántos clientes únicos tienen programas
SELECT COUNT(DISTINCT customer_id) as customers_with_programs 
FROM loyalty_programs;

-- 4. Ver algunos ejemplos de clientes con programas
SELECT 
    c.id, 
    c.razon_social, 
    c.alias,
    lp.id as program_id,
    lp.type,
    lp.program_folio,
    lp.total_meters,
    lp.remaining_meters
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
LIMIT 10;

-- 5. Verificar si hay problemas con el JOIN
SELECT 
    c.id as customer_id,
    c.razon_social,
    COUNT(lp.id) as program_count
FROM customers_ c
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
GROUP BY c.id, c.razon_social
HAVING COUNT(lp.id) > 0
ORDER BY program_count DESC
LIMIT 10;

-- 6. Verificar nombres de las tablas exactas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%customer%' OR table_name LIKE '%loyalty%';