-- Daily meters per machine (already referenced by frontend)
-- Table exists in your DB with columns:
-- id, machine_id, date, meters_printed, registered_by, created_at, type
-- We add useful constraints/indexes only if missing
do $$ begin
  perform 1 from pg_constraint where conname = 'machine_daily_prints_unique_day';
  if not found then
    alter table public.machine_daily_prints
      add constraint machine_daily_prints_unique_day unique (machine_id, date);
  end if;
end $$;

create index if not exists idx_machine_daily_prints_machine_date on public.machine_daily_prints (machine_id, date desc);

