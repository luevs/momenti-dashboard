-- ACTUALIZAR customers_.id para que coincida con loyalty_programs.customer_id
-- usando el mapeo por teléfono

UPDATE customers_ 
SET id = mapeo.loyalty_programs_customer_id
FROM (
    SELECT DISTINCT
        c.id as customers_id_actual,
        lp.customer_id as loyalty_programs_customer_id,
        c.celular
    FROM customers_ c
    INNER JOIN loyalty_programs lp ON c.celular = lp.numero_wpp
    WHERE c.celular IS NOT NULL 
      AND c.celular != ''
      AND lp.numero_wpp IS NOT NULL 
      AND lp.numero_wpp != ''
      AND c.id != lp.customer_id  -- Solo los que están desconectados
) AS mapeo
WHERE customers_.id = mapeo.customers_id_actual;