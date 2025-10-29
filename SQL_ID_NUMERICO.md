# 🆔 SOLUCIÓN SEGURA - SIN BORRAR DATOS

## OPCIÓN SEGURA: Agregar columna codigo_cliente

```sql
-- 1. Agregar nueva columna para código numérico
ALTER TABLE customers_ 
ADD COLUMN codigo_cliente INTEGER UNIQUE;

-- 2. Crear secuencia que empiece en 720
CREATE SEQUENCE codigo_cliente_seq START 720;

-- 3. Función para asignar código automáticamente
CREATE OR REPLACE FUNCTION asignar_codigo_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_cliente IS NULL THEN
    NEW.codigo_cliente := nextval('codigo_cliente_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para nuevos registros
CREATE TRIGGER trigger_codigo_cliente
  BEFORE INSERT ON customers_
  FOR EACH ROW
  EXECUTE FUNCTION asignar_codigo_cliente();

-- 5. Asignar códigos a registros existentes (si los hay)
UPDATE customers_ 
SET codigo_cliente = nextval('codigo_cliente_seq') 
WHERE codigo_cliente IS NULL;
```

## VERIFICAR QUE TODO ESTÁ BIEN:

```sql
-- Ver estructura de la tabla
\d customers_;

-- Probar insertar un cliente nuevo
INSERT INTO customers_ (razon_social, alias, tipo_cliente) 
VALUES ('Cliente Prueba', 'Prueba', 'Revendedor');

-- Ver el código asignado (debería ser 720 o el siguiente disponible)
SELECT id, codigo_cliente, razon_social FROM customers_ 
ORDER BY codigo_cliente DESC LIMIT 5;
```

## VERIFICAR QUE FUNCIONA:

```sql
-- Probar insertar un cliente y ver el ID
INSERT INTO customers_ (razon_social, alias, tipo_cliente) 
VALUES ('Cliente Prueba', 'Prueba', 'Revendedor');

-- Ver el ID generado (debería ser 720)
SELECT id, razon_social FROM customers_ ORDER BY id DESC LIMIT 1;
```