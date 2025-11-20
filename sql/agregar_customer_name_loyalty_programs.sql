-- Agregar columna para nombre del cliente en loyalty_programs
-- y llenarla con los nombres de customers_

-- PASO 1: Agregar la columna customer_name
ALTER TABLE loyalty_programs 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- PASO 2: Llenar la columna con los nombres de customers_
UPDATE loyalty_programs 
SET customer_name = c.razon_social
FROM customers_ c
WHERE loyalty_programs.customer_id = c.id
  AND loyalty_programs.customer_name IS NULL;

-- PASO 3: Verificar el resultado
SELECT 
    lp.id,
    lp.customer_id,
    lp.customer_name,
    lp.type,
    lp.total_meters,
    lp.remaining_meters,
    c.razon_social as "Nombre en customers_"
FROM loyalty_programs lp
LEFT JOIN customers_ c ON lp.customer_id = c.id
ORDER BY lp.customer_name
LIMIT 20;

-- PASO 4: Ver estadísticas de la actualización
SELECT 
    COUNT(*) as total_programas,
    COUNT(customer_name) as programas_con_nombre,
    COUNT(*) - COUNT(customer_name) as programas_sin_nombre
FROM loyalty_programs;