-- PASO FINAL: Restaurar la foreign key constraint
-- Esto permitirá que las consultas JOIN funcionen correctamente

-- Primero verificar que todo esté sincronizado
SELECT 
    'Verificación de sincronización' as status,
    COUNT(DISTINCT lp.customer_id) as programas_clientes,
    COUNT(DISTINCT c.id) as customers_con_programas
FROM loyalty_programs lp
LEFT JOIN customers_ c ON lp.customer_id = c.id
WHERE c.id IS NOT NULL;

-- Restaurar la foreign key constraint
ALTER TABLE loyalty_programs 
ADD CONSTRAINT loyalty_programs_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers_(id);

-- Verificar que la constraint se creó correctamente
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE table_name = 'loyalty_programs'
  AND constraint_name LIKE '%customer_id%';