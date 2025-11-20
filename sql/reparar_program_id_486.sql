-- REPARAR PROGRAM_ID EN ORDER_HISTORY PARA CLIENTE 486
-- Ejecutar después del diagnóstico para arreglar las referencias

-- PASO 1: Ver el estado actual (diagnóstico rápido)
SELECT 
    'ESTADO ACTUAL' as paso,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN program_id IS NULL THEN 1 END) as sin_program_id,
    COUNT(CASE WHEN program_id IS NOT NULL THEN 1 END) as con_program_id
FROM order_history 
WHERE customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%';

-- PASO 2: Actualizar program_id basado en el tipo de programa
-- Primero, obtener el program_id correcto para DTF Textil del cliente 486
UPDATE order_history 
SET program_id = (
    SELECT id 
    FROM loyalty_programs 
    WHERE customer_id = '486' 
      AND type = 'DTF Textil'
    LIMIT 1
)
WHERE (customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%')
  AND (type = 'DTF Textil' OR type IS NULL OR type = '')
  AND program_id IS NULL;

-- PASO 3: Si hay otros tipos de programa, actualizarlos también
-- Para UV DTF (si existe)
UPDATE order_history 
SET program_id = (
    SELECT id 
    FROM loyalty_programs 
    WHERE customer_id = '486' 
      AND type = 'UV DTF'
    LIMIT 1
)
WHERE (customer_id = '486' OR client_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%')
  AND type = 'UV DTF'
  AND program_id IS NULL;

-- PASO 4: Actualizar program_folio si está vacío
UPDATE order_history 
SET program_folio = lp.program_folio
FROM loyalty_programs lp
WHERE (order_history.customer_id = '486' OR order_history.client_id = '486' OR order_history.client_name ILIKE '%IC ESTAMPADOS%')
  AND order_history.program_id = lp.id
  AND (order_history.program_folio IS NULL OR order_history.program_folio = '');

-- PASO 5: Asegurar que customer_id esté consistente
UPDATE order_history 
SET customer_id = '486'
WHERE client_name ILIKE '%IC ESTAMPADOS%' 
  AND (customer_id IS NULL OR customer_id = '')
  AND client_id = '486';

-- PASO 6: Asegurar que client_id esté consistente
UPDATE order_history 
SET client_id = '486'
WHERE (customer_id = '486' OR client_name ILIKE '%IC ESTAMPADOS%')
  AND (client_id IS NULL OR client_id = '');

-- VERIFICACIÓN FINAL
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
    lp.program_folio as loyalty_program_folio
FROM order_history oh
LEFT JOIN loyalty_programs lp ON oh.program_id = lp.id::text
WHERE oh.customer_id = '486' OR oh.client_id = '486' OR oh.client_name ILIKE '%IC ESTAMPADOS%'
ORDER BY oh.recorded_at DESC;

-- RESUMEN FINAL
SELECT 
    'RESUMEN FINAL' as titulo,
    COUNT(*) as total_registros_order_history,
    COUNT(CASE WHEN oh.program_id IS NOT NULL THEN 1 END) as con_program_id_correcto,
    COUNT(CASE WHEN lp.id IS NOT NULL THEN 1 END) as con_loyalty_program_vinculado,
    SUM(oh.meters_consumed) as total_metros_consumidos
FROM order_history oh
LEFT JOIN loyalty_programs lp ON oh.program_id = lp.id
WHERE oh.customer_id = '486' OR oh.client_id = '486' OR oh.client_name ILIKE '%IC ESTAMPADOS%';

-- BONUS: Ver el programa de lealtad y calcular remaining_meters correcto
SELECT 
    'PROGRAMA DE LEALTAD' as titulo,
    lp.*,
    COALESCE(SUM(oh.meters_consumed), 0) as metros_consumidos_real,
    lp.total_meters - COALESCE(SUM(oh.meters_consumed), 0) as metros_restantes_calculado
FROM loyalty_programs lp
LEFT JOIN order_history oh ON lp.customer_id = oh.customer_id AND lp.id = oh.program_id
WHERE lp.customer_id = '486'
GROUP BY lp.id, lp.customer_id, lp.type, lp.total_meters, lp.remaining_meters, lp.purchase_date, lp.program_number, lp.program_folio;