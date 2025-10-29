# 🆔 AGREGAR COLUMNA CODIGO_CLIENTE

## SQL para agregar la columna en Supabase:

```sql
-- Agregar columna codigo_cliente a la tabla customers_
ALTER TABLE customers_ 
ADD COLUMN codigo_cliente VARCHAR(10) UNIQUE;

-- Opcional: Crear índice para búsquedas rápidas
CREATE INDEX idx_customers_codigo_cliente ON customers_(codigo_cliente);

-- Opcional: Función para generar códigos automáticamente
CREATE OR REPLACE FUNCTION generar_codigo_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_cliente IS NULL THEN
    -- Generar código con formato: CLI001, CLI002, etc.
    NEW.codigo_cliente := 'CLI' || LPAD((
      SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cliente FROM 4) AS INTEGER)), 0) + 1
      FROM customers_ 
      WHERE codigo_cliente ~ '^CLI[0-9]+$'
    )::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar códigos automáticamente
CREATE TRIGGER trigger_generar_codigo_cliente
  BEFORE INSERT ON customers_
  FOR EACH ROW
  EXECUTE FUNCTION generar_codigo_cliente();
```

## Luego actualizar el código React: