// Configuración de precios y materiales para el cotizador
// Basado en las listas de precios de Momenti

export const MATERIALS = {
  DTF_TEXTIL: {
    id: 'dtf_textil',
    name: 'DTF Textil',
    description: 'Direct to Film para textiles',
    width: 58, // cm
    unit: 'metro_lineal',
    prices: {
      regular: {
        // 1 metro o más
        fullMeter: 250,
        // Menos de medio metro (fraccionado)
        fraction: 300,
      },
      loyalty: [
        { meters: 10, pricePerMeter: 230, total: 2300 },
        { meters: 20, pricePerMeter: 210, total: 4200 },
        { meters: 50, pricePerMeter: 190, total: 9500 },
      ]
    }
  },
  
  DTF_UV: {
    id: 'dtf_uv',
    name: 'DTF UV',
    description: 'Impresión UV para superficies rígidas',
    width: 28, // cm
    unit: 'metro_lineal',
    prices: {
      regular: 400, // por metro
      loyalty: [
        { meters: 10, pricePerMeter: 380, total: 3800 },
        { meters: 20, pricePerMeter: 360, total: 7200 },
        { meters: 50, pricePerMeter: 340, total: 17000 },
      ]
    }
  },

  VINILES: {
    id: 'viniles',
    name: 'Viniles y Lonas',
    description: 'Diferentes tipos de vinil para impresión',
    width: 140, // cm (1.4m)
    unit: 'm2',
    types: {
      impreso: {
        name: 'Vinil Impreso',
        pricePerM2: 120,
        pricePerM2Above8: 100, // +8m²
        pricePerM2Below05: 160, // <0.5m²
        minimum: 80,
      },
      suajado: {
        name: 'Vinil Suajado',
        width: 120, // cm (1.2m) - ancho específico para vinil suajado
        pricePerM2: 220,
        pricePerM2Above8: 200,
        pricePerM2Below05: 260,
        minimum: 130,
      },
      microperforado: {
        name: 'Microperforado',
        pricePerM2: 150,
        pricePerM2Above8: 150,
        pricePerM2Below05: 190,
        minimum: 95,
      },
      holografico: {
        name: 'Holográfico',
        pricePerM2: 250,
        pricePerM2Above8: 250,
        pricePerM2Below05: 290,
        minimum: 145,
      },
      lona: {
        name: 'Lona',
        pricePerM2: 90,
        pricePerM2Above8: 75,
        pricePerM2Below05: null, // No aplica para lona
        minimum: null, // No tiene mínimo especificado
      }
    }
  },

  PAPEL_ADHESIVO: {
    id: 'papel_adhesivo',
    name: 'Papel Adhesivo Suajado',
    description: 'Papel adhesivo suajado',
    // Medidas reales: 31 x 46 cm
    // Área imprimible: restando 1.5cm por lado para marcas de corte
    sheetWidth: 28, // cm (31 - 1.5*2)
    sheetHeight: 43, // cm (46 - 1.5*2)
    unit: 'plantilla',
    minimumSheets: 5,
    ranges: [
      { minCuts: 0, maxCuts: 40, pricePerSheet: 30, minimum: 150 },
      { minCuts: 41, maxCuts: 70, pricePerSheet: 40, minimum: 200 },
      { minCuts: 71, maxCuts: Infinity, pricePerSheet: 50, minimum: 250 },
    ]
  }
};

// Configuraciones generales
export const CONFIG = {
  defaultSpacing: 0.5, // cm entre cortes
  defaultMargin: 0, // cm margen en bordes (puede ser ajustado)
  currency: '$', // MXN
  measureUnit: 'cm',
};

// Función helper para obtener precio de vinil según tipo y cantidad
export const getVinylPrice = (type, m2) => {
  const vinyl = MATERIALS.VINILES.types[type];
  if (!vinyl) return null;

  let pricePerM2;
  
  if (m2 < 0.5 && vinyl.pricePerM2Below05) {
    pricePerM2 = vinyl.pricePerM2Below05;
  } else if (m2 >= 8 && vinyl.pricePerM2Above8) {
    pricePerM2 = vinyl.pricePerM2Above8;
  } else {
    pricePerM2 = vinyl.pricePerM2;
  }

  const subtotal = pricePerM2 * m2;
  const total = vinyl.minimum && subtotal < vinyl.minimum ? vinyl.minimum : subtotal;

  return {
    pricePerM2,
    subtotal,
    minimum: vinyl.minimum,
    total,
    minimumApplied: total > subtotal
  };
};

// Función helper para obtener precio de DTF textil
export const getDTFTextilPrice = (meters) => {
  const material = MATERIALS.DTF_TEXTIL;
  
  if (meters < 0.5) {
    return {
      type: 'fraction',
      pricePerMeter: material.prices.regular.fraction,
      total: material.prices.regular.fraction * meters,
      meters
    };
  } else {
    // Aplicar precio de lealtad automáticamente si califica
    let appliedPrice = null;
    for (let i = material.prices.loyalty.length - 1; i >= 0; i--) {
      if (meters >= material.prices.loyalty[i].meters) {
        appliedPrice = material.prices.loyalty[i];
        break;
      }
    }
    
    if (appliedPrice) {
      // Precio de lealtad aplicado
      const pricePerMeter = appliedPrice.pricePerMeter;
      return {
        type: 'loyalty',
        pricePerMeter,
        total: pricePerMeter * meters,
        meters,
        loyaltyTier: appliedPrice.meters,
        loyaltyOptions: material.prices.loyalty
          .filter(option => option.meters !== appliedPrice.meters)
          .map(option => ({
            ...option,
            savings: (pricePerMeter * option.meters) - option.total,
            savingsPercent: Math.round(((pricePerMeter * option.meters) - option.total) / (pricePerMeter * option.meters) * 100)
          }))
      };
    } else {
      // Precio regular
      return {
        type: 'regular',
        pricePerMeter: material.prices.regular.fullMeter,
        total: material.prices.regular.fullMeter * meters,
        meters,
        loyaltyOptions: material.prices.loyalty.map(option => ({
          ...option,
          savings: (material.prices.regular.fullMeter * option.meters) - option.total,
          savingsPercent: Math.round(((material.prices.regular.fullMeter * option.meters) - option.total) / (material.prices.regular.fullMeter * option.meters) * 100)
        }))
      };
    }
  }
};

// Función helper para obtener precio de DTF UV
export const getDTFUVPrice = (meters) => {
  const material = MATERIALS.DTF_UV;
  
  // Aplicar precio de lealtad automáticamente si califica
  let appliedPrice = null;
  if (material.prices.loyalty) {
    for (let i = material.prices.loyalty.length - 1; i >= 0; i--) {
      if (meters >= material.prices.loyalty[i].meters) {
        appliedPrice = material.prices.loyalty[i];
        break;
      }
    }
  }
  
  if (appliedPrice) {
    // Precio de lealtad aplicado
    const pricePerMeter = appliedPrice.pricePerMeter;
    return {
      type: 'loyalty',
      pricePerMeter,
      total: pricePerMeter * meters,
      meters,
      loyaltyTier: appliedPrice.meters,
      loyaltyOptions: material.prices.loyalty
        .filter(option => option.meters !== appliedPrice.meters)
        .map(option => ({
          ...option,
          savings: (pricePerMeter * option.meters) - option.total,
          savingsPercent: Math.round(((pricePerMeter * option.meters) - option.total) / (pricePerMeter * option.meters) * 100)
        }))
    };
  } else {
    // Precio regular
    return {
      type: 'regular',
      pricePerMeter: material.prices.regular,
      total: material.prices.regular * meters,
      meters,
      loyaltyOptions: material.prices.loyalty ? material.prices.loyalty.map(option => ({
        ...option,
        savings: (material.prices.regular * option.meters) - option.total,
        savingsPercent: Math.round(((material.prices.regular * option.meters) - option.total) / (material.prices.regular * option.meters) * 100)
      })) : []
    };
  }
};

// Función helper para obtener precio de papel adhesivo
export const getPapelAdhesivoPrice = (cuts, sheets) => {
  const material = MATERIALS.PAPEL_ADHESIVO;
  
  if (sheets < material.minimumSheets) {
    return {
      error: true,
      message: `Pedido mínimo de ${material.minimumSheets} plantillas`,
      minimumSheets: material.minimumSheets
    };
  }

  const range = material.ranges.find(r => cuts >= r.minCuts && cuts <= r.maxCuts);
  
  if (!range) return null;

  const subtotal = range.pricePerSheet * sheets;
  const total = subtotal < range.minimum ? range.minimum : subtotal;

  return {
    pricePerSheet: range.pricePerSheet,
    sheets,
    cuts,
    subtotal,
    minimum: range.minimum,
    total,
    minimumApplied: total > subtotal
  };
};

// Función helper para calcular papel adhesivo con layout automático
export const getPapelAdhesivoWithLayout = (cutsPerSheet, sheets) => {
  const material = MATERIALS.PAPEL_ADHESIVO;
  
  if (sheets < material.minimumSheets) {
    return {
      error: true,
      message: `Pedido mínimo de ${material.minimumSheets} plantillas`,
      minimumSheets: material.minimumSheets
    };
  }

  const totalCuts = cutsPerSheet * sheets;
  const range = material.ranges.find(r => cutsPerSheet >= r.minCuts && cutsPerSheet <= r.maxCuts);
  
  if (!range) return null;

  const subtotal = range.pricePerSheet * sheets;
  const total = subtotal < range.minimum ? range.minimum : subtotal;

  return {
    pricePerSheet: range.pricePerSheet,
    sheets,
    cutsPerSheet,
    totalCuts,
    subtotal,
    minimum: range.minimum,
    total,
    minimumApplied: total > subtotal,
    rangeInfo: `${range.minCuts}-${range.maxCuts === Infinity ? '+' : range.maxCuts} cortes`
  };
};
