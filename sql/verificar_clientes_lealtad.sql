-- Verificar que los clientes con programas de lealtad estén sincronizados
SELECT 
    c.id,
    c.razon_social,
    COUNT(lp.id) as total_programas,
    string_agg(DISTINCT lp.type, ', ') as tipos_programa
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
GROUP BY c.id, c.razon_social
ORDER BY c.razon_social
LIMIT 20;