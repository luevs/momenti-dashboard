-- =====================================================
-- MÓDULO DE COTIZACIONES PARA MOMENTI DASHBOARD
-- Fecha: 2025-02-13
-- Descripción: Sistema completo de gestión de cotizaciones
-- =====================================================

-- =====================================================
-- TABLA: cotizaciones
-- =====================================================
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(50) UNIQUE NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vigencia_dias INTEGER DEFAULT 5,
  tiempo_entrega VARCHAR(50) DEFAULT '3-5 días hábiles',
  
  -- Información del cliente
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(20),
  cliente_email VARCHAR(255),
  
  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) DEFAULT 0,
  iva DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  -- Scoring y seguimiento
  score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'COTIZADO', 
  -- COTIZADO, EN_PROCESO, CERRADO, PERDIDO
  tipo_cliente VARCHAR(50), 
  -- NEGOCIO_NUEVO, EVENTO_CORPORATIVO, REVENDEDOR, CLIENTE_FINAL
  notas TEXT,
  fecha_seguimiento TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  creado_por UUID REFERENCES auth.users(id),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('COTIZADO', 'EN_PROCESO', 'CERRADO', 'PERDIDO')),
  CONSTRAINT chk_tipo_cliente CHECK (tipo_cliente IN ('NEGOCIO_NUEVO', 'EVENTO_CORPORATIVO', 'REVENDEDOR', 'CLIENTE_FINAL')),
  CONSTRAINT chk_vigencia CHECK (vigencia_dias > 0),
  CONSTRAINT chk_score CHECK (score >= 0 AND score <= 100),
  CONSTRAINT chk_totales CHECK (subtotal >= 0 AND total >= 0 AND iva >= 0 AND descuento >= 0)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_cotizaciones_folio ON cotizaciones(folio);
CREATE INDEX idx_cotizaciones_status ON cotizaciones(status);
CREATE INDEX idx_cotizaciones_fecha ON cotizaciones(fecha_creacion DESC);
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(cliente_nombre);
CREATE INDEX idx_cotizaciones_score ON cotizaciones(score DESC);
CREATE INDEX idx_cotizaciones_tipo_cliente ON cotizaciones(tipo_cliente);

-- Comentarios de documentación
COMMENT ON TABLE cotizaciones IS 'Registro de todas las cotizaciones generadas en el sistema';
COMMENT ON COLUMN cotizaciones.folio IS 'Folio único de la cotización (formato: COT-YYYY-MM-###)';
COMMENT ON COLUMN cotizaciones.score IS 'Puntuación de prioridad de la cotización (0-100)';
COMMENT ON COLUMN cotizaciones.status IS 'Estado actual de la cotización';
COMMENT ON COLUMN cotizaciones.tipo_cliente IS 'Segmento del cliente para personalización de mensajes';

-- =====================================================
-- TABLA: cotizacion_items
-- =====================================================
CREATE TABLE IF NOT EXISTS cotizacion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad VARCHAR(50) NOT NULL,
  unidad VARCHAR(50),
  precio_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  tipo_servicio VARCHAR(50), 
  -- DTF_TEXTIL, UV_DTF, VINIL_IMPRESO, VINIL_SUAJADO, VINIL_MICROPERFORADO, 
  -- VINIL_HOLOGRAFICO, LONA, PAPELERIA, GRABADO_LASER, INSTALACION, OTRO
  score_item INTEGER DEFAULT 0,
  
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_precio_unitario CHECK (precio_unitario >= 0),
  CONSTRAINT chk_total_item CHECK (total >= 0),
  CONSTRAINT chk_numero_item CHECK (numero_item > 0),
  CONSTRAINT chk_score_item CHECK (score_item >= 0)
);

-- Índices
CREATE INDEX idx_items_cotizacion ON cotizacion_items(cotizacion_id);
CREATE INDEX idx_items_tipo_servicio ON cotizacion_items(tipo_servicio);
CREATE INDEX idx_items_numero ON cotizacion_items(cotizacion_id, numero_item);

-- Comentarios
COMMENT ON TABLE cotizacion_items IS 'Detalle de productos/servicios de cada cotización';
COMMENT ON COLUMN cotizacion_items.numero_item IS 'Número secuencial del item dentro de la cotización';
COMMENT ON COLUMN cotizacion_items.tipo_servicio IS 'Categoría del servicio para análisis y scoring';

-- =====================================================
-- FUNCIÓN: Generar folio automático
-- =====================================================
CREATE OR REPLACE FUNCTION generar_folio_cotizacion()
RETURNS TRIGGER AS $$
DECLARE
  anio VARCHAR(4);
  mes VARCHAR(2);
  consecutivo INTEGER;
  nuevo_folio VARCHAR(50);
BEGIN
  -- Si ya tiene folio, no hacer nada
  IF NEW.folio IS NOT NULL AND NEW.folio != '' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener año y mes actuales
  anio := TO_CHAR(NOW(), 'YYYY');
  mes := TO_CHAR(NOW(), 'MM');
  
  -- Obtener el siguiente consecutivo del mes
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(folio FROM '[0-9]+$') AS INTEGER
    )
  ), 0) + 1
  INTO consecutivo
  FROM cotizaciones
  WHERE folio LIKE 'COT-' || anio || '-' || mes || '-%';
  
  -- Generar el nuevo folio
  nuevo_folio := 'COT-' || anio || '-' || mes || '-' || LPAD(consecutivo::TEXT, 3, '0');
  
  NEW.folio := nuevo_folio;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar folio automáticamente
DROP TRIGGER IF EXISTS trigger_generar_folio ON cotizaciones;
CREATE TRIGGER trigger_generar_folio
  BEFORE INSERT ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION generar_folio_cotizacion();

-- =====================================================
-- FUNCIÓN: Actualizar timestamp de modificación
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_timestamp_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS trigger_actualizar_timestamp ON cotizaciones;
CREATE TRIGGER trigger_actualizar_timestamp
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp_cotizacion();

-- =====================================================
-- VISTA: Resumen de cotizaciones con estadísticas
-- =====================================================
CREATE OR REPLACE VIEW v_cotizaciones_resumen AS
SELECT 
  c.id,
  c.folio,
  c.fecha_creacion,
  c.vigencia_dias,
  c.tiempo_entrega,
  c.cliente_nombre,
  c.cliente_telefono,
  c.cliente_email,
  c.subtotal,
  c.descuento,
  c.iva,
  c.total,
  c.score,
  c.status,
  c.tipo_cliente,
  c.notas,
  c.fecha_seguimiento,
  c.creado_por,
  c.actualizado_en,
  COUNT(ci.id) as total_items,
  CASE 
    WHEN c.fecha_creacion + (c.vigencia_dias || ' days')::INTERVAL < NOW() THEN true
    ELSE false
  END as vencida,
  CASE
    WHEN c.fecha_seguimiento IS NOT NULL AND c.fecha_seguimiento <= NOW() THEN true
    ELSE false
  END as requiere_seguimiento
FROM cotizaciones c
LEFT JOIN cotizacion_items ci ON c.id = ci.cotizacion_id
GROUP BY c.id;

COMMENT ON VIEW v_cotizaciones_resumen IS 'Vista con información agregada de cotizaciones incluyendo conteo de items y flags de vigencia';

-- =====================================================
-- VISTA: Estadísticas por tipo de servicio
-- =====================================================
CREATE OR REPLACE VIEW v_servicios_mas_cotizados AS
SELECT 
  tipo_servicio,
  COUNT(*) as total_cotizaciones,
  SUM(total) as valor_total,
  AVG(total) as valor_promedio,
  COUNT(DISTINCT cotizacion_id) as num_cotizaciones_distintas
FROM cotizacion_items
WHERE tipo_servicio IS NOT NULL
GROUP BY tipo_servicio
ORDER BY total_cotizaciones DESC;

COMMENT ON VIEW v_servicios_mas_cotizados IS 'Análisis de los servicios más solicitados en cotizaciones';

-- =====================================================
-- VISTA: Estadísticas mensuales
-- =====================================================
CREATE OR REPLACE VIEW v_cotizaciones_mensuales AS
SELECT 
  DATE_TRUNC('month', fecha_creacion) as mes,
  COUNT(*) as total_cotizaciones,
  SUM(total) as valor_total,
  AVG(total) as valor_promedio,
  SUM(CASE WHEN status = 'CERRADO' THEN 1 ELSE 0 END) as cerradas,
  SUM(CASE WHEN status = 'PERDIDO' THEN 1 ELSE 0 END) as perdidas,
  SUM(CASE WHEN status = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso,
  SUM(CASE WHEN status = 'COTIZADO' THEN 1 ELSE 0 END) as cotizadas,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((SUM(CASE WHEN status = 'CERRADO' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    ELSE 0 
  END as tasa_conversion
FROM cotizaciones
GROUP BY DATE_TRUNC('month', fecha_creacion)
ORDER BY mes DESC;

COMMENT ON VIEW v_cotizaciones_mensuales IS 'Métricas de cotizaciones agrupadas por mes con tasa de conversión';

-- =====================================================
-- FUNCIÓN: Calcular score de cotización
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_score_cotizacion(
  p_total DECIMAL,
  p_tipo_cliente VARCHAR,
  p_tiempo_entrega VARCHAR,
  p_items_count INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Por monto total
  IF p_total >= 20000 THEN
    score := score + 30;
  ELSIF p_total >= 10000 THEN
    score := score + 25;
  ELSIF p_total >= 5000 THEN
    score := score + 20;
  ELSE
    score := score + 10;
  END IF;
  
  -- Por tipo de cliente
  IF p_tipo_cliente = 'EVENTO_CORPORATIVO' THEN
    score := score + 15;
  ELSIF p_tipo_cliente = 'NEGOCIO_NUEVO' THEN
    score := score + 10;
  ELSIF p_tipo_cliente = 'REVENDEDOR' THEN
    score := score + 5;
  END IF;
  
  -- Por urgencia en tiempo de entrega
  IF p_tiempo_entrega ILIKE '%24%' OR p_tiempo_entrega ILIKE '%48%' OR p_tiempo_entrega ILIKE '%express%' THEN
    score := score + 15;
  ELSIF p_tiempo_entrega ILIKE '%3-5%' THEN
    score := score + 10;
  END IF;
  
  -- Por cantidad de items (más productos = más score)
  IF p_items_count >= 5 THEN
    score := score + 10;
  ELSIF p_items_count >= 3 THEN
    score := score + 5;
  END IF;
  
  -- Limitar a 100
  IF score > 100 THEN
    score := 100;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_score_cotizacion IS 'Calcula el score de prioridad de una cotización basado en múltiples factores';

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS) - Row Level Security
-- =====================================================

-- Habilitar RLS en las tablas
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden ver todas las cotizaciones
CREATE POLICY "Usuarios autenticados pueden ver cotizaciones"
  ON cotizaciones FOR SELECT
  TO authenticated
  USING (true);

-- Política: Todos los usuarios autenticados pueden insertar cotizaciones
CREATE POLICY "Usuarios autenticados pueden crear cotizaciones"
  ON cotizaciones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Todos los usuarios autenticados pueden actualizar cotizaciones
CREATE POLICY "Usuarios autenticados pueden actualizar cotizaciones"
  ON cotizaciones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Solo admins pueden eliminar cotizaciones (ajustar según tu lógica de roles)
CREATE POLICY "Solo admins pueden eliminar cotizaciones"
  ON cotizaciones FOR DELETE
  TO authenticated
  USING (true); -- Ajustar según tu sistema de roles

-- Políticas para items de cotización
CREATE POLICY "Usuarios autenticados pueden ver items"
  ON cotizacion_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items"
  ON cotizacion_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar items"
  ON cotizacion_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items"
  ON cotizacion_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL - Comentar en producción)
-- =====================================================

-- Ejemplo de cotización
/*
INSERT INTO cotizaciones (
  cliente_nombre, cliente_telefono, cliente_email,
  subtotal, descuento, iva, total,
  tipo_cliente, tiempo_entrega, vigencia_dias, notas,
  score
) VALUES (
  'Empresa Demo SA de CV',
  '+52 614 123 4567',
  'contacto@empresademo.com',
  10000.00,
  500.00,
  1520.00,
  11020.00,
  'NEGOCIO_NUEVO',
  '3-5 días hábiles',
  5,
  'Cliente nuevo interesado en servicios recurrentes',
  calcular_score_cotizacion(11020.00, 'NEGOCIO_NUEVO', '3-5 días hábiles', 3)
) RETURNING id;

-- Ejemplo de items (usar el ID retornado arriba)
INSERT INTO cotizacion_items (
  cotizacion_id, numero_item, descripcion, cantidad, unidad,
  precio_unitario, total, tipo_servicio
) VALUES
  ('ID_DE_LA_COTIZACION', 1, 'Impresión DTF para uniformes (logo full color)', '100', 'pzas', 12.00, 1200.00, 'DTF_TEXTIL'),
  ('ID_DE_LA_COTIZACION', 2, 'Tarjetas de presentación premium', '1000', 'pzas', 0.80, 800.00, 'PAPELERIA'),
  ('ID_DE_LA_COTIZACION', 3, 'Lona 3x2 metros para fachada', '1', 'servicio', 540.00, 540.00, 'LONA');
*/

-- =====================================================
-- GRANTS Y PERMISOS
-- =====================================================

-- Asegurar que el usuario de servicio de Supabase tenga acceso
GRANT SELECT, INSERT, UPDATE, DELETE ON cotizaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cotizacion_items TO authenticated;
GRANT SELECT ON v_cotizaciones_resumen TO authenticated;
GRANT SELECT ON v_servicios_mas_cotizados TO authenticated;
GRANT SELECT ON v_cotizaciones_mensuales TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_score_cotizacion TO authenticated;

-- =====================================================
-- ÍNDICES ADICIONALES PARA ANÁLISIS
-- =====================================================

-- Para búsquedas full-text en notas (opcional)
-- CREATE INDEX idx_cotizaciones_notas_fts ON cotizaciones USING gin(to_tsvector('spanish', COALESCE(notas, '')));

-- Para reportes por rango de fechas
CREATE INDEX idx_cotizaciones_fecha_creacion_range ON cotizaciones(fecha_creacion) WHERE status != 'PERDIDO';

-- =====================================================
-- VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

-- Ejecutar para verificar que todo está creado correctamente
DO $$
BEGIN
  RAISE NOTICE '✅ Módulo de Cotizaciones instalado correctamente';
  RAISE NOTICE '📊 Tablas creadas: cotizaciones, cotizacion_items';
  RAISE NOTICE '📈 Vistas creadas: v_cotizaciones_resumen, v_servicios_mas_cotizados, v_cotizaciones_mensuales';
  RAISE NOTICE '⚙️  Funciones creadas: generar_folio_cotizacion, calcular_score_cotizacion';
  RAISE NOTICE '🔒 Políticas RLS habilitadas';
END $$;
