-- VER ESTRUCTURA EXACTA DE LAS TABLAS
-- Ejecutar PRIMERO para ver los tipos de datos correctos

-- 1. Estructura de order_history
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_history' 
  AND table_schema = 'public'
  AND column_name IN ('customer_id', 'client_id', 'program_id', 'program_folio', 'type')
ORDER BY column_name;

-- 2. Estructura de loyalty_programs
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'loyalty_programs' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'customer_id', 'type', 'program_folio')
ORDER BY column_name;

-- 3. Estructura de customers_
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers_' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'razon_social', 'alias')
ORDER BY column_name;

-- 4. Muestra de datos reales para ver los tipos
SELECT 
    'order_history_sample' as tabla,
    customer_id, 
    client_id, 
    program_id, 
    program_folio,
    pg_typeof(customer_id) as customer_id_type,
    pg_typeof(client_id) as client_id_type,
    pg_typeof(program_id) as program_id_type
FROM order_history 
WHERE customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%'
LIMIT 3;

-- 5. Muestra de loyalty_programs para ver tipos
SELECT 
    'loyalty_programs_sample' as tabla,
    id, 
    customer_id, 
    program_folio,
    pg_typeof(id) as id_type,
    pg_typeof(customer_id) as customer_id_type
FROM loyalty_programs 
WHERE customer_id = '486'
LIMIT 3;