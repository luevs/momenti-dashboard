-- PREVENCIÓN: Agregar constraints para mantener integridad referencial
-- (Ejecutar después de solucionar el problema actual)

-- 1. Agregar foreign key constraint en loyalty_programs
ALTER TABLE loyalty_programs 
ADD CONSTRAINT fk_loyalty_customer 
FOREIGN KEY (customer_id) REFERENCES customers_(id)
ON UPDATE CASCADE ON DELETE RESTRICT;

-- 2. Agregar foreign key constraint en order_history
ALTER TABLE order_history 
ADD CONSTRAINT fk_order_history_customer 
FOREIGN KEY (customer_id) REFERENCES customers_(id)
ON UPDATE CASCADE ON DELETE RESTRICT;

-- 3. Función para validar consistencia de datos
CREATE OR REPLACE FUNCTION validate_customer_consistency()
RETURNS TABLE(
    issue_type TEXT,
    customer_id TEXT,
    customer_name TEXT,
    description TEXT
) AS $$
BEGIN
    -- Buscar loyalty_programs sin customer
    RETURN QUERY
    SELECT 
        'loyalty_orphan'::TEXT,
        lp.customer_id,
        'N/A'::TEXT,
        'Programa de lealtad sin cliente en customers_'::TEXT
    FROM loyalty_programs lp
    LEFT JOIN customers_ c ON lp.customer_id = c.id
    WHERE c.id IS NULL;

    -- Buscar order_history sin customer
    RETURN QUERY
    SELECT 
        'history_orphan'::TEXT,
        oh.customer_id,
        oh.client_name,
        'Historial sin cliente en customers_'::TEXT
    FROM order_history oh
    LEFT JOIN customers_ c ON oh.customer_id = c.id
    WHERE c.id IS NULL AND oh.customer_id IS NOT NULL;

    -- Buscar clientes con historial pero sin programas de lealtad
    RETURN QUERY
    SELECT 
        'missing_loyalty'::TEXT,
        c.id,
        c.razon_social,
        'Cliente con historial pero sin programa de lealtad'::TEXT
    FROM customers_ c
    INNER JOIN order_history oh ON c.id = oh.customer_id
    LEFT JOIN loyalty_programs lp ON c.id = lp.customer_id
    WHERE lp.id IS NULL
    GROUP BY c.id, c.razon_social;
END;
$$ LANGUAGE plpgsql;

-- 4. Ejecutar validación
SELECT * FROM validate_customer_consistency();

-- 5. Trigger para prevenir inserciones inconsistentes
CREATE OR REPLACE FUNCTION check_customer_exists()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM customers_ WHERE id = NEW.customer_id) THEN
            RAISE EXCEPTION 'Customer with ID % does not exist in customers_ table', NEW.customer_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a loyalty_programs
CREATE TRIGGER trigger_check_loyalty_customer
    BEFORE INSERT OR UPDATE ON loyalty_programs
    FOR EACH ROW
    EXECUTE FUNCTION check_customer_exists();

-- Aplicar trigger a order_history
CREATE TRIGGER trigger_check_order_customer
    BEFORE INSERT OR UPDATE ON order_history
    FOR EACH ROW
    EXECUTE FUNCTION check_customer_exists();