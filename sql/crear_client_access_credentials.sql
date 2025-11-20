-- Crear tabla para IDs de acceso de clientes a la plataforma
-- Esto permitirá que los clientes accedan sin cambiar los IDs principales

CREATE TABLE IF NOT EXISTS client_access_credentials (
    id SERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers_(id),
    access_id VARCHAR(10) UNIQUE NOT NULL, -- ID corto para acceso (ej: 100, 101, 102)
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_client_access_customer_id ON client_access_credentials(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_access_access_id ON client_access_credentials(access_id);

-- Función para generar IDs de acceso únicos empezando desde 100
CREATE OR REPLACE FUNCTION generate_next_access_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    next_id INTEGER := 100;
    max_id INTEGER;
BEGIN
    -- Obtener el ID más alto existente
    SELECT COALESCE(MAX(access_id::INTEGER), 99) INTO max_id
    FROM client_access_credentials
    WHERE access_id ~ '^[0-9]+$';
    
    -- El siguiente ID será max_id + 1
    next_id := max_id + 1;
    
    RETURN next_id::VARCHAR;
END;
$$ LANGUAGE plpgsql;