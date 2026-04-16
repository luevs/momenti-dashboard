-- =====================================================
-- TABLA DE CONFIGURACIÓN DE PRECIOS
-- =====================================================
-- Almacena las configuraciones de precios personalizados
-- para el cotizador y futuro catálogo de productos

-- Eliminar tabla si existe (solo para desarrollo)
DROP TABLE IF EXISTS public.pricing_settings CASCADE;

-- Crear tabla de configuración de precios
CREATE TABLE public.pricing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- user_id puede ser NULL para configuración global (por defecto)
  -- o puede referenciar a un vendedor específico
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Nombre descriptivo de esta configuración
  config_name VARCHAR(255) NOT NULL DEFAULT 'Configuración Principal',
  
  -- Configuración completa de precios en formato JSON
  -- Estructura: { dtfTextil: {...}, dtfUV: {...}, viniles: {...}, papel: {...} }
  price_config JSONB NOT NULL,
  
  -- Indica si esta es la configuración activa
  is_active BOOLEAN DEFAULT true,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_pricing_settings_user_id ON public.pricing_settings(user_id);
CREATE INDEX idx_pricing_settings_is_active ON public.pricing_settings(is_active);
CREATE INDEX idx_pricing_settings_config ON public.pricing_settings USING GIN (price_config);

-- Política: Solo una configuración activa por usuario
CREATE UNIQUE INDEX idx_pricing_settings_active_per_user 
  ON public.pricing_settings(user_id) 
  WHERE is_active = true;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_pricing_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
CREATE TRIGGER update_pricing_settings_timestamp
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_settings_timestamp();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver configuraciones globales (user_id NULL) y las suyas propias
CREATE POLICY "Users can view global and own pricing settings"
  ON public.pricing_settings
  FOR SELECT
  USING (
    user_id IS NULL OR 
    user_id = auth.uid()
  );

-- Política: Los usuarios pueden crear sus propias configuraciones
CREATE POLICY "Users can create own pricing settings"
  ON public.pricing_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política: Los usuarios pueden actualizar sus propias configuraciones
CREATE POLICY "Users can update own pricing settings"
  ON public.pricing_settings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Los usuarios pueden eliminar sus propias configuraciones
CREATE POLICY "Users can delete own pricing settings"
  ON public.pricing_settings
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- CONFIGURACIÓN GLOBAL POR DEFECTO
-- =====================================================

-- Insertar configuración global por defecto (user_id = NULL)
INSERT INTO public.pricing_settings (
  user_id,
  config_name,
  price_config,
  is_active
) VALUES (
  NULL,
  'Precios Base Momenti',
  '{
    "dtfTextil": {
      "elite": {
        "fraction": 255,
        "fullMeter": 212.5,
        "loyalty10": 195.5,
        "loyalty20": 178.5,
        "loyalty50": 161.5
      },
      "pro": {
        "fraction": 300,
        "fullMeter": 250,
        "loyalty10": 230,
        "loyalty20": 210,
        "loyalty50": 190
      },
      "cf": {
        "fraction": 345,
        "fullMeter": 287.5,
        "loyalty10": 264.5,
        "loyalty20": 241.5,
        "loyalty50": 218.5
      }
    },
    "dtfUV": {
      "elite": {
        "regular": 340,
        "loyalty10": 323,
        "loyalty20": 306,
        "loyalty50": 289
      },
      "pro": {
        "regular": 400,
        "loyalty10": 380,
        "loyalty20": 360,
        "loyalty50": 340
      },
      "cf": {
        "regular": 460,
        "loyalty10": 437,
        "loyalty20": 414,
        "loyalty50": 391
      }
    },
    "viniles": {
      "impreso": {
        "elite": {
          "below05": 136,
          "regular": 102,
          "above8": 85,
          "minimum": 68
        },
        "pro": {
          "below05": 160,
          "regular": 120,
          "above8": 100,
          "minimum": 80
        },
        "cf": {
          "below05": 184,
          "regular": 138,
          "above8": 115,
          "minimum": 92
        }
      },
      "suajado": {
        "elite": {
          "below05": 221,
          "regular": 187,
          "above8": 170,
          "minimum": 110.5
        },
        "pro": {
          "below05": 260,
          "regular": 220,
          "above8": 200,
          "minimum": 130
        },
        "cf": {
          "below05": 299,
          "regular": 253,
          "above8": 230,
          "minimum": 149.5
        }
      },
      "microperforado": {
        "elite": {
          "below05": 161.5,
          "regular": 127.5,
          "above8": 127.5,
          "minimum": 80.75
        },
        "pro": {
          "below05": 190,
          "regular": 150,
          "above8": 150,
          "minimum": 95
        },
        "cf": {
          "below05": 218.5,
          "regular": 172.5,
          "above8": 172.5,
          "minimum": 109.25
        }
      },
      "holografico": {
        "elite": {
          "below05": 246.5,
          "regular": 212.5,
          "above8": 212.5,
          "minimum": 123.25
        },
        "pro": {
          "below05": 290,
          "regular": 250,
          "above8": 250,
          "minimum": 145
        },
        "cf": {
          "below05": 333.5,
          "regular": 287.5,
          "above8": 287.5,
          "minimum": 166.75
        }
      },
      "lona": {
        "elite": {
          "below05": null,
          "regular": 76.5,
          "above8": 63.75,
          "minimum": null
        },
        "pro": {
          "below05": null,
          "regular": 90,
          "above8": 75,
          "minimum": null
        },
        "cf": {
          "below05": null,
          "regular": 103.5,
          "above8": 86.25,
          "minimum": null
        }
      }
    },
    "papel": {
      "elite": {
        "range1": {
          "price": 25.5,
          "minimum": 127.5
        },
        "range2": {
          "price": 34,
          "minimum": 170
        },
        "range3": {
          "price": 42.5,
          "minimum": 212.5
        }
      },
      "pro": {
        "range1": {
          "price": 30,
          "minimum": 150
        },
        "range2": {
          "price": 40,
          "minimum": 200
        },
        "range3": {
          "price": 50,
          "minimum": 250
        }
      },
      "cf": {
        "range1": {
          "price": 34.5,
          "minimum": 172.5
        },
        "range2": {
          "price": 46,
          "minimum": 230
        },
        "range3": {
          "price": 57.5,
          "minimum": 287.5
        }
      }
    }
  }'::jsonb,
  true
);

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para obtener la configuración activa de un usuario
CREATE OR REPLACE FUNCTION get_active_pricing_config(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  config JSONB;
BEGIN
  -- Primero intenta obtener la configuración específica del usuario
  IF p_user_id IS NOT NULL THEN
    SELECT price_config INTO config
    FROM public.pricing_settings
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    IF config IS NOT NULL THEN
      RETURN config;
    END IF;
  END IF;
  
  -- Si no hay configuración personal o no se especificó usuario,
  -- devuelve la configuración global
  SELECT price_config INTO config
  FROM public.pricing_settings
  WHERE user_id IS NULL AND is_active = true
  LIMIT 1;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE public.pricing_settings IS 'Configuraciones de precios personalizados para cotizador y catálogo';
COMMENT ON COLUMN public.pricing_settings.user_id IS 'NULL = configuración global; UUID = configuración personal del usuario';
COMMENT ON COLUMN public.pricing_settings.price_config IS 'Estructura JSON con todos los precios por tipo de cliente y producto';
COMMENT ON COLUMN public.pricing_settings.is_active IS 'Solo puede haber una configuración activa por usuario';
COMMENT ON FUNCTION get_active_pricing_config IS 'Retorna configuración activa: primero personal, luego global';
