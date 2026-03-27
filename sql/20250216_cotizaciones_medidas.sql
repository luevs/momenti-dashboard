-- =====================================================
-- ACTUALIZACIÓN: Agregar campos de medidas a cotizacion_items
-- Fecha: 2025-02-16
-- Descripción: Agregar campos para manejar precios por m² o metro lineal
-- =====================================================

-- Agregar columnas para productos con medidas (impresiones)
ALTER TABLE cotizacion_items 
ADD COLUMN IF NOT EXISTS usa_medidas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ancho DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS alto DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tipo_precio VARCHAR(20),
ADD COLUMN IF NOT EXISTS precio_por_medida DECIMAL(10,2);

-- Agregar constraints
ALTER TABLE cotizacion_items
ADD CONSTRAINT IF NOT EXISTS chk_tipo_precio 
  CHECK (tipo_precio IS NULL OR tipo_precio IN ('m2', 'metro_lineal'));

ALTER TABLE cotizacion_items
ADD CONSTRAINT IF NOT EXISTS chk_medidas_positivas
  CHECK (
    (ancho IS NULL OR ancho > 0) AND 
    (alto IS NULL OR alto > 0) AND 
    (precio_por_medida IS NULL OR precio_por_medida >= 0)
  );

-- Agregar comentarios
COMMENT ON COLUMN cotizacion_items.usa_medidas IS 'Indica si el item usa cálculo por medidas (m² o metros lineales)';
COMMENT ON COLUMN cotizacion_items.ancho IS 'Ancho en metros del producto';
COMMENT ON COLUMN cotizacion_items.alto IS 'Alto en metros del producto (para m²)';
COMMENT ON COLUMN cotizacion_items.tipo_precio IS 'Tipo de cálculo: m2 (ancho × alto) o metro_lineal (solo ancho)';
COMMENT ON COLUMN cotizacion_items.precio_por_medida IS 'Precio por m² o por metro lineal según tipo_precio';

-- Crear índice para búsquedas por tipo de precio
CREATE INDEX IF NOT EXISTS idx_items_tipo_precio ON cotizacion_items(tipo_precio) WHERE tipo_precio IS NOT NULL;

-- Nota: Para productos de impresión (VINIL_IMPRESO, LONA, VINIL_MICROPERFORADO):
-- - usa_medidas = true
-- - tipo_precio = 'm2' o 'metro_lineal'
-- - ancho = ancho en metros
-- - alto = alto en metros (solo para m²)
-- - precio_por_medida = precio unitario por m² o metro lineal
-- - El total se calcula: cantidad × (ancho × alto) × precio_por_medida (para m²)
--                       o cantidad × ancho × precio_por_medida (para metro lineal)
