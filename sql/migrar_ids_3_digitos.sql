-- MIGRACIÓN DE IDs: De largos a 3 dígitos
-- ⚠️ HACER BACKUP ANTES DE EJECUTAR ⚠️

-- 1. Crear función para generar ID de 3 dígitos
CREATE OR REPLACE FUNCTION generate_3digit_id() 
RETURNS INTEGER AS $$
DECLARE
    new_id INTEGER;
    max_attempts INTEGER := 1000;
    attempts INTEGER := 0;
BEGIN
    LOOP
        -- Generar número aleatorio entre 100 y 999
        new_id := floor(random() * 900 + 100)::INTEGER;
        
        -- Verificar si ya existe
        IF NOT EXISTS (SELECT 1 FROM customers_ WHERE id::INTEGER = new_id) THEN
            RETURN new_id;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'No se pudo generar un ID único después de % intentos', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Ver clientes con IDs largos (para revisar cuáles cambiar)
SELECT 
    id as id_actual,
    LENGTH(id::text) as longitud_id,
    razon_social,
    alias,
    (SELECT COUNT(*) FROM loyalty_programs WHERE customer_id = customers_.id) as programas_count
FROM customers_
WHERE LENGTH(id::text) > 3
ORDER BY programas_count DESC, razon_social;

-- 3. Crear tabla temporal de mapeo (para no perder referencias)
CREATE TABLE IF NOT EXISTS id_migration_map (
    old_id VARCHAR,
    new_id INTEGER,
    customer_name VARCHAR,
    migrated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Script para migrar IDs (EJECUTAR CON CUIDADO)
-- Este script actualiza customers_ y todas las tablas relacionadas
DO $$
DECLARE
    customer_record RECORD;
    new_customer_id INTEGER;
BEGIN
    -- Iterar sobre clientes con IDs largos
    FOR customer_record IN 
        SELECT id, razon_social, alias 
        FROM customers_ 
        WHERE LENGTH(id::text) > 3
        ORDER BY razon_social
    LOOP
        -- Generar nuevo ID
        new_customer_id := generate_3digit_id();
        
        -- Guardar mapeo
        INSERT INTO id_migration_map (old_id, new_id, customer_name)
        VALUES (customer_record.id, new_customer_id, 
                COALESCE(customer_record.razon_social, customer_record.alias));
        
        -- Actualizar tablas relacionadas (en orden correcto)
        -- 1. order_history
        UPDATE order_history 
        SET customer_id = new_customer_id::text
        WHERE customer_id = customer_record.id;
        
        -- 2. orders (si existe)
        UPDATE orders 
        SET customer_id = new_customer_id::text
        WHERE customer_id = customer_record.id;
        
        -- 3. loyalty_programs
        UPDATE loyalty_programs 
        SET customer_id = new_customer_id::text
        WHERE customer_id = customer_record.id;
        
        -- 4. Finalmente, customers_
        UPDATE customers_ 
        SET id = new_customer_id::text
        WHERE id = customer_record.id;
        
        RAISE NOTICE 'Migrado: % -> % (ID: % -> %)', 
                     COALESCE(customer_record.razon_social, customer_record.alias),
                     COALESCE(customer_record.razon_social, customer_record.alias),
                     customer_record.id, 
                     new_customer_id;
    END LOOP;
END $$;

-- 5. Verificar migración
SELECT 
    old_id,
    new_id,
    customer_name,
    migrated_at
FROM id_migration_map
ORDER BY migrated_at DESC;

-- 6. Verificar que no hay IDs rotos
SELECT 
    'customers_' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN LENGTH(id::text) <= 3 THEN 1 END) as ids_cortos
FROM customers_
UNION ALL
SELECT 
    'loyalty_programs' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN LENGTH(customer_id::text) <= 3 THEN 1 END) as ids_cortos
FROM loyalty_programs
UNION ALL
SELECT 
    'order_history' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN LENGTH(customer_id::text) <= 3 THEN 1 END) as ids_cortos
FROM order_history;