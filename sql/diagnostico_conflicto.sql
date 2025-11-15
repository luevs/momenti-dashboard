-- DIAGNOSTICO: Ver el estado actual de ambas tablas

-- 1. Ver qué IDs tenemos en customers_ (largos y cortos)
SELECT 
    'customers_' as tabla,
    LENGTH(id) as longitud_id,
    COUNT(*) as cantidad,
    MIN(id) as primer_id,
    MAX(id) as ultimo_id
FROM customers_ 
GROUP BY LENGTH(id)
ORDER BY LENGTH(id);

-- 2. Ver qué IDs tenemos en loyalty_programs
SELECT 
    'loyalty_programs' as tabla,
    LENGTH(customer_id) as longitud_id,
    COUNT(DISTINCT customer_id) as cantidad_clientes,
    MIN(customer_id) as primer_id,
    MAX(customer_id) as ultimo_id
FROM loyalty_programs 
GROUP BY LENGTH(customer_id)
ORDER BY LENGTH(customer_id);

-- 3. Ver específicamente los IDs que ya existen en el rango 420+
SELECT 
    id,
    razon_social
FROM customers_ 
WHERE id ~ '^[4-9][0-9][0-9]$'  -- IDs de 3 dígitos que empiecen con 4-9
ORDER BY id::INTEGER;