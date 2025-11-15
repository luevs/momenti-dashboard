-- Encontrar el mapeo correcto entre customers_.id y loyalty_programs.customer_id
-- basado en que tengan el mismo número de teléfono

SELECT DISTINCT
    c.id as "customers_id_real",
    lp.customer_id as "loyalty_programs_customer_id", 
    c.razon_social as "Cliente",
    c.celular as "Teléfono",
    COUNT(lp.id) as "Total_Programas"
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.celular = lp.numero_wpp
WHERE c.celular IS NOT NULL 
  AND c.celular != ''
  AND lp.numero_wpp IS NOT NULL 
  AND lp.numero_wpp != ''
  AND c.id != lp.customer_id  -- Solo los que están desconectados
GROUP BY c.id, lp.customer_id, c.razon_social, c.celular
ORDER BY c.razon_social;