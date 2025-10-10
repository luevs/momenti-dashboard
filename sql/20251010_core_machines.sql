-- Core machines master table (aligns with your existing schema)
-- Run this in Supabase SQL editor

-- We won't create this table as it exists already in your DB with fields:
-- id, name, type, status, created_at
-- Optionally add an ETA helper column if you want:
-- alter table public.machines add column if not exists default_speed_mph numeric;

