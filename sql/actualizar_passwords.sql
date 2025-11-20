-- ACTUALIZAR las contraseñas en client_access_credentials 
-- usando las contraseñas de customers_.client_password

UPDATE client_access_credentials 
SET password = COALESCE(c.client_password, 'cliente123')
FROM customers_ c
WHERE client_access_credentials.customer_id = c.id
  AND c.client_password IS NOT NULL 
  AND c.client_password != '';

-- Verificar los resultados
SELECT 
    cac.access_id,
    cac.customer_id,
    c.razon_social,
    cac.password as "Password en credenciales",
    c.client_password as "Password original",
    COUNT(lp.id) as total_programas
FROM client_access_credentials cac
JOIN customers_ c ON cac.customer_id = c.id
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
GROUP BY cac.access_id, cac.customer_id, c.razon_social, cac.password, c.client_password
ORDER BY cac.access_id::INTEGER;

-- GENERAR MENSAJES DE WHATSAPP PARA ENVIAR A CLIENTES
SELECT 
    cac.access_id,
    c.razon_social,
    c.celular,
    CONCAT(
        '¡Hola ', COALESCE(c.razon_social, c.alias, 'estimado cliente'), '! 👋', E'\n',
        E'\n',
        '🎉 ¡Tu portal de cliente ya está disponible!', E'\n',
        E'\n',
        '📱 Accede con estas credenciales:', E'\n',
        '• ID: ', cac.access_id, E'\n',
        '• Contraseña: ', cac.password, E'\n',
        E'\n',
        '🌐 Enlace: https://tu-dominio.com/cliente/login', E'\n',
        E'\n',
        '💡 En tu portal podrás:', E'\n',
        '• Ver el estado de tus programas de lealtad', E'\n',
        '• Consultar metros restantes', E'\n',
        '• Revisar tu historial de pedidos', E'\n',
        E'\n',
        '¿Necesitas ayuda? ¡Contáctanos! 📞'
    ) as "Mensaje WhatsApp",
    CONCAT(
        'https://wa.me/', 
        REGEXP_REPLACE(c.celular, '[^0-9]', '', 'g'), 
        '?text=',
        '¡Hola%20', 
        REPLACE(COALESCE(c.razon_social, c.alias, 'estimado%20cliente'), ' ', '%20'), 
        '!%20👋%0A%0A',
        '🎉%20¡Tu%20portal%20de%20cliente%20ya%20está%20disponible!%0A%0A',
        '📱%20Accede%20con%20estas%20credenciales:%0A',
        '•%20ID:%20', cac.access_id, '%0A',
        '•%20Contraseña:%20', cac.password, '%0A%0A',
        '🌐%20Enlace:%20https://tu-dominio.com/cliente/login%0A%0A',
        '💡%20En%20tu%20portal%20podrás:%0A',
        '•%20Ver%20el%20estado%20de%20tus%20programas%20de%20lealtad%0A',
        '•%20Consultar%20metros%20restantes%0A',
        '•%20Revisar%20tu%20historial%20de%20pedidos%0A%0A',
        '¿Necesitas%20ayuda?%20¡Contáctanos!%20📞'
    ) as "URL WhatsApp"
FROM client_access_credentials cac
JOIN customers_ c ON cac.customer_id = c.id
WHERE c.celular IS NOT NULL 
  AND c.celular != ''
ORDER BY cac.access_id::INTEGER;