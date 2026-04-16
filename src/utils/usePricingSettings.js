import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { MATERIALS } from './pricingData';

/**
 * Hook personalizado para gestionar configuración de precios desde Supabase
 * Carga precios al inicio y guarda cambios automáticamente
 */
export const usePricingSettings = () => {
  const [customPrices, setCustomPrices] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configId, setConfigId] = useState(null);

  // Función helper para calcular precios por defecto con tipos de cliente
  const getDefaultPrices = useCallback(() => {
    return {
      dtfTextil: {
        elite: {
          fraction: MATERIALS.DTF_TEXTIL.prices.regular.fraction * 0.85,
          fullMeter: MATERIALS.DTF_TEXTIL.prices.regular.fullMeter * 0.85,
          loyalty10: MATERIALS.DTF_TEXTIL.prices.loyalty[0].pricePerMeter * 0.85,
          loyalty20: MATERIALS.DTF_TEXTIL.prices.loyalty[1].pricePerMeter * 0.85,
          loyalty50: MATERIALS.DTF_TEXTIL.prices.loyalty[2].pricePerMeter * 0.85,
        },
        pro: {
          fraction: MATERIALS.DTF_TEXTIL.prices.regular.fraction,
          fullMeter: MATERIALS.DTF_TEXTIL.prices.regular.fullMeter,
          loyalty10: MATERIALS.DTF_TEXTIL.prices.loyalty[0].pricePerMeter,
          loyalty20: MATERIALS.DTF_TEXTIL.prices.loyalty[1].pricePerMeter,
          loyalty50: MATERIALS.DTF_TEXTIL.prices.loyalty[2].pricePerMeter,
        },
        cf: {
          fraction: MATERIALS.DTF_TEXTIL.prices.regular.fraction * 1.15,
          fullMeter: MATERIALS.DTF_TEXTIL.prices.regular.fullMeter * 1.15,
          loyalty10: MATERIALS.DTF_TEXTIL.prices.loyalty[0].pricePerMeter * 1.15,
          loyalty20: MATERIALS.DTF_TEXTIL.prices.loyalty[1].pricePerMeter * 1.15,
          loyalty50: MATERIALS.DTF_TEXTIL.prices.loyalty[2].pricePerMeter * 1.15,
        },
      },
      dtfUV: {
        elite: {
          regular: MATERIALS.DTF_UV.prices.regular * 0.85,
          loyalty10: MATERIALS.DTF_UV.prices.loyalty[0].pricePerMeter * 0.85,
          loyalty20: MATERIALS.DTF_UV.prices.loyalty[1].pricePerMeter * 0.85,
          loyalty50: MATERIALS.DTF_UV.prices.loyalty[2].pricePerMeter * 0.85,
        },
        pro: {
          regular: MATERIALS.DTF_UV.prices.regular,
          loyalty10: MATERIALS.DTF_UV.prices.loyalty[0].pricePerMeter,
          loyalty20: MATERIALS.DTF_UV.prices.loyalty[1].pricePerMeter,
          loyalty50: MATERIALS.DTF_UV.prices.loyalty[2].pricePerMeter,
        },
        cf: {
          regular: MATERIALS.DTF_UV.prices.regular * 1.15,
          loyalty10: MATERIALS.DTF_UV.prices.loyalty[0].pricePerMeter * 1.15,
          loyalty20: MATERIALS.DTF_UV.prices.loyalty[1].pricePerMeter * 1.15,
          loyalty50: MATERIALS.DTF_UV.prices.loyalty[2].pricePerMeter * 1.15,
        },
      },
      viniles: {
        impreso: {
          elite: {
            below05: MATERIALS.VINILES.types.impreso.pricePerM2Below05 * 0.85,
            regular: MATERIALS.VINILES.types.impreso.pricePerM2 * 0.85,
            above8: MATERIALS.VINILES.types.impreso.pricePerM2Above8 * 0.85,
            minimum: MATERIALS.VINILES.types.impreso.minimum * 0.85,
          },
          pro: {
            below05: MATERIALS.VINILES.types.impreso.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.impreso.pricePerM2,
            above8: MATERIALS.VINILES.types.impreso.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.impreso.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.impreso.pricePerM2Below05 * 1.15,
            regular: MATERIALS.VINILES.types.impreso.pricePerM2 * 1.15,
            above8: MATERIALS.VINILES.types.impreso.pricePerM2Above8 * 1.15,
            minimum: MATERIALS.VINILES.types.impreso.minimum * 1.15,
          },
        },
        suajado: {
          elite: {
            below05: MATERIALS.VINILES.types.suajado.pricePerM2Below05 * 0.85,
            regular: MATERIALS.VINILES.types.suajado.pricePerM2 * 0.85,
            above8: MATERIALS.VINILES.types.suajado.pricePerM2Above8 * 0.85,
            minimum: MATERIALS.VINILES.types.suajado.minimum * 0.85,
          },
          pro: {
            below05: MATERIALS.VINILES.types.suajado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.suajado.pricePerM2,
            above8: MATERIALS.VINILES.types.suajado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.suajado.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.suajado.pricePerM2Below05 * 1.15,
            regular: MATERIALS.VINILES.types.suajado.pricePerM2 * 1.15,
            above8: MATERIALS.VINILES.types.suajado.pricePerM2Above8 * 1.15,
            minimum: MATERIALS.VINILES.types.suajado.minimum * 1.15,
          },
        },
        microperforado: {
          elite: {
            below05: MATERIALS.VINILES.types.microperforado.pricePerM2Below05 * 0.85,
            regular: MATERIALS.VINILES.types.microperforado.pricePerM2 * 0.85,
            above8: MATERIALS.VINILES.types.microperforado.pricePerM2Above8 * 0.85,
            minimum: MATERIALS.VINILES.types.microperforado.minimum * 0.85,
          },
          pro: {
            below05: MATERIALS.VINILES.types.microperforado.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.microperforado.pricePerM2,
            above8: MATERIALS.VINILES.types.microperforado.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.microperforado.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.microperforado.pricePerM2Below05 * 1.15,
            regular: MATERIALS.VINILES.types.microperforado.pricePerM2 * 1.15,
            above8: MATERIALS.VINILES.types.microperforado.pricePerM2Above8 * 1.15,
            minimum: MATERIALS.VINILES.types.microperforado.minimum * 1.15,
          },
        },
        holografico: {
          elite: {
            below05: MATERIALS.VINILES.types.holografico.pricePerM2Below05 * 0.85,
            regular: MATERIALS.VINILES.types.holografico.pricePerM2 * 0.85,
            above8: MATERIALS.VINILES.types.holografico.pricePerM2Above8 * 0.85,
            minimum: MATERIALS.VINILES.types.holografico.minimum * 0.85,
          },
          pro: {
            below05: MATERIALS.VINILES.types.holografico.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.holografico.pricePerM2,
            above8: MATERIALS.VINILES.types.holografico.pricePerM2Above8,
            minimum: MATERIALS.VINILES.types.holografico.minimum,
          },
          cf: {
            below05: MATERIALS.VINILES.types.holografico.pricePerM2Below05 * 1.15,
            regular: MATERIALS.VINILES.types.holografico.pricePerM2 * 1.15,
            above8: MATERIALS.VINILES.types.holografico.pricePerM2Above8 * 1.15,
            minimum: MATERIALS.VINILES.types.holografico.minimum * 1.15,
          },
        },
        lona: {
          elite: {
            below05: MATERIALS.VINILES.types.lona.pricePerM2Below05,
            regular: MATERIALS.VINILES.types.lona.pricePerM2 * 0.85,
            above8: MATERIALS.VINILES.types.lona.pricePerM2Above8 * 0.85,
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
            regular: MATERIALS.VINILES.types.lona.pricePerM2 * 1.15,
            above8: MATERIALS.VINILES.types.lona.pricePerM2Above8 * 1.15,
            minimum: MATERIALS.VINILES.types.lona.minimum,
          },
        },
      },
      papel: {
        elite: {
          range1: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[0].pricePerSheet * 0.85,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[0].minimum * 0.85,
          },
          range2: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[1].pricePerSheet * 0.85,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[1].minimum * 0.85,
          },
          range3: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[2].pricePerSheet * 0.85,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[2].minimum * 0.85,
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
            price: MATERIALS.PAPEL_ADHESIVO.ranges[0].pricePerSheet * 1.15,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[0].minimum * 1.15,
          },
          range2: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[1].pricePerSheet * 1.15,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[1].minimum * 1.15,
          },
          range3: {
            price: MATERIALS.PAPEL_ADHESIVO.ranges[2].pricePerSheet * 1.15,
            minimum: MATERIALS.PAPEL_ADHESIVO.ranges[2].minimum * 1.15,
          },
        },
      },
    };
  }, []);

  // Cargar configuración de precios desde Supabase
  const loadPricingSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      // Primero intentar obtener configuración personal del usuario
      let { data: userConfig, error: userError } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      // Si no hay configuración personal, obtener la global
      if (userError || !userConfig) {
        const { data: globalConfig, error: globalError } = await supabase
          .from('pricing_settings')
          .select('*')
          .is('user_id', null)
          .eq('is_active', true)
          .single();

        if (globalError) {
          console.error('Error cargando configuración global:', globalError);
          // Usar precios por defecto
          setCustomPrices(getDefaultPrices());
          setConfigId(null);
        } else {
          setCustomPrices(globalConfig.price_config);
          setConfigId(globalConfig.id);
        }
      } else {
        setCustomPrices(userConfig.price_config);
        setConfigId(userConfig.id);
      }
    } catch (err) {
      console.error('Error al cargar precios:', err);
      setError(err.message);
      // Usar precios por defecto en caso de error
      setCustomPrices(getDefaultPrices());
    } finally {
      setIsLoading(false);
    }
  }, [getDefaultPrices]);

  // Guardar configuración de precios en Supabase
  const savePricingSettings = useCallback(async (newPrices) => {
    try {
      setError(null);

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      if (configId) {
        // Actualizar configuración existente
        const { error: updateError } = await supabase
          .from('pricing_settings')
          .update({
            price_config: newPrices,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId);

        if (updateError) throw updateError;
      } else {
        // Crear nueva configuración personal
        const { data: newConfig, error: insertError } = await supabase
          .from('pricing_settings')
          .insert({
            user_id: user.id,
            config_name: 'Mi Configuración',
            price_config: newPrices,
            is_active: true,
            created_by: user.id
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfigId(newConfig.id);
      }

      setCustomPrices(newPrices);
      console.log('✅ Precios guardados exitosamente en Supabase');
    } catch (err) {
      console.error('Error al guardar precios:', err);
      setError(err.message);
      throw err;
    }
  }, [configId]);

  // Cargar precios al montar el componente
  useEffect(() => {
    loadPricingSettings();
  }, [loadPricingSettings]);

  return {
    customPrices,
    setCustomPrices: savePricingSettings,
    isLoading,
    error,
    reloadPrices: loadPricingSettings
  };
};
