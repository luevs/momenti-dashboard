-- Poblar tabla de credenciales de acceso para clientes con programas
-- Usar las contraseñas existentes de customers_.client_password

INSERT INTO client_access_credentials (customer_id, access_id, password)
SELECT 
    c.id as customer_id,
    (100 + ROW_NUMBER() OVER (ORDER BY c.razon_social))::TEXT as access_id,
    COALESCE(c.client_password, 'cliente123') as password  -- Usar contraseña existente o por defecto
FROM customers_ c
INNER JOIN loyalty_programs lp ON c.id = lp.customer_id
WHERE NOT EXISTS (
    SELECT 1 FROM client_access_credentials cac WHERE cac.customer_id = c.id
)
GROUP BY c.id, c.razon_social, c.client_password
ORDER BY c.razon_social;

-- Verificar los registros creados
SELECT 
    cac.access_id,
    cac.customer_id,
    c.razon_social,
    cac.password,
    COUNT(lp.id) as total_programas
FROM client_access_credentials cac
JOIN customers_ c ON cac.customer_id = c.id
LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
GROUP BY cac.access_id, cac.customer_id, c.razon_social, cac.password
ORDER BY cac.access_id::INTEGER;