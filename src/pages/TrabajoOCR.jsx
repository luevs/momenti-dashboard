import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JobUploader from '../components/JobUploader';
import { Printer, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { MACHINES } from '../constants/machines';
import { supabase } from '../supabaseClient';

const TrabajoOCR = () => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [processedJob, setProcessedJob] = useState(null);
  const [parsedJobs, setParsedJobs] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [notification, setNotification] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [targetMachine, setTargetMachine] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  // Tiraje (run) fields
  const [runDate, setRunDate] = useState(() => new Date().toISOString().slice(0,10));
  const [runSequence, setRunSequence] = useState('');
  const [runName, setRunName] = useState('');
  const totalMeters = useMemo(() => (parsedJobs || []).reduce((s, j) => s + (Number(j.quantity_m) || 0), 0), [parsedJobs]);
  const [plannedMeters, setPlannedMeters] = useState(0);

  const handleJobProcessed = (jobData) => {
    setProcessedJob(jobData);
    const jobs = Array.isArray(jobData?.jobs) ? jobData.jobs : [];
    setParsedJobs(jobs);
    setSelectedIndex(jobs.length ? 0 : null);
    showNotification('Imagen procesada correctamente', 'success');
    // reset planned meters to sum of parsed
    const sum = jobs.reduce((s, j) => s + (Number(j.quantity_m) || 0), 0);
    setPlannedMeters(sum);
  };

  // Deprecated manual save flow (mantener placeholder por ahora)
  const handleJobSaved = async (_jobData) => {};

  const handleReprocess = async (jobData) => {
    try {
      const response = await fetch(`${API_BASE}/api/reprocess/${jobData.job_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filepath: jobData.filepath
        }),
      });

      if (!response.ok) {
        throw new Error('Error reprocesando trabajo');
      }

      const result = await response.json();
      setProcessedJob(result);
      
      showNotification('Trabajo reprocesado', 'success');
      
    } catch (error) {
      console.error('Error reprocessing job:', error);
      showNotification('Error reprocesando el trabajo', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Prefill from query params (machineId, runDate)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const m = params.get('machineId');
      const d = params.get('runDate');
      if (m && !targetMachine) setTargetMachine(String(m));
      if (d) setRunDate(d);
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Fetch next sequence when selecting machine or changing date
  useEffect(() => {
    const fetchNextSequence = async () => {
      try {
        if (!targetMachine || !runDate) { setRunSequence(''); return; }
        const { data, error } = await supabase
          .from('machine_runs')
          .select('sequence')
          .eq('machine_id', Number(targetMachine))
          .eq('run_date', runDate)
          .order('sequence', { ascending: false })
          .limit(1);
        if (error) throw error;
        const next = (data && data.length ? Number(data[0].sequence) : 0) + 1;
        setRunSequence(String(next));
      } catch (e) {
        console.error('fetchNextSequence', e);
        setRunSequence('1');
      }
    };
    fetchNextSequence();
  }, [targetMachine, runDate]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <FileImage className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Procesador de Trabajos OCR
              </h1>
              <p className="text-gray-600">
                Sube capturas de trabajos de impresión para procesarlos automáticamente
              </p>
            </div>
          </div>
        </div>

        {/* Notificación */}
        {notification && (
          <div className={`
            mb-6 p-4 rounded-md flex items-center space-x-3
            ${notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
            }
          `}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className={`
              ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}
            `}>
              {notification.message}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal - Upload y resultados */}
          <div className="lg:col-span-2 space-y-8">
            {/* Uploader */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. Subir Captura del Trabajo
              </h2>
              <JobUploader onJobProcessed={handleJobProcessed} />
            </div>

            {/* Jobs detectados a partir del OCR */}
            {parsedJobs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Jobs detectados ({parsedJobs.length})</h2>
                <div className="space-y-2">
                  {parsedJobs.map((j, idx) => (
                    <div key={idx} className={`p-3 border rounded flex items-center justify-between ${selectedIndex === idx ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                      <div>
                        <div className="text-sm font-medium">{j.client_name} — {j.quantity_m} m — {j.job_type}</div>
                        <div className="text-xs text-gray-600">{j.job_code} · {j.job_date || 's/f'}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className={`text-sm px-2 py-1 rounded ${selectedIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`} onClick={() => setSelectedIndex(idx)}>
                          Seleccionar
                        </button>
                        <button className="text-sm px-2 py-1 rounded bg-gray-100" onClick={() => navigator.clipboard.writeText(`Cliente: ${j.client_name} | Tipo: ${j.job_type} | Cantidad: ${j.quantity_m} m | Código: ${j.job_code} | Fecha: ${j.job_date || ''}`)}>
                          Copiar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Enviar a máquina (solo resumen + envío a cola) */}
            {parsedJobs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Enviar a máquina y tiraje</h2>
                <p className="text-sm text-gray-700 mb-4">Se detectaron <strong>{parsedJobs.length}</strong> jobs en la imagen. Define el tiraje (día y número) para trazar la impresión.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center mb-3">
                  <select
                    className="border rounded px-3 py-2"
                    value={targetMachine}
                    onChange={e => setTargetMachine(e.target.value)}
                  >
                    <option value="">Selecciona máquina…</option>
                    {MACHINES.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">Fecha</label>
                    <input type="date" className="border rounded px-3 py-2 flex-1" value={runDate} onChange={e => setRunDate(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24"># Tiraje</label>
                    <input type="number" min={1} className="border rounded px-3 py-2 flex-1" value={runSequence} onChange={e => setRunSequence(e.target.value)} placeholder="auto" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">Nombre</label>
                    <input type="text" className="border rounded px-3 py-2 flex-1" value={runName} onChange={e => setRunName(e.target.value)} placeholder="Turno A / Mañana (opcional)" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-24">Metros plan.</label>
                    <input type="number" step="0.01" className="border rounded px-3 py-2 flex-1" value={plannedMeters} onChange={e => setPlannedMeters(Number(e.target.value) || 0)} />
                    <span className="text-xs text-gray-500">(suma OCR: {totalMeters})</span>
                  </div>
                </div>
                  <button
                    disabled={assigning || !targetMachine || parsedJobs.length === 0}
                    onClick={async () => {
                      if (!targetMachine || parsedJobs.length === 0) return;
                      try {
                        setAssigning(true);
                        // 1) Upsert tiraje
                        const seq = Math.max(1, parseInt(runSequence || '1', 10));
                        const runPayload = [{
                          machine_id: Number(targetMachine),
                          run_date: runDate,
                          sequence: seq,
                          name: runName || null,
                          planned_meters: Number.isFinite(plannedMeters) ? plannedMeters : totalMeters,
                          status: 'planned',
                        }];
                        const { data: runData, error: runErr } = await supabase
                          .from('machine_runs')
                          .upsert(runPayload, { onConflict: 'machine_id,run_date,sequence' })
                          .select()
                          .limit(1);
                        if (runErr) throw runErr;
                        const runId = (runData && runData[0] && runData[0].id) || null;

                        // 2) Insert jobs con run_id
                        const payloads = parsedJobs.map(j => ({
                          machine_id: Number(targetMachine),
                          client_name: j.client_name,
                          job_code: j.job_code,
                          job_type: j.job_type,
                          job_date: j.job_date || null,
                          quantity_m: j.quantity_m,
                          unit: 'm',
                          status: 'pending',
                          run_id: runId,
                        }));
                        const { error } = await supabase.from('machine_job_queue').insert(payloads);
                        if (error) throw error;
                        const mName = MACHINES.find(m => String(m.id)===String(targetMachine))?.name || 'máquina';
                        showNotification(`Tiraje #${seq} listo. Se enviaron ${payloads.length} jobs a ${mName}`, 'success');
                        // Navegar a Operación tras guardar todo
                        navigate('/operacion');
                      } catch (e) {
                        console.error(e);
                        showNotification('Error enviando a cola de trabajo', 'error');
                      } finally {
                        setAssigning(false);
                      }
                    }}
                    className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                  >
                    {assigning ? 'Enviando…' : `Mandar ${parsedJobs.length} a cola`}
                  </button>
                </div>
            )}
          </div>

          {/* Sidebar - Cola de trabajos */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center space-x-2 mb-4">
                <Printer className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Cola de Trabajos
                </h3>
              </div>

              {savedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Printer className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">
                    No hay trabajos en la cola
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Los trabajos procesados aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedJobs.map((job, index) => (
                    <div
                      key={job.job_id}
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {job.client_name || 'Cliente no especificado'}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {job.job_description || 'Sin descripción'}
                          </p>
                          {job.quantity > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Cantidad: {job.quantity}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 ml-2">
                          #{index + 1}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {job.status || 'Pendiente'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {job.job_id.split('-').pop()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Estadísticas rápidas */}
              {savedJobs.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {savedJobs.length}
                      </div>
                      <div className="text-xs text-gray-500">
                        En cola
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {savedJobs.reduce((sum, job) => sum + (job.quantity || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total piezas
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ayuda */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            ¿Cómo usar esta herramienta?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Subir captura</h4>
                <p className="text-blue-700 mt-1">
                  Arrastra o selecciona la imagen de tu trabajo de impresión
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Revisar información</h4>
                <p className="text-blue-700 mt-1">
                  El OCR extraerá automáticamente los datos del trabajo
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Guardar en cola</h4>
                <p className="text-blue-700 mt-1">
                  Corrige si es necesario y guarda en la cola de impresión
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrabajoOCR;