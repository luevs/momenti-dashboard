import { useState, useEffect, useCallback } from 'react';
import { MATERIALS } from './pricingData';

/**
 * Hook personalizado para gestionar configuración de precios con localStorage
 * Usa localStorage para persistencia sin requerir autenticación
 */
export const usePricingSettings = () => {
  const [customPrices, setCustomPricesState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función helper para inicializar precios por defecto (sin cálculos automáticos)
  // Todos los tipos de cliente inician con los mismos valores base
  const getDefaultPrices = useCallback(() => {
    // Valores base sin multiplicadores - el usuario los ajustará manualmente
    const basePrices = {
      dtfTextil: {
        fraction: MATERIALS.DTF_TEXTIL.prices.regular.fraction,
        fullMeter: MATERIALS.DTF_TEXTIL.prices.regular.fullMeter,
        loyalty10: MATERIALS.DTF_TEXTIL.prices.loyalty[0].pricePerMeter,
        loyalty20: MATERIALS.DTF_TEXTIL.prices.loyalty[1].pricePerMeter,
        loyalty50: MATERIALS.DTF_TEXTIL.prices.loyalty[2].pricePerMeter,
      },
      dtfUV: {
        regular: MATERIALS.DTF_UV.prices.regular,
        loyalty10: MATERIALS.DTF_UV.prices.loyalty[0].pricePerMeter,
        loyalty20: MATERIALS.DTF_UV.prices.loyalty[1].pricePerMeter,
        loyalty50: MATERIALS.DTF_UV.prices.loyalty[2].pricePerMeter,
      }
    };

    return {
      dtfTextil: {
        elite: { ...basePrices.dtfTextil },
        pro: { ...basePrices.dtfTextil },
        cf: { ...basePrices.dtfTextil },
      },
      dtfUV: {
        elite: { ...basePrices.dtfUV },
        pro: { ...basePrices.dtfUV },
        cf: { ...basePrices.dtfUV },
      },
      viniles: {
        impreso: {
          elite: {
            below05: MATERIALS.VINILES.types.impreso.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.impreso.pricePerM2,
            above8: MATERIALS.VINILES.types.impreso.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.impreso.minimum,
          },
          pro: {
            below05: MATERIALS.VINILES.types.impreso.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.impreso.pricePerM2,
            above8: MATERIALS.VINILES.types.impreso.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.impreso.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.impreso.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.impreso.pricePerM2,
            above8: MATERIALS.VINILES.types.impreso.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.impreso.minimum,
          },
        },
        suajado: {
          elite: {
            below05: MATERIALS.VINILES.types.suajado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.suajado.pricePerM2,
            above8: MATERIALS.VINILES.types.suajado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.suajado.minimum,
          },
          pro: {
            below05: MATERIALS.VINILES.types.suajado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.suajado.pricePerM2,
            above8: MATERIALS.VINILES.types.suajado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.suajado.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.suajado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.suajado.pricePerM2,
            above8: MATERIALS.VINILES.types.suajado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.suajado.minimum,
          },
        },
        microperforado: {
          elite: {
            below05: MATERIALS.VINILES.types.microperforado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.microperforado.pricePerM2,
            above8: MATERIALS.VINILES.types.microperforado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.microperforado.minimum,
          },
          pro: {
            below05: MATERIALS.VINILES.types.microperforado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.microperforado.pricePerM2,
            above8: MATERIALS.VINILES.types.microperforado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.microperforado.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.microperforado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.microperforado.pricePerM2,
            above8: MATERIALS.VINILES.types.microperforado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.microperforado.minimum,
          },
        },
        holografico: {
          elite: {
            below05: MATERIALS.VINILES.types.holografico.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.holografico.pricePerM2,
            above8: MATERIALS.VINILES.types.holografico.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.holografico.minimum,
          },
          pro: {
            below05: MATERIALS.VINILES.types.holografico.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.holografico.pricePerM2,
            above8: MATERIALS.VINILES.types.holografico.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.holografico.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.holografico.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.holografico.pricePerM2,
            above8: MATERIALS.VINILES.types.holografico.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.holografico.minimum,
          },
        },
        lona: {
          elite: {
            below05: MATERIALS.VINILES.types.lona.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.lona.pricePerM2,
            above8: MATERIALS.VINILES.types.lona.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.lona.minimum,
          },
          pro: {
            below05: MATERIALS.VINILES.types.lona.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.lona.pricePerM2,
            above8: MATERIALS.VINILES.types.lona.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.lona.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.lona.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.lona.pricePerM2,
            above8: MATERIALS.VINILES.types.lona.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.lona.minimum,
          },
        },
      },
      papel: {
        elite: {
          range1: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[0].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[0].minimum,
          },
          range2: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[1].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[1].minimum,
          },
          range3: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[2].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[2].minimum,
          },
        },
        pro: {
          range1: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[0].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[0].minimum,
          },
          range2: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[1].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[1].minimum,
          },
          range3: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[2].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[2].minimum,
          },
        },
        cf: {
          range1: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[0].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[0].minimum,
          },
          range2: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[1].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[1].minimum,
          },
          range3: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[2].pricePerSheet,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[2].minimum,
          },
        },
      },
    };
  }, []);

  // Cargar configuración de precios desde localStorage
  const loadPricingSettings = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      // Intentar cargar desde localStorage
      const savedPrices = localStorage.getItem('customPrices');
      
      if (savedPrices) {
        try {
          const parsedPrices = JSON.parse(savedPrices);
          setCustomPricesState(parsedPrices);
        } catch (parseError) {
          console.error('Error parseando precios guardados:', parseError);
          // Si hay error parseando, usar valores por defecto
          const defaultPrices = getDefaultPrices();
          setCustomPricesState(defaultPrices);
          localStorage.setItem('customPrices', JSON.stringify(defaultPrices));
        }
      } else {
        // Si no hay precios guardados, usar valores por defecto
        const defaultPrices = getDefaultPrices();
        setCustomPricesState(defaultPrices);
        localStorage.setItem('customPrices', JSON.stringify(defaultPrices));
      }
    } catch (err) {
      console.error('Error al cargar precios:', err);
      setError(err.message);
      // Usar precios por defecto en caso de error
      setCustomPricesState(getDefaultPrices());
    } finally {
      setIsLoading(false);
    }
  }, [getDefaultPrices]);

  // Guardar configuración de precios en localStorage
  const setCustomPrices = useCallback((newPrices) => {
    try {
      setError(null);
      
      // Guardar en localStorage
      localStorage.setItem('customPrices', JSON.stringify(newPrices));
      
      // Actualizar estado
      setCustomPricesState(newPrices);
      
      console.log('✅ Precios guardados exitosamente en localStorage');
    } catch (err) {
      console.error('Error al guardar precios:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Cargar precios al montar el componente
  useEffect(() => {
    loadPricingSettings();
  }, [loadPricingSettings]);

  return {
    customPrices,
    setCustomPrices,
    isLoading,
    error,
    reloadPrices: loadPricingSettings
  };
};
