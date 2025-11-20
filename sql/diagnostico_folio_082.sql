-- DIAGNÓSTICO ESPECÍFICO PARA FOLIO 082 - CLIENTE ID 486
-- Ejecutar para entender el problema del historial

-- 1. Ver TODOS los registros de order_history para cliente 486
SELECT 
    'TODOS LOS REGISTROS' as tipo,
    id, customer_id, client_id, client_name, 
    program_id, program_folio, type,
    meters_consumed, recorded_at, recorded_by
FROM order_history 
WHERE customer_id = '486' 
   OR client_id = '486' 
   OR client_name ILIKE '%IC ESTAMPADOS%'
ORDER BY recorded_at DESC;

-- 2. Ver loyalty_programs para cliente 486
SELECT 
    'PROGRAMAS DE LEALTAD' as tipo,
    id, customer_id, type, program_number, program_folio,
    total_meters, remaining_meters, purchase_date
FROM loyalty_programs 
WHERE customer_id = '486'
ORDER BY purchase_date DESC;

-- 3. Buscar registros con folio 082 específicamente
SELECT 
    'REGISTROS CON FOLIO 082' as tipo,
    id, customer_id, client_id, client_name,
    program_id, program_folio, type,
    meters_consumed, recorded_at
FROM order_history 
WHERE program_folio ILIKE '%082%'
   OR program_folio = 'PRG-000082'
   OR program_folio = '082'
ORDER BY recorded_at DESC;

-- 4. Ver si hay registros sin program_id pero del cliente 486
SELECT 
    'REGISTROS SIN PROGRAM_ID' as tipo,
    id, customer_id, client_id, client_name,
    program_id, program_folio, type,
    meters_consumed, recorded_at
FROM order_history 
WHERE (customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%')
  AND program_id IS NULL;

-- 5. Ver si hay discrepancia entre program_id y program_folio
SELECT 
    'DISCREPANCIA ID vs FOLIO' as tipo,
    oh.id, oh.customer_id, oh.program_id, oh.program_folio,
    lp.id as loyalty_id, lp.program_number, lp.program_folio as loyalty_folio
FROM order_history oh
LEFT JOIN loyalty_programs lp ON oh.program_id = lp.id
WHERE oh.customer_id = '486' OR oh.client_id = '486'
ORDER BY oh.recorded_at DESC;

-- 6. Verificar qué program_id debería tener cada registro
WITH cliente_programs AS (
    SELECT id, program_number, program_folio, type
    FROM loyalty_programs 
    WHERE customer_id = '486'
),
historial_cliente AS (
    SELECT id, customer_id, client_name, type, program_id, program_folio, meters_consumed, recorded_at
    FROM order_history 
    WHERE customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%'
)
SELECT 
    'MAPEO CORRECTO' as tipo,
    h.id as history_id,
    h.customer_id,
    h.type as history_type,
    h.program_id as current_program_id,
    h.program_folio as current_program_folio,
    p.id as correct_program_id,
    p.program_folio as correct_program_folio,
    h.meters_consumed,
    h.recorded_at,
    CASE 
        WHEN h.program_id = p.id THEN 'CORRECTO'
        WHEN h.program_id IS NULL THEN 'FALTA PROGRAM_ID'
        ELSE 'PROGRAM_ID INCORRECTO'
    END as status
FROM historial_cliente h
LEFT JOIN cliente_programs p ON h.type = p.type
ORDER BY h.recorded_at DESC;