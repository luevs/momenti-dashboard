-- Ver qué IDs largos quedan por migrar en customers_
SELECT 
    id,
    LENGTH(id) as longitud,
    razon_social
FROM customers_ 
WHERE LENGTH(id) > 3
ORDER BY id;

-- Ver qué IDs están en loyalty_programs (estos son los correctos)
SELECT 
    customer_id,
    COUNT(*) as programas
FROM loyalty_programs 
WHERE LENGTH(customer_id) = 3 
  AND customer_id::INTEGER >= 420
GROUP BY customer_id
ORDER BY customer_id::INTEGER;