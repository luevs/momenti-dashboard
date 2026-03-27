// Funciones de cálculo para el cotizador
// Optimización de layout y cálculo de área/metros necesarios

/**
 * Calcula el layout óptimo para stickers/calcomanías en un rollo
 * @param {number} stickerWidth - Ancho del sticker en cm
 * @param {number} stickerHeight - Alto del sticker en cm
 * @param {number} quantity - Cantidad de stickers necesarios
 * @param {number} materialWidth - Ancho del material/rollo en cm
 * @param {number} spacing - Espaciado entre cortes en cm
 * @returns {object} Resultados del cálculo de layout
 */
export const calculateLayout = (stickerWidth, stickerHeight, quantity, materialWidth, spacing = 0.5) => {
  // Validaciones básicas
  if (stickerWidth <= 0 || stickerHeight <= 0 || quantity <= 0 || materialWidth <= 0) {
    return { error: 'Valores inválidos' };
  }

  // Intentar ambas orientaciones y elegir la más eficiente
  const horizontalLayout = calculateOrientation(stickerWidth, stickerHeight, quantity, materialWidth, spacing, false);
  const verticalLayout = calculateOrientation(stickerHeight, stickerWidth, quantity, materialWidth, spacing, true);

  // Elegir la orientación que use menos metros
  const bestLayout = horizontalLayout.totalMeters <= verticalLayout.totalMeters 
    ? horizontalLayout 
    : verticalLayout;

  return bestLayout;
};

/**
 * Calcula layout para una orientación específica
 */
const calculateOrientation = (width, height, quantity, materialWidth, spacing, isRotated) => {
  const effectiveWidth = width + spacing;
  const effectiveHeight = height + spacing;

  // Cuántos caben por fila (ancho del rollo)
  const perRow = Math.floor((materialWidth + spacing) / effectiveWidth);

  if (perRow === 0) {
    return {
      error: true,
      message: `El sticker (${width}cm) es más ancho que el material (${materialWidth}cm)`,
      exceedsWidth: true
    };
  }

  // Cuántas filas necesitamos
  const rows = Math.ceil(quantity / perRow);

  // Metros lineales necesarios
  const totalMeters = (rows * effectiveHeight) / 100; // convertir cm a metros

  // Cuántos stickers realmente caben (puede ser más que quantity)
  const totalFits = perRow * rows;

  // Stickers extra (desperdicio en cantidad)
  const extraStickers = totalFits - quantity;

  // Porcentaje de eficiencia
  const efficiency = (quantity / totalFits) * 100;

  // Área total usada vs área del material
  const usedAreaM2 = (totalFits * width * height) / 10000; // cm² a m²
  const materialAreaM2 = (materialWidth * (totalMeters * 100)) / 10000; // m²
  const wastePercent = ((materialAreaM2 - usedAreaM2) / materialAreaM2) * 100;

  return {
    error: false,
    perRow,
    rows,
    totalMeters: parseFloat(totalMeters.toFixed(3)),
    totalFits,
    extraStickers,
    efficiency: parseFloat(efficiency.toFixed(1)),
    wastePercent: parseFloat(wastePercent.toFixed(1)),
    isRotated,
    orientation: isRotated ? 'vertical' : 'horizontal',
    dimensions: {
      width: isRotated ? height : width,
      height: isRotated ? width : height,
    },
    spacing
  };
};

/**
 * Convierte metros lineales a metros cuadrados dado un ancho
 * @param {number} meters - Metros lineales
 * @param {number} widthCm - Ancho en cm
 * @returns {number} Metros cuadrados
 */
export const metersToM2 = (meters, widthCm) => {
  return (meters * widthCm) / 100;
};

/**
 * Calcula el área de un sticker en m²
 * @param {number} widthCm - Ancho en cm
 * @param {number} heightCm - Alto en cm
 * @returns {number} Área en m²
 */
export const calculateStickerArea = (widthCm, heightCm) => {
  return (widthCm * heightCm) / 10000;
};

/**
 * Calcula el total de m² para viniles basado en dimensiones y cantidad
 * @param {number} widthCm - Ancho del sticker en cm
 * @param {number} heightCm - Alto del sticker en cm
 * @param {number} quantity - Cantidad de stickers
 * @param {number} materialWidth - Ancho del material (default 140cm)
 * @param {number} spacing - Espaciado en cm
 * @returns {object} Resultado del cálculo
 */
export const calculateVinylM2 = (widthCm, heightCm, quantity, materialWidth = 140, spacing = 0.5) => {
  // Primero calculamos el layout óptimo
  const layout = calculateLayout(widthCm, heightCm, quantity, materialWidth, spacing);
  
  if (layout.error) {
    return layout;
  }

  // Convertimos metros lineales a m²
  const m2 = metersToM2(layout.totalMeters, materialWidth);

  return {
    ...layout,
    m2: parseFloat(m2.toFixed(3)),
    materialWidthCm: materialWidth
  };
};

/**
 * Genera un preview visual del layout (datos para UI)
 * @param {object} layout - Resultado de calculateLayout
 * @param {number} maxPreviewItems - Cantidad máxima de items a mostrar en preview
 * @returns {object} Datos para renderizar preview
 */
export const generateLayoutPreview = (layout, maxPreviewItems = 100) => {
  if (layout.error) return null;

  const itemsToShow = Math.min(layout.totalFits, maxPreviewItems);
  const items = [];

  for (let i = 0; i < itemsToShow; i++) {
    const row = Math.floor(i / layout.perRow);
    const col = i % layout.perRow;
    
    items.push({
      id: i,
      row,
      col,
      isExtra: i >= (layout.totalFits - layout.extraStickers)
    });
  }

  return {
    items,
    rows: layout.rows,
    perRow: layout.perRow,
    showingAll: itemsToShow === layout.totalFits,
    truncated: layout.totalFits > maxPreviewItems,
    totalItems: layout.totalFits
  };
};

/**
 * Formatea metros para mostrar
 * @param {number} meters
 * @returns {string}
 */
export const formatMeters = (meters) => {
  if (meters < 1) {
    return `${(meters * 100).toFixed(0)} cm`;
  }
  return `${meters.toFixed(2)} m`;
};

/**
 * Formatea m² para mostrar
 * @param {number} m2
 * @returns {string}
 */
export const formatM2 = (m2) => {
  return `${m2.toFixed(2)} m²`;
};

/**
 * Formatea precio en moneda mexicana
 * @param {number} price
 * @returns {string}
 */
export const formatPrice = (price) => {
  return `$${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

/**
 * Calcula el resumen completo para papel adhesivo
 * @param {number} cuts - Número de cortes por plantilla
 * @param {number} sheets - Número de plantillas
 * @returns {object} Resumen del cálculo
 */
export const calculatePapelAdhesivo = (cuts, sheets) => {
  return {
    cuts,
    sheets,
    totalCuts: cuts * sheets,
    // El precio se calcula en pricingData.js
  };
};

/**
 * Genera texto de resumen para copiar al clipboard
 * @param {object} quotation - Objeto con datos de la cotización
 * @returns {string} Texto formateado
 */
export const generateQuotationText = (quotation) => {
  const lines = [
    '═══════════════════════════════════',
    '    COTIZACIÓN - MOMENTI',
    '    Imprenta y Publicidad',
    '═══════════════════════════════════',
    '',
    `Producto: ${quotation.productName}`,
  ];

  if (quotation.type === 'sticker') {
    lines.push(
      `Medidas: ${quotation.width} x ${quotation.height} cm`,
      `Cantidad: ${quotation.quantity} unidades`,
      `Orientación: ${quotation.orientation === 'horizontal' ? 'Horizontal' : 'Vertical (rotado)'}`,
      ``,
      `Distribución:`,
      `  • ${quotation.perRow} stickers por fila`,
      `  • ${quotation.rows} filas necesarias`,
      `  • ${quotation.totalFits} stickers totales (${quotation.extraStickers} extras)`,
      ``,
      `Material necesario:`,
      `  • ${formatMeters(quotation.meters)}`,
    );

    if (quotation.m2) {
      lines.push(`  • ${formatM2(quotation.m2)}`);
    }
  } else if (quotation.type === 'papel') {
    lines.push(
      `Medidas sticker: ${quotation.width} x ${quotation.height} cm`,
      `Cantidad: ${quotation.quantity} unidades`,
      `Hoja Tabloide: ${quotation.sheetSize}`,
      ``,
      `Distribución:`,
      `  • ${quotation.perSheet} stickers por hoja`,
      `  • ${quotation.perRow} por fila × ${quotation.rows} filas`,
      `  • ${quotation.sheetsNeeded} hojas necesarias`,
      `  • ${quotation.totalCapacity} stickers totales (${quotation.extraStickers} extras)`,
      ``,
      `Precio: ${formatPrice(quotation.pricePerSheet)}/hoja × ${quotation.sheetsNeeded} hojas`,
    );
  }

  lines.push(
    ``,
    `PRECIO TOTAL: ${formatPrice(quotation.total || quotation.price)}`,
    ``,
    '═══════════════════════════════════',
    `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
    '═══════════════════════════════════'
  );

  return lines.join('\n');
};
