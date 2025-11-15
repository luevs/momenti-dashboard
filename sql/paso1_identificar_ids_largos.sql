-- PASO 1: Identificar customer_ids con más de 3 caracteres
-- y contar cuántos programas de lealtad tienen

SELECT 
    customer_id as "Cliente ID",
    COUNT(*) as "Numero de Programas"
FROM loyalty_programs 
WHERE LENGTH(customer_id) > 3
GROUP BY customer_id
ORDER BY customer_id;

-- También veamos qué tipos de programas tienen
SELECT 
    customer_id as "Cliente ID",
    program_type as "Tipo de Programa",
    COUNT(*) as "Cantidad"
FROM loyalty_programs 
WHERE LENGTH(customer_id) > 3
GROUP BY customer_id, program_type
ORDER BY customer_id, program_type;