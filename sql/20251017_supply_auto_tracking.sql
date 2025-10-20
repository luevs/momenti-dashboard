-- Auto-consumption tracking support for machine supplies
-- Run this script in Supabase SQL editor (idempotent)

-- 1. Machine supplies: add ratio and automation flags
alter table if exists public.machine_supplies
  add column if not exists consumption_ratio numeric(12,4) default 1.0000;

alter table if exists public.machine_supplies
  add column if not exists auto_track boolean default false;

alter table if exists public.machine_supplies
  add column if not exists meters_accounted numeric(14,4) default 0;

-- 2. Supply movements: link consumption to production logs
alter table if exists public.supply_movements
  add column if not exists production_record_id uuid;

create index if not exists idx_supply_movements_production
  on public.supply_movements (production_record_id);

-- Optional: enforce movement type domain (commented until all data cleaned)
-- alter table if exists public.supply_movements
--   add constraint supply_movements_type_check
--     check (movement_type in ('restock','consumption','adjustment','roll_change'));
