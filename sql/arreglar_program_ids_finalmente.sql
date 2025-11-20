-- ARREGLAR PROGRAM_ID PARA QUE TODOS APUNTEN AL PROGRAMA CORRECTO
-- El problema es que todos tienen program_folio = "082" pero program_id diferentes

-- PASO 1: Ver el problema actual
SELECT 
    'PROBLEMA IDENTIFICADO' as titulo,
    oh.program_folio,
    oh.program_id,
    COUNT(*) as registros_con_este_program_id
FROM order_history oh
WHERE oh.customer_id = '486'
GROUP BY oh.program_folio, oh.program_id
ORDER BY oh.program_folio;

-- PASO 2: Obtener el program_id correcto del programa real
SELECT 
    'PROGRAMA REAL' as titulo,
    id as program_id_correcto,
    program_folio,
    type,
    total_meters,
    remaining_meters
FROM loyalty_programs 
WHERE customer_id = '486' AND program_folio = '082';

-- PASO 3: ACTUALIZAR todos los registros para que usen el program_id correcto
UPDATE order_history 
SET program_id = (
    SELECT id 
    FROM loyalty_programs 
    WHERE customer_id = '486' 
      AND program_folio = '082'
    LIMIT 1
)
WHERE customer_id = '486' 
  AND program_folio = '082';

-- PASO 4: Verificar que se arregló
SELECT 
    'DESPUÉS DE ARREGLAR' as titulo,
    oh.program_folio,
    oh.program_id,
    COUNT(*) as registros_con_este_program_id,
    lp.type as tipo_programa,
    lp.total_meters,
    lp.remaining_meters
FROM order_history oh
LEFT JOIN loyalty_programs lp ON oh.program_id = lp.id
WHERE oh.customer_id = '486'
GROUP BY oh.program_folio, oh.program_id, lp.type, lp.total_meters, lp.remaining_meters
ORDER BY oh.program_folio;

-- PASO 5: Verificar metros consumidos vs restantes
SELECT 
    'VERIFICAR METROS' as titulo,
    lp.program_folio,
    lp.total_meters,
    lp.remaining_meters as remaining_meters_guardado,
    SUM(oh.meters_consumed) as metros_consumidos_real,
    lp.total_meters - SUM(oh.meters_consumed) as remaining_meters_calculado,
    CASE 
        WHEN ABS(lp.remaining_meters - (lp.total_meters - SUM(oh.meters_consumed))) > 0.01 
        THEN 'DESCUADRADO' 
        ELSE 'OK' 
    END as status
FROM loyalty_programs lp
LEFT JOIN order_history oh ON lp.id = oh.program_id
WHERE lp.customer_id = '486'
GROUP BY lp.id, lp.program_folio, lp.total_meters, lp.remaining_meters;

-- BONUS: Arreglar remaining_meters si está descuadrado
UPDATE loyalty_programs 
SET remaining_meters = total_meters - (
    SELECT COALESCE(SUM(oh.meters_consumed), 0) 
    FROM order_history oh 
    WHERE oh.program_id = loyalty_programs.id
)
WHERE customer_id = '486';

-- VERIFICACIÓN FINAL
SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    lp.program_folio,
    lp.type,
    lp.total_meters,
    lp.remaining_meters,
    COUNT(oh.id) as total_pedidos,
    SUM(oh.meters_consumed) as metros_consumidos,
    STRING_AGG(DISTINCT oh.program_id::text, ', ') as program_ids_en_historial
FROM loyalty_programs lp
LEFT JOIN order_history oh ON lp.id = oh.program_id
WHERE lp.customer_id = '486'
GROUP BY lp.id, lp.program_folio, lp.type, lp.total_meters, lp.remaining_meters;