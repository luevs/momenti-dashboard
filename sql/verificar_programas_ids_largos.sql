-- Verificar si estos clientes con IDs largos tienen programas de lealtad
SELECT 
    c.id as customer_id,
    c.razon_social,
    COUNT(lp.id) as programas_count
FROM customers_ c
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE LENGTH(c.id) > 3
GROUP BY c.id, c.razon_social
ORDER BY c.razon_social;

-- Si tienen programas, necesitamos actualizarlos también
-- Si NO tienen programas, podemos proceder directamente con customers_