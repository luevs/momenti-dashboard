-- Job queue table for assigning OCR-detected jobs to machines
-- Run this in Supabase SQL editor

-- NOTE: machine_job_queue already exists in your DB; we only add helpful columns if missing
alter table public.machine_job_queue add column if not exists priority int default 100;
alter table public.machine_job_queue add column if not exists run_id uuid null; -- tiraje/run link
alter table public.machine_job_queue add column if not exists notes text;

-- Optional: basic index to query by machine and status
create index if not exists idx_machine_job_queue_machine_status on public.machine_job_queue (machine_id, status);
create index if not exists idx_machine_job_queue_run on public.machine_job_queue (run_id);

-- RLS (optional, adjust to your auth model). For now, disable RLS for simplicity in dev.
-- Keep your existing RLS configuration as-is (no changes enforced here)

-- Tirajes (runs) per machine (day can have many runs per machine)
create table if not exists public.machine_runs (
  id uuid primary key default gen_random_uuid(),
  machine_id int not null,
  run_date date not null default (now() at time zone 'utc')::date,
  sequence int not null, -- 1..N within the day for the machine
  name text, -- optional label e.g., 'Turno A - Mañana'
  planned_meters numeric,
  status text not null default 'planned', -- planned | active | paused | completed | canceled
  created_at timestamptz not null default now(),
  unique (machine_id, run_date, sequence)
);

create index if not exists idx_machine_runs_machine_date on public.machine_runs (machine_id, run_date desc);
-- no RLS changes

-- Job events for lifecycle tracking
create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  event_type text not null, -- enqueued | started | paused | resumed | completed | canceled | moved
  from_machine_id int,
  to_machine_id int,
  details jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_job_events_job_time on public.job_events (job_id, occurred_at desc);
-- no RLS changes

-- Machine state timeline (utilization & downtime)
create table if not exists public.machine_states (
  id uuid primary key default gen_random_uuid(),
  machine_id int not null,
  state text not null, -- idle | running | setup | maintenance | breakdown
  reason text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_machine_states_machine_time on public.machine_states (machine_id, started_at desc);
-- no RLS changes

-- Views for operator dashboard
create or replace view public.v_machine_queue_summary as
select
  m.id as machine_id,
  m.name as machine_name,
  count(q.*) filter (where q.status in ('pending','in_progress')) as total_open_jobs,
  sum(q.quantity_m) filter (where q.status in ('pending','in_progress')) as total_open_meters,
  count(q.*) filter (where q.status = 'in_progress') as running_jobs,
  sum(q.quantity_m) filter (where q.status = 'in_progress') as running_meters,
  min(q.created_at) filter (where q.status = 'pending') as oldest_pending_at
from public.machines m
left join public.machine_job_queue q on q.machine_id = m.id and q.status in ('pending','in_progress')
group by m.id, m.name
order by m.id;

create or replace view public.v_machine_run_summary as
select
  r.id as run_id,
  r.machine_id,
  r.run_date,
  r.sequence,
  r.status,
  r.planned_meters,
  sum(q.quantity_m) as queued_meters,
  count(q.*) as queued_jobs
from public.machine_runs r
left join public.machine_job_queue q on q.run_id = r.id
group by r.id, r.machine_id, r.run_date, r.sequence, r.status, r.planned_meters
order by r.run_date desc, r.machine_id, r.sequence;
