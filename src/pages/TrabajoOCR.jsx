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
  const decimalPattern = /^\d*(?:\.\d{0,2})?$/;
  const sanitizeDecimalInput = (value) => (value ?? '').toString().replace(/[^0-9.,]/g, '').replace(/,/g, '.');
  const normalizeDecimalDisplay = (value) => {
    let sanitized = sanitizeDecimalInput(value);
    if (sanitized.startsWith('.')) sanitized = `0${sanitized}`;
    return sanitized;
  };
  const ensureTwoDecimalsNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
  };
  const ensureTwoDecimalsString = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
  };
  // Valida fechas ISO para evitar enviar valores que rompan Supabase
  const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isValidIsoDate = (value) => {
    if (typeof value !== 'string') return false;
    const match = isoDatePattern.exec(value.trim());
    if (!match) return false;
    const [, yearStr, monthStr, dayStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const parsed = new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime())
      && parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() + 1 === month
      && parsed.getUTCDate() === day;
  };
  const sanitizeJobDate = (value) => (isValidIsoDate(value) ? value : '');
  const sanitizeJobDateOrNull = (value) => (isValidIsoDate(value) ? value : null);
  const totalMeters = useMemo(() => {
    const sum = (parsedJobs || []).reduce((s, j) => s + (Number(j.quantity_m) || 0), 0);
    return Number(sum.toFixed(2));
  }, [parsedJobs]);
  const [plannedMeters, setPlannedMeters] = useState(0);
  const [plannedMetersTouched, setPlannedMetersTouched] = useState(false);
  const [plannedMetersInput, setPlannedMetersInput] = useState('0.00');

  const handleQuantityChange = (index, rawValue) => {
    const display = normalizeDecimalDisplay(rawValue);
    if (!decimalPattern.test(display)) return;

    setParsedJobs(prev => {
      const next = [...prev];
      const job = next[index];
      if (!job) return prev;
      const numeric = display === '' || display === '0.' ? 0 : Number(display);
      next[index] = {
        ...job,
        quantityInput: display,
        quantity_m: Number.isFinite(numeric) ? numeric : 0,
      };
      return next;
    });
  };

  const handleQuantityBlur = (index) => {
    setParsedJobs(prev => {
      const next = [...prev];
      const job = next[index];
      if (!job) return prev;
      const display = normalizeDecimalDisplay(job.quantityInput ?? job.quantity_m);
      const numeric = display === '' || display === '0.' ? 0 : Number(display);
      const fixed = Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
      next[index] = {
        ...job,
        quantity_m: fixed,
        quantityInput: fixed.toFixed(2),
      };
      return next;
    });
  };

  const handleJobFieldChange = (index, field, rawValue) => {
    setParsedJobs(prev => {
      const next = [...prev];
      const job = next[index];
      if (!job) return prev;
      let value = rawValue;
      if (field === 'job_code') {
        value = (rawValue ?? '').toString().toUpperCase();
      }
      if (field === 'job_type') {
        value = (rawValue ?? '').toString();
      }
      if (field === 'job_date') {
        value = rawValue ? sanitizeJobDate(rawValue) : '';
      }
      next[index] = {
        ...job,
        [field]: value,
      };
      return next;
    });
  };

  const handleAddJob = () => {
    setParsedJobs(prev => [...prev, {
      client_name: '',
      job_type: 'DTF Textil',
      job_code: '',
      job_date: '',
      quantity_m: 0,
      quantityInput: '0.00',
      unit: 'm',
      raw_line: '',
      isManual: true,
    }]);
    setSelectedIndex(prev => {
      const newIndex = (parsedJobs?.length ?? 0);
      return newIndex;
    });
  };

  const handleRemoveJob = (index) => {
    setParsedJobs(prev => prev.filter((_, idx) => idx !== index));
    setSelectedIndex(prev => {
      if (prev == null) return prev;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleJobProcessed = (jobData) => {
    setProcessedJob(jobData);
    const jobs = (Array.isArray(jobData?.jobs) ? jobData.jobs : []).map(job => {
      const numeric = Number(job.quantity_m);
      const fixed = Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
      return {
        ...job,
        job_date: sanitizeJobDate(job.job_date),
        quantity_m: fixed,
        quantityInput: fixed.toFixed(2),
      };
    });
    setParsedJobs(jobs);
    setSelectedIndex(jobs.length ? 0 : null);
    showNotification('Imagen procesada correctamente', 'success');
    // reset planned meters to sum of parsed
    const sum = jobs.reduce((s, j) => s + (Number(j.quantity_m) || 0), 0);
    const fixedSum = Number(sum.toFixed(2));
    setPlannedMeters(fixedSum);
    setPlannedMetersInput(fixedSum.toFixed(2));
    setPlannedMetersTouched(false);
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

  useEffect(() => {
    if (plannedMetersTouched) return;
    const sum = (parsedJobs || []).reduce((s, j) => s + (Number(j.quantity_m) || 0), 0);
    const fixedSum = Number(sum.toFixed(2));
    setPlannedMeters(fixedSum);
    setPlannedMetersInput(fixedSum.toFixed(2));
  }, [parsedJobs, plannedMetersTouched]);

  const handlePlannedMetersChange = (rawValue) => {
  const display = normalizeDecimalDisplay(rawValue);
  if (!decimalPattern.test(display)) return;
  const numeric = display === '' || display === '0.' ? 0 : Number(display);
  setPlannedMeters(Number.isFinite(numeric) ? numeric : 0);
  setPlannedMetersInput(display);
    setPlannedMetersTouched(true);
  };

  const handlePlannedMetersBlur = () => {
    setPlannedMeters(current => {
      const fixed = ensureTwoDecimalsNumber(current);
      setPlannedMetersInput(fixed.toFixed(2));
      return fixed;
    });
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Carga de Tirajes</h1>
              <p className="text-gray-600">Sube una captura para generar los trabajos y encolarlos por tiraje</p>
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">2. Jobs detectados ({parsedJobs.length})</h2>
                  <button
                    type="button"
                    onClick={handleAddJob}
                    className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
                  >
                    Agregar job manual
                  </button>
                </div>
                <div className="space-y-3">
                  {parsedJobs.map((j, idx) => (
                    <div key={idx} className={`p-3 border rounded ${selectedIndex === idx ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <input
                              type="text"
                              value={j.client_name ?? ''}
                              onChange={e => handleJobFieldChange(idx, 'client_name', e.target.value)}
                              className="min-w-[160px] flex-1 border border-gray-300 rounded px-2 py-1"
                              placeholder="Cliente"
                            />
                            <span className="text-gray-400">—</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={j.quantityInput ?? ensureTwoDecimalsString(j.quantity_m)}
                                onChange={e => handleQuantityChange(idx, e.target.value)}
                                onBlur={() => handleQuantityBlur(idx)}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="0.00"
                              />
                              <span>m</span>
                            </div>
                            <span className="text-gray-400">—</span>
                            <input
                              type="text"
                              value={j.job_type ?? ''}
                              onChange={e => handleJobFieldChange(idx, 'job_type', e.target.value)}
                              className="min-w-[140px] border border-gray-300 rounded px-2 py-1"
                              placeholder="Tipo"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <label className="flex items-center gap-1">
                              <span className="text-gray-500">Código</span>
                              <input
                                type="text"
                                value={j.job_code ?? ''}
                                onChange={e => handleJobFieldChange(idx, 'job_code', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="T171025"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              <span className="text-gray-500">Fecha</span>
                              <input
                                type="date"
                                value={j.job_date || ''}
                                onChange={e => handleJobFieldChange(idx, 'job_date', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </label>
                            {j.isManual && (
                              <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Manual</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-stretch md:w-auto">
                          <div className="flex gap-2 justify-end">
                            <button
                              className={`text-sm px-2 py-1 rounded ${selectedIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                              onClick={() => setSelectedIndex(idx)}
                            >
                              Seleccionar
                            </button>
                            <button
                              className="text-sm px-2 py-1 rounded bg-gray-100"
                              onClick={() => navigator.clipboard.writeText(`Cliente: ${j.client_name || ''} | Tipo: ${j.job_type || ''} | Cantidad: ${ensureTwoDecimalsString(j.quantity_m)} m | Código: ${j.job_code || ''} | Fecha: ${j.job_date || ''}`)}
                            >
                              Copiar
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200"
                            onClick={() => handleRemoveJob(idx)}
                          >
                            Eliminar
                          </button>
                        </div>
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
                    <input
                      type="text"
                      inputMode="decimal"
                      className="border rounded px-3 py-2 flex-1"
                      value={plannedMetersInput}
                      onChange={e => handlePlannedMetersChange(e.target.value)}
                      onBlur={handlePlannedMetersBlur}
                    />
                    <span className="text-xs text-gray-500">(suma OCR: {totalMeters.toFixed(2)})</span>
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
                          planned_meters: Number.isFinite(plannedMeters) ? ensureTwoDecimalsNumber(plannedMeters) : ensureTwoDecimalsNumber(totalMeters),
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
                          job_date: sanitizeJobDateOrNull(j.job_date),
                          quantity_m: ensureTwoDecimalsNumber(j.quantity_m),
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
                        const message = e?.message || e?.error_description;
                        showNotification(message ? `Error enviando a cola de trabajo: ${message}` : 'Error enviando a cola de trabajo', 'error');
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