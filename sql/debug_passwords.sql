-- Verificar qué está pasando con las contraseñas

-- 1. Ver si la columna client_password existe y qué datos tiene
SELECT 
    id,
    razon_social,
    client_password,
    CASE 
        WHEN client_password IS NULL THEN 'NULL'
        WHEN client_password = '' THEN 'VACÍO'
        ELSE 'TIENE VALOR'
    END as estado_password
FROM customers_ c
WHERE EXISTS (SELECT 1 FROM loyalty_programs lp WHERE lp.customer_id = c.id)
ORDER BY razon_social
LIMIT 10;

-- 2. Ver si ya existen registros en client_access_credentials
SELECT COUNT(*) as total_credenciales FROM client_access_credentials;

-- 3. Si existen, mostrar algunos ejemplos
SELECT 
    access_id,
    customer_id,
    password,
    created_at
FROM client_access_credentials 
ORDER BY access_id::INTEGER 
LIMIT 10;