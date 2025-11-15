-- SINCRONIZAR customers_.id con loyalty_programs.customer_id
-- usando intercambio temporal para evitar conflictos de PRIMARY KEY

-- Paso 1: Mover los IDs conflictivos a un rango temporal (8000+)
UPDATE customers_ 
SET id = (8000 + customers_id_actual::INTEGER)::TEXT
FROM (
    SELECT DISTINCT
        c.id as customers_id_actual,
        lp.customer_id as loyalty_programs_customer_id
    FROM customers_ c
    INNER JOIN loyalty_programs lp ON c.celular = lp.numero_wpp
    WHERE c.celular IS NOT NULL 
      AND c.celular != ''
      AND lp.numero_wpp IS NOT NULL 
      AND lp.numero_wpp != ''
      AND c.id != lp.customer_id  -- Solo los que están desconectados
) AS mapeo
WHERE customers_.id = mapeo.customers_id_actual;

-- Paso 2: Ahora mover desde el rango temporal a los IDs finales
UPDATE customers_ 
SET id = mapeo.loyalty_programs_customer_id
FROM (
    SELECT DISTINCT
        (8000 + customers_id_actual::INTEGER)::TEXT as temp_id,
        loyalty_programs_customer_id
    FROM (
        SELECT DISTINCT
            c.id as customers_id_actual,
            lp.customer_id as loyalty_programs_customer_id
        FROM customers_ c
        INNER JOIN loyalty_programs lp ON c.celular = lp.numero_wpp
        WHERE c.celular IS NOT NULL 
          AND c.celular != ''
          AND lp.numero_wpp IS NOT NULL 
          AND lp.numero_wpp != ''
          AND c.id != lp.customer_id
    ) original_mapping
) AS mapeo
WHERE customers_.id = mapeo.temp_id;