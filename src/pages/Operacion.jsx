import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, Play, Square, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Operacion() {
  const navigate = useNavigate();
  const [board, setBoard] = useState([]); // rows from v_operator_machine_board
  const [queues, setQueues] = useState({}); // { [machineId]: Job[] }
  const [metersToday, setMetersToday] = useState({}); // { [machineId]: number }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBoard = async () => {
    const { data, error } = await supabase
      .from('v_operator_machine_board')
      .select('*')
      .order('machine_id', { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const fetchQueues = async (machineIds) => {
    if (!machineIds.length) return {};
    const { data, error } = await supabase
      .from('machine_job_queue')
      .select('*')
      .in('machine_id', machineIds)
      .in('status', ['pending', 'in_progress'])
      .order('status', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    const map = {};
    (data || []).forEach(j => {
      if (!map[j.machine_id]) map[j.machine_id] = [];
      map[j.machine_id].push(j);
    });
    return map;
  };

  const getLocalISODate = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  };

  const load = async () => {
    try {
      setLoading(true); setError('');
      const b = await fetchBoard();
      setBoard(b);
      const ids = b.map(r => r.machine_id);
      const q = await fetchQueues(ids);
      setQueues(q);
      const m = await fetchMetersToday(ids);
      setMetersToday(m);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error cargando tablero');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateJobStatus = async (jobId, status) => {
    // Removed the updateJobStatus function as per the patch requirement
  };

  // Helpers for tiraje (run) management
  const today = getLocalISODate();

  const getNextSequence = async (machineId, runDate = today) => {
    const { data, error } = await supabase
      .from('machine_runs')
      .select('sequence')
      .eq('machine_id', machineId)
      .eq('run_date', runDate)
      .order('sequence', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data && data.length ? Number(data[0].sequence) : 0) + 1;
  };

  const createRun = async (machineId, { runDate = today, sequence, name = null, plannedMeters = 0, status = 'planned' } = {}) => {
    const seq = sequence || await getNextSequence(machineId, runDate);
    const payload = [{ machine_id: machineId, run_date: runDate, sequence: seq, name, planned_meters: plannedMeters, status }];
    const { data, error } = await supabase
      .from('machine_runs')
      .upsert(payload, { onConflict: 'machine_id,run_date,sequence' })
      .select()
      .limit(1);
    if (error) throw error;
    return data && data[0];
  };

  const startRun = async (row) => {
    try {
      let activeRunId = row.run_id;
      if (activeRunId) {
        const { error } = await supabase.from('machine_runs').update({ status: 'active' }).eq('id', activeRunId);
        if (error) throw error;
        // asignar run_id a pendientes sin tiraje
        const { error: assignErr } = await supabase
          .from('machine_job_queue')
          .update({ run_id: activeRunId })
          .eq('machine_id', row.machine_id)
          .is('run_id', null)
          .eq('status', 'pending');
        if (assignErr) throw assignErr;
        // mover todos los pendientes del tiraje a in_progress
        const { error: updErr } = await supabase
          .from('machine_job_queue')
          .update({ status: 'in_progress' })
          .eq('machine_id', row.machine_id)
          .eq('status', 'pending')
          .eq('run_id', activeRunId);
        if (updErr) throw updErr;
      } else {
        // crear tiraje activo y mover todos los pendientes de la máquina a in_progress en ese tiraje
        const newRun = await createRun(row.machine_id, { status: 'active' });
        if (!newRun) throw new Error('No se pudo crear el tiraje');
        activeRunId = newRun.id;
        const { error: updErr } = await supabase
          .from('machine_job_queue')
          .update({ status: 'in_progress', run_id: activeRunId })
          .eq('machine_id', row.machine_id)
          .eq('status', 'pending');
        if (updErr) throw updErr;
      }
      await load();
    } catch (e) {
      alert(e.message || 'Error iniciando tiraje');
    }
  };

  const completeRun = async (row) => {
    try {
      if (!row.run_id) return;
      // 1) Completar tiraje actual
      const { error } = await supabase.from('machine_runs').update({ status: 'completed' }).eq('id', row.run_id);
      if (error) throw error;
      // 2) Marcar todos los jobs abiertos de la máquina como 'done' (pendientes o en proceso),
      // independientemente del run_id, para vaciar por completo la tarjeta
      const { error: updErr } = await supabase
        .from('machine_job_queue')
        .update({ status: 'done' })
        .eq('machine_id', row.machine_id)
        .in('status', ['pending', 'in_progress']);
      if (updErr) throw updErr;
      await load();
    } catch (e) {
      alert(e.message || 'Error completando tiraje');
    }
  };

  const createNextRun = (row) => {
    const params = new URLSearchParams({ machineId: String(row.machine_id), runDate: row.run_date || today });
    navigate(`/trabajo-ocr?${params.toString()}`);
  };

  const fetchMetersToday = async (machineIds) => {
    if (!machineIds.length) return {};
    const dateStr = today; // local ISO date
    const { data, error } = await supabase
      .from('machine_daily_prints')
      .select('machine_id, date, meters_printed')
      .in('machine_id', machineIds)
      .eq('date', dateStr);
    if (error) throw error;
    const map = {};
    (data || []).forEach(r => { map[r.machine_id] = Number(r.meters_printed) || 0; });
    return map;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Operación</h1>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200">
          <RefreshCw size={16} /> Refrescar
        </button>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading && <div className="mb-4">Cargando...</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {board.map((m) => {
          const list = queues[m.machine_id] || [];
          const running = list.filter(j => j.status === 'in_progress');
          const pendings = list.filter(j => j.status === 'pending');
          return (
            <div key={m.machine_id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">{m.machine_name || `Máquina ${m.machine_id}`}</div>
                  <div className="text-sm text-slate-500">Tiraje: {m.run_date || '-'} #{m.sequence || '-' } ({m.run_status || '—'})</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Abiertos: <b>{m.total_open_jobs || 0}</b></div>
                  <div className="text-sm">Metros: <b>{m.total_open_meters || 0}</b></div>
                  <div className="text-sm">Impresos hoy: <b>{metersToday[m.machine_id] || 0}</b></div>
                  <div className="mt-2 flex items-center gap-2 justify-end">
                    {m.run_status === 'active' ? (
                      <button onClick={() => completeRun(m)} title="Terminar tiraje" className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1">
                        <Square size={14} /> Stop
                      </button>
                    ) : (
                      <button onClick={() => startRun(m)} title="Iniciar tiraje" className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
                        <Play size={14} /> Play
                      </button>
                    )}
                    <button onClick={() => createNextRun(m)} title="Crear siguiente tiraje (hoy)" className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1">
                      <Plus size={14} /> Nuevo
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-sm font-medium mb-1">En impresión</div>
                {running.length ? (
                  <div className="space-y-2">
                    {running.map(r => (
                      <div key={r.id} className="p-3 rounded border bg-green-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{r.client_name}</div>
                            <div className="text-xs text-slate-600">{r.job_code} • {r.quantity_m} {r.unit || 'm'}</div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">En proceso</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded border bg-slate-50 text-slate-500">Sin job en proceso</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Siguientes</div>
                {pendings.length ? (
                  <div className="space-y-2">
                    {pendings.map(p => (
                      <div key={p.id} className="p-3 rounded border bg-white">
                        <div className="text-sm font-semibold">{p.client_name}</div>
                        <div className="text-xs text-slate-600">{p.job_code} • {p.quantity_m} {p.unit || 'm'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded border bg-slate-50 text-slate-500">No hay pendientes</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
