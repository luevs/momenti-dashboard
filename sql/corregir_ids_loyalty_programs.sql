-- CORREGIR IDs en loyalty_programs usando el mapeo por teléfono
-- Esto hará que loyalty_programs.customer_id coincida con customers_.id

UPDATE loyalty_programs 
SET customer_id = mapeo.customers_id_real
FROM (
    SELECT DISTINCT
        c.id as customers_id_real,
        lp.customer_id as loyalty_programs_customer_id
    FROM customers_ c
    INNER JOIN loyalty_programs lp ON c.celular = lp.numero_wpp
    WHERE c.celular IS NOT NULL 
      AND c.celular != ''
      AND lp.numero_wpp IS NOT NULL 
      AND lp.numero_wpp != ''
      AND c.id != lp.customer_id  -- Solo los que están desconectados
) AS mapeo
WHERE loyalty_programs.customer_id = mapeo.loyalty_programs_customer_id;