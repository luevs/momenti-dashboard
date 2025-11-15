-- Query para obtener TODOS los clientes con programas de lealtad (activos e inactivos)
-- Útil para enviar credenciales de acceso por WhatsApp

SELECT DISTINCT 
    c.id,
    c.razon_social,
    c.alias,
    c.celular as whatsapp,
    c.client_password,
    COUNT(lp.id) as total_programas,
    COUNT(CASE WHEN lp.remaining_meters > 0 THEN 1 END) as programas_activos,
    COUNT(CASE WHEN lp.remaining_meters = 0 OR lp.status = 'completado' THEN 1 END) as programas_completados,
    SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END) as metros_disponibles,
    SUM(lp.total_meters) as total_metros_comprados,
    MAX(lp.purchase_date) as ultimo_programa,
    MIN(lp.purchase_date) as primer_programa
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE c.celular IS NOT NULL 
    AND c.celular != ''
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
ORDER BY total_metros_comprados DESC, ultimo_programa DESC;

-- Query para TODOS los clientes con programas (activos + completados)
SELECT DISTINCT 
    c.id as customer_id,
    COALESCE(c.razon_social, c.alias, 'Sin nombre') as nombre_cliente,
    c.celular as whatsapp,
    c.client_password as password,
    COUNT(lp.id) as total_programas,
    COUNT(CASE WHEN lp.remaining_meters > 0 THEN 1 END) as programas_activos,
    COUNT(CASE WHEN lp.remaining_meters = 0 OR lp.status = 'completado' THEN 1 END) as programas_completados,
    ROUND(SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END), 2) as metros_disponibles,
    ROUND(SUM(lp.total_meters), 2) as total_metros_comprados,
    STRING_AGG(
        lp.type || ' (' || 
        CASE 
            WHEN lp.remaining_meters > 0 THEN ROUND(lp.remaining_meters, 2) || 'm disponible'
            ELSE 'completado'
        END || ')', ', '
    ) as detalle_programas
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE c.celular IS NOT NULL 
    AND c.celular != ''
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
ORDER BY total_metros_comprados DESC;

-- Query para generar mensaje de WhatsApp automático (TODOS los clientes con programas)
SELECT 
    c.id,
    c.celular,
    COALESCE(c.razon_social, c.alias, 'Cliente') as nombre,
    c.client_password,
    COUNT(lp.id) as total_programas,
    ROUND(SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END), 2) as metros_disponibles,
    ROUND(SUM(lp.total_meters), 2) as total_metros_comprados,
    CASE 
        WHEN SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END) > 0 
        THEN '¡Hola ' || COALESCE(c.razon_social, c.alias, 'Cliente') || '! 🎉\n\n' ||
             'Ya puedes consultar tus metros de lealtad en línea:\n' ||
             '🌐 https://tu-dominio.com/cliente/login\n\n' ||
             '📋 Tus credenciales:\n' ||
             '• ID: ' || c.id || '\n' ||
             '• Contraseña: ' || COALESCE(c.client_password, 'Pendiente') || '\n\n' ||
             '💰 Tienes ' || ROUND(SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END), 2) || 'm disponibles\n\n' ||
             '¡Gracias por tu confianza! 🙌'
        ELSE '¡Hola ' || COALESCE(c.razon_social, c.alias, 'Cliente') || '! 🎉\n\n' ||
             'Ya puedes consultar tu historial de lealtad en línea:\n' ||
             '🌐 https://tu-dominio.com/cliente/login\n\n' ||
             '📋 Tus credenciales:\n' ||
             '• ID: ' || c.id || '\n' ||
             '• Contraseña: ' || COALESCE(c.client_password, 'Pendiente') || '\n\n' ||
             '📊 Has usado ' || ROUND(SUM(lp.total_meters), 2) || 'm en total (' || COUNT(lp.id) || ' programas)\n\n' ||
             '¡Gracias por tu confianza! 🙌'
    END as mensaje_whatsapp
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE c.celular IS NOT NULL 
    AND c.celular != ''
    AND c.client_password IS NOT NULL
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
ORDER BY c.razon_social;

-- Query para clientes SIN contraseña (necesitan que se les asigne)
SELECT 
    c.id,
    COALESCE(c.razon_social, c.alias) as nombre,
    c.celular,
    c.client_password,
    COUNT(lp.id) as programas,
    SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END) as metros_activos
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE (c.client_password IS NULL OR c.client_password = '')
    AND c.celular IS NOT NULL
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
ORDER BY metros_activos DESC;