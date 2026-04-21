-- Eliminar constraint único para permitir múltiples registros por día
-- Ejecuta esto en el SQL Editor de Supabase

ALTER TABLE public.machine_daily_prints 
  DROP CONSTRAINT IF EXISTS machine_daily_prints_unique_day;

ALTER TABLE public.machine_daily_prints 
  DROP CONSTRAINT IF EXISTS unique_machine_date;

-- Verificar que se eliminó correctamente
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.machine_daily_prints'::regclass 
  AND contype = 'u';
