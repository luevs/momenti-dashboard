-- Helper: local date for your operation timezone (adjust if needed)
create or replace function public.app_local_date()
returns date
language sql
as $$
  select (now() at time zone 'America/Mexico_City')::date;
$$;

-- Function: ensure a run exists for a machine today; returns run id
create or replace function public.ensure_today_run(p_machine_id int)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_seq int;
  v_today date := public.app_local_date();
begin
  select id into v_run_id from public.machine_runs
  where machine_id = p_machine_id and run_date = v_today and status in ('planned','active')
  order by sequence asc limit 1;

  if v_run_id is null then
    select coalesce(max(sequence),0) + 1 into v_seq from public.machine_runs where machine_id = p_machine_id and run_date = v_today;
    insert into public.machine_runs(machine_id, run_date, sequence, status)
    values (p_machine_id, v_today, v_seq, 'planned')
    returning id into v_run_id;
  end if;

  return v_run_id;
end;
$$;

-- Trigger: when inserting into queue without a run_id, attach to today's run
create or replace function public.trg_machine_job_queue_assign_run()
returns trigger
language plpgsql
as $$
begin
  if new.run_id is null then
    new.run_id := public.ensure_today_run(new.machine_id);
  end if;
  return new;
end;
$$;

drop trigger if exists before_ins_assign_run on public.machine_job_queue;
create trigger before_ins_assign_run
before insert on public.machine_job_queue
for each row execute function public.trg_machine_job_queue_assign_run();

-- Trigger: log job events on status change
create or replace function public.trg_job_status_event()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_events(job_id, event_type, to_machine_id, details)
    values (new.id, 'enqueued', new.machine_id, jsonb_build_object('priority', new.priority));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.job_events(job_id, event_type, from_machine_id, to_machine_id, details)
    values (
      new.id,
      case new.status
        when 'in_progress' then 'started'
        when 'done' then 'completed'
        when 'canceled' then 'canceled'
        else 'updated'
      end,
      old.machine_id,
      new.machine_id,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists after_insupd_job_events on public.machine_job_queue;
create trigger after_insupd_job_events
after insert or update on public.machine_job_queue
for each row execute function public.trg_job_status_event();

-- Optional: close machine state segment when switching to running/done
create or replace function public.trg_machine_state_autoclose()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'in_progress' then
    -- set machine running
    insert into public.machine_states(machine_id, state, reason)
    values (new.machine_id, 'running', 'job_started');
  elsif new.status in ('done','canceled') then
    -- mark machine idle (simple heuristic)
    insert into public.machine_states(machine_id, state, reason)
    values (new.machine_id, 'idle', 'job_finished');
  end if;
  return new;
end;
$$;

drop trigger if exists after_insupd_machine_state on public.machine_job_queue;
create trigger after_insupd_machine_state
after insert or update on public.machine_job_queue
for each row execute function public.trg_machine_state_autoclose();

-- Auto-upsert daily meters when job is marked done
create or replace function public.trg_job_done_update_daily_meters()
returns trigger
language plpgsql
as $$
declare
  v_date date := public.app_local_date();
begin
  if tg_op = 'UPDATE' and new.status = 'done' and (old.status is distinct from 'done') then
    insert into public.machine_daily_prints(machine_id, date, meters_printed, registered_by, created_at, type)
    values (new.machine_id, v_date, coalesce(new.quantity_m,0), 'system', now(), 'auto')
    on conflict (machine_id, date) do update
      set meters_printed = public.machine_daily_prints.meters_printed + coalesce(excluded.meters_printed,0),
          registered_by = 'system';
  end if;
  return new;
end;
$$;

drop trigger if exists after_upd_job_done_daily_meters on public.machine_job_queue;
create trigger after_upd_job_done_daily_meters
after update on public.machine_job_queue
for each row execute function public.trg_job_done_update_daily_meters();
