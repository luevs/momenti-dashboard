-- Verificar el estado actual de las tablas después del UPDATE

-- 1. Ver los IDs actuales en loyalty_programs
SELECT 
    customer_id,
    COUNT(*) as programas,
    string_agg(DISTINCT type, ', ') as tipos_programa
FROM loyalty_programs 
GROUP BY customer_id
ORDER BY customer_id;

-- 2. Ver los IDs actuales en customers_ (solo los que tienen loyalty_programs)
SELECT 
    c.id,
    c.razon_social,
    COUNT(lp.id) as programas_count
FROM customers_ c
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
GROUP BY c.id, c.razon_social
HAVING COUNT(lp.id) > 0
ORDER BY c.id;

-- 3. Verificar desconexiones (loyalty_programs sin customers_ correspondiente)
SELECT 
    lp.customer_id,
    COUNT(*) as programas_huerfanos
FROM loyalty_programs lp
LEFT JOIN customers_ c ON lp.customer_id = c.id
WHERE c.id IS NULL
GROUP BY lp.customer_id
ORDER BY lp.customer_id;