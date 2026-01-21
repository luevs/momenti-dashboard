-- 🔍 VERIFICAR ACCIONES AUTOMATIZADAS EN SUPABASE
-- Ejecuta estos queries en el SQL Editor de Supabase para verificar si hay triggers, funciones o policies

-- ================================
-- 1️⃣ VERIFICAR TRIGGERS (DISPARADORES)
-- ================================
SELECT 
    trigger_name,
    event_object_table as tabla,
    action_timing as cuando, -- BEFORE, AFTER
    event_manipulation as accion, -- INSERT, UPDATE, DELETE
    action_statement as funcion_ejecutada
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ================================
-- 2️⃣ VERIFICAR FUNCIONES PERSONALIZADAS
-- ================================
SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo, -- FUNCTION, PROCEDURE
    routine_definition as codigo_funcion
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ================================
-- 3️⃣ VERIFICAR TRIGGERS ESPECÍFICOS PARA LOYALTY_PROGRAMS
-- ================================
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'loyalty_programs';

-- ================================
-- 4️⃣ VERIFICAR TRIGGERS ESPECÍFICOS PARA ORDER_HISTORY
-- ================================
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'order_history';

-- ================================
-- 5️⃣ VERIFICAR POLICIES DE SEGURIDAD (RLS)
-- ================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd, -- SELECT, INSERT, UPDATE, DELETE
    qual as condicion
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================
-- 6️⃣ VERIFICAR SI HAY SECUENCIAS (AUTO-INCREMENT)
-- ================================
SELECT 
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences 
WHERE sequence_schema = 'public';

-- ================================
-- 7️⃣ BUSCAR FUNCIONES QUE CONTENGAN 'PROGRAM_FOLIO'
-- ================================
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition ILIKE '%program_folio%';

-- ================================
-- 8️⃣ VERIFICAR SI HAY EVENTOS PROGRAMADOS
-- ================================
-- Nota: PostgreSQL no tiene eventos programados como MySQL, 
-- pero puedes verificar extensiones como pg_cron
SELECT * FROM pg_extension WHERE extname = 'pg_cron';