-- Operator dashboard views

-- Current planned/active run for TODAY per machine with queue stats
create or replace view public.v_operator_machine_board as
with today as (
  select public.app_local_date() as d
), curr_run as (
  select distinct on (mr.machine_id)
    mr.machine_id, mr.id as run_id, mr.run_date, mr.sequence, mr.status, mr.planned_meters, mr.created_at
  from public.machine_runs mr, today t
  where mr.run_date = t.d and mr.status in ('planned','active')
  order by mr.machine_id, mr.status desc, mr.sequence asc
)
select
  m.id as machine_id,
  m.name as machine_name,
  coalesce(cr.run_id, null) as run_id,
  cr.run_date,
  cr.sequence,
  cr.status as run_status,
  cr.planned_meters,
  qs.total_open_jobs,
  qs.total_open_meters,
  qs.running_jobs,
  qs.running_meters,
  qs.oldest_pending_at
from public.machines m
left join curr_run cr on cr.machine_id = m.id
left join public.v_machine_queue_summary qs on qs.machine_id = m.id
order by m.id;

-- Queue breakdown per status for a machine
create or replace view public.v_queue_breakdown as
select
  machine_id,
  status,
  count(*) as jobs,
  sum(quantity_m) as meters
from public.machine_job_queue
group by machine_id, status
order by machine_id, status;

-- Materialized KPI (optional): today summary
create materialized view if not exists public.mv_today_operator_kpi as
select
  public.app_local_date() as kpi_date,
  q.machine_id,
  count(*) filter (where q.status in ('pending','in_progress')) as open_jobs,
  sum(q.quantity_m) filter (where q.status in ('pending','in_progress')) as open_meters,
  count(*) filter (where q.status = 'done' and q.created_at::date = public.app_local_date()) as completed_jobs_today,
  sum(q.quantity_m) filter (where q.status = 'done' and q.created_at::date = public.app_local_date()) as completed_meters_today
from public.machine_job_queue q
group by q.machine_id;

-- Refresh helper
create or replace function public.refresh_mv_today_operator_kpi()
returns void language sql as $$
  refresh materialized view public.mv_today_operator_kpi;
$$;
