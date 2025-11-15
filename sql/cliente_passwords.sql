-- Agregar columna de contraseña para clientes (ejecutar en Supabase SQL Editor)
ALTER TABLE customers_ ADD COLUMN IF NOT EXISTS client_password VARCHAR(50);

-- Función para generar contraseñas aleatorias
CREATE OR REPLACE FUNCTION generate_client_password() 
RETURNS VARCHAR(8) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, (random() * length(chars))::INT + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generar contraseñas para clientes existentes que no tienen
UPDATE customers_ 
SET client_password = generate_client_password()
WHERE client_password IS NULL OR client_password = '';

-- Comentarios para referencia
-- Ejemplo de uso manual:
-- UPDATE customers_ SET client_password = 'TEMP1234' WHERE id = 'cliente_especifico';