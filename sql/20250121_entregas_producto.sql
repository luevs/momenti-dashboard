-- =====================================================
-- TABLA: entregas_producto
-- Descripción: Registro de productos que los clientes
--              dejan para personalización
-- Fecha: 2025-01-21
-- =====================================================

-- Crear tabla de entregas de producto
CREATE TABLE IF NOT EXISTS entregas_producto (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers_(id) ON DELETE CASCADE,
    tipo_trabajo VARCHAR(255) NOT NULL,
    productos JSONB NOT NULL DEFAULT '[]',
    estado VARCHAR(50) NOT NULL DEFAULT 'recibido',
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Indices para mejorar rendimiento
    CONSTRAINT entregas_producto_estado_check CHECK (estado IN ('recibido', 'en_proceso', 'completado', 'entregado', 'cancelado'))
);

-- Índices para optimizar consultas
CREATE INDEX idx_entregas_producto_customer_id ON entregas_producto(customer_id);
CREATE INDEX idx_entregas_producto_estado ON entregas_producto(estado);
CREATE INDEX idx_entregas_producto_created_at ON entregas_producto(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_entregas_producto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entregas_producto_updated_at
    BEFORE UPDATE ON entregas_producto
    FOR EACH ROW
    EXECUTE FUNCTION update_entregas_producto_updated_at();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE entregas_producto IS 'Registro de productos entregados por clientes para personalización';
COMMENT ON COLUMN entregas_producto.id IS 'ID único de la entrega (folio)';
COMMENT ON COLUMN entregas_producto.customer_id IS 'Referencia al cliente que entrega el producto (TEXT para coincidir con customers_.id)';
COMMENT ON COLUMN entregas_producto.tipo_trabajo IS 'Tipo de personalización solicitada (DTF, Sublimación, Vinil, etc.)';
COMMENT ON COLUMN entregas_producto.productos IS 'Array JSON con los productos entregados [{nombre, cantidad, descripcion}]';
COMMENT ON COLUMN entregas_producto.estado IS 'Estado del trabajo: recibido, en_proceso, completado, entregado, cancelado';
COMMENT ON COLUMN entregas_producto.observaciones IS 'Notas adicionales sobre el trabajo';
COMMENT ON COLUMN entregas_producto.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN entregas_producto.updated_at IS 'Fecha y hora de última actualización';
COMMENT ON COLUMN entregas_producto.created_by IS 'Usuario que creó el registro';

-- Permisos para usuarios autenticados (ajustar según necesidad)
-- ALTER TABLE entregas_producto ENABLE ROW LEVEL SECURITY;

-- Política de ejemplo (descomentar y ajustar según necesidades)
-- CREATE POLICY "Usuarios autenticados pueden ver entregas" ON entregas_producto
--     FOR SELECT
--     USING (auth.role() = 'authenticated');

-- CREATE POLICY "Usuarios autenticados pueden insertar entregas" ON entregas_producto
--     FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Usuarios autenticados pueden actualizar entregas" ON entregas_producto
--     FOR UPDATE
--     USING (auth.role() = 'authenticated');

-- =====================================================
-- Vista para obtener entregas con información del cliente
-- =====================================================
CREATE OR REPLACE VIEW v_entregas_producto_detalle AS
SELECT 
    ep.id,
    ep.customer_id,
    c.razon_social,
    c.alias,
    c.celular,
    c.email,
    ep.tipo_trabajo,
    ep.productos,
    ep.estado,
    ep.observaciones,
    ep.created_at,
    ep.updated_at,
    ep.created_by,
    -- Contar cantidad total de productos
    (
        SELECT COALESCE(SUM((producto->>'cantidad')::INT), 0)
        FROM jsonb_array_elements(ep.productos) AS producto
    ) AS total_productos
FROM entregas_producto ep
INNER JOIN customers_ c ON ep.customer_id = c.id
ORDER BY ep.created_at DESC;

COMMENT ON VIEW v_entregas_producto_detalle IS 'Vista con información detallada de entregas y clientes';

-- =====================================================
-- Datos de ejemplo (opcional - comentar si no se necesita)
-- =====================================================
-- INSERT INTO entregas_producto (customer_id, tipo_trabajo, productos, estado, observaciones)
-- VALUES 
-- (1, 'Estampado DTF', '[{"nombre": "Playera Blanca", "cantidad": "5", "descripcion": "Talla M"}, {"nombre": "Sudadera Negra", "cantidad": "2", "descripcion": "Talla L"}]', 'recibido', 'Cliente requiere entrega urgente'),
-- (2, 'Sublimación', '[{"nombre": "Taza Blanca", "cantidad": "10", "descripcion": "Diseño personalizado"}]', 'en_proceso', NULL);

-- =====================================================
-- Consultas útiles
-- =====================================================

-- Ver todas las entregas con información del cliente
-- SELECT * FROM v_entregas_producto_detalle;

-- Ver entregas pendientes
-- SELECT * FROM v_entregas_producto_detalle WHERE estado IN ('recibido', 'en_proceso');

-- Buscar entregas por cliente
-- SELECT * FROM v_entregas_producto_detalle WHERE customer_id = 1;

-- Ver productos de una entrega específica
-- SELECT 
--     id,
--     tipo_trabajo,
--     jsonb_array_elements(productos) as producto
-- FROM entregas_producto
-- WHERE id = 1;
