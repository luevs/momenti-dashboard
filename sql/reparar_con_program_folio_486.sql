-- REPARAR USANDO PROGRAM_FOLIO PARA CLIENTE 486
-- Este script usa program_folio como clave de relación, no program_id

-- PASO 1: Ver el estado actual con program_folio
SELECT 
    'ESTADO ACTUAL' as paso,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN program_folio IS NULL OR program_folio = '' THEN 1 END) as sin_program_folio,
    COUNT(CASE WHEN program_folio IS NOT NULL AND program_folio != '' THEN 1 END) as con_program_folio,
    COUNT(CASE WHEN program_id IS NULL THEN 1 END) as sin_program_id,
    STRING_AGG(DISTINCT program_folio, ', ') as folios_existentes
FROM order_history 
WHERE customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%';

-- PASO 2: Ver qué program_folio tiene el cliente en loyalty_programs
SELECT 
    'FOLIOS EN LOYALTY_PROGRAMS' as paso,
    customer_id, type, program_folio, program_number, id
FROM loyalty_programs 
WHERE customer_id = '486';

-- PASO 3: Actualizar program_folio en order_history si está vacío
-- Usar el folio del programa de lealtad correspondiente por tipo
UPDATE order_history 
SET program_folio = lp.program_folio
FROM loyalty_programs lp
WHERE (order_history.customer_id = '486' OR order_history.client_id = '486' OR order_history.client_name ILIKE '%IC ESTAMPADOS%')
  AND order_history.type = lp.type
  AND lp.customer_id = '486'
  AND (order_history.program_folio IS NULL OR order_history.program_folio = '');

-- PASO 4: Actualizar program_id basado en program_folio
UPDATE order_history 
SET program_id = lp.id
FROM loyalty_programs lp
WHERE (order_history.customer_id = '486' OR order_history.client_id = '486' OR order_history.client_name ILIKE '%IC ESTAMPADOS%')
  AND order_history.program_folio = lp.program_folio
  AND lp.customer_id = '486'
  AND order_history.program_id IS NULL;

-- PASO 5: Para registros que no tengan program_folio, asignar basado en tipo
UPDATE order_history 
SET program_folio = lp.program_folio,
    program_id = lp.id
FROM loyalty_programs lp
WHERE (order_history.customer_id = '486' OR order_history.client_id = '486' OR order_history.client_name ILIKE '%IC ESTAMPADOS%')
  AND (order_history.program_folio IS NULL OR order_history.program_folio = '')
  AND order_history.type = lp.type
  AND lp.customer_id = '486';

-- PASO 6: Asegurar consistency en customer_id y client_id
UPDATE order_history 
SET customer_id = '486',
    client_id = '486'
WHERE client_name ILIKE '%IC ESTAMPADOS%' 
  AND (customer_id IS NULL OR customer_id = '' OR client_id IS NULL OR client_id = '');

-- VERIFICACIÓN FINAL usando program_folio
SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    oh.id,
    oh.customer_id,
    oh.client_id,
    oh.client_name,
    oh.type,
    oh.program_id,
    oh.program_folio,
    oh.meters_consumed,
    oh.recorded_at,
    lp.program_number as loyalty_program_number,
    lp.program_folio as loyalty_program_folio,
    lp.type as loyalty_type
FROM order_history oh
LEFT JOIN loyalty_programs lp ON oh.program_folio = lp.program_folio AND lp.customer_id = '486'
WHERE oh.customer_id = '486' OR oh.client_id = '486' OR oh.client_name ILIKE '%IC ESTAMPADOS%'
ORDER BY oh.recorded_at DESC;

-- RESUMEN FINAL
SELECT 
    'RESUMEN FINAL' as titulo,
    COUNT(*) as total_registros_order_history,
    COUNT(CASE WHEN oh.program_folio IS NOT NULL AND oh.program_folio != '' THEN 1 END) as con_program_folio,
    COUNT(CASE WHEN oh.program_id IS NOT NULL THEN 1 END) as con_program_id,
    COUNT(CASE WHEN lp.id IS NOT NULL THEN 1 END) as con_loyalty_program_vinculado,
    SUM(oh.meters_consumed) as total_metros_consumidos,
    STRING_AGG(DISTINCT oh.program_folio, ', ') as folios_en_historial
FROM order_history oh
LEFT JOIN loyalty_programs lp ON oh.program_folio = lp.program_folio AND lp.customer_id = '486'
WHERE oh.customer_id = '486' OR oh.client_id = '486' OR oh.client_name ILIKE '%IC ESTAMPADOS%';

-- BONUS: Ver el programa de lealtad y calcular remaining_meters correcto
SELECT 
    'PROGRAMA DE LEALTAD' as titulo,
    lp.id,
    lp.customer_id,
    lp.type,
    lp.program_folio,
    lp.program_number,
    lp.total_meters,
    lp.remaining_meters as remaining_meters_actual,
    COALESCE(SUM(oh.meters_consumed), 0) as metros_consumidos_real,
    lp.total_meters - COALESCE(SUM(oh.meters_consumed), 0) as metros_restantes_calculado
FROM loyalty_programs lp
LEFT JOIN order_history oh ON lp.program_folio = oh.program_folio AND oh.customer_id = '486'
WHERE lp.customer_id = '486'
GROUP BY lp.id, lp.customer_id, lp.type, lp.program_folio, lp.program_number, lp.total_meters, lp.remaining_meters;