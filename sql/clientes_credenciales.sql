-- Query para obtener clientes con programas de lealtad y sus credenciales
-- Útil para enviar credenciales de acceso por WhatsApp

SELECT DISTINCT 
    c.id,
    c.razon_social,
    c.alias,
    c.celular as whatsapp,
    c.client_password,
    COUNT(lp.id) as total_programas,
    COUNT(CASE WHEN lp.remaining_meters > 0 THEN 1 END) as programas_activos,
    SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END) as metros_disponibles,
    MAX(lp.purchase_date) as ultimo_programa
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE c.celular IS NOT NULL 
    AND c.celular != ''
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
ORDER BY programas_activos DESC, metros_disponibles DESC;

-- Query específico para clientes con programas ACTIVOS (tienen metros disponibles)
SELECT DISTINCT 
    c.id as customer_id,
    COALESCE(c.razon_social, c.alias, 'Sin nombre') as nombre_cliente,
    c.celular as whatsapp,
    c.client_password as password,
    COUNT(CASE WHEN lp.remaining_meters > 0 THEN 1 END) as programas_activos,
    ROUND(SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END), 2) as metros_disponibles,
    STRING_AGG(
        CASE WHEN lp.remaining_meters > 0 
        THEN lp.type || ' (' || ROUND(lp.remaining_meters, 2) || 'm)' 
        END, ', '
    ) as detalle_programas
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE c.celular IS NOT NULL 
    AND c.celular != ''
    AND lp.remaining_meters > 0
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
HAVING COUNT(CASE WHEN lp.remaining_meters > 0 THEN 1 END) > 0
ORDER BY metros_disponibles DESC;

-- Query para generar mensaje de WhatsApp automático
SELECT 
    c.id,
    c.celular,
    COALESCE(c.razon_social, c.alias, 'Cliente') as nombre,
    c.client_password,
    ROUND(SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END), 2) as metros_total,
    '¡Hola ' || COALESCE(c.razon_social, c.alias, 'Cliente') || '! 🎉\n\n' ||
    'Ya puedes consultar tus metros de lealtad en línea:\n' ||
    '🌐 https://tu-dominio.com/cliente/login\n\n' ||
    '📋 Tus credenciales:\n' ||
    '• ID: ' || c.id || '\n' ||
    '• Contraseña: ' || COALESCE(c.client_password, 'Pendiente') || '\n\n' ||
    '💰 Tienes ' || ROUND(SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END), 2) || 'm disponibles\n\n' ||
    '¡Gracias por tu confianza! 🙌' 
    as mensaje_whatsapp
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE c.celular IS NOT NULL 
    AND c.celular != ''
    AND lp.remaining_meters > 0
    AND c.client_password IS NOT NULL
GROUP BY c.id, c.razon_social, c.alias, c.celular, c.client_password
HAVING SUM(CASE WHEN lp.remaining_meters > 0 THEN lp.remaining_meters ELSE 0 END) > 0
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