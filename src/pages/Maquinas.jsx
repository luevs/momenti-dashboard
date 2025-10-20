import { Printer, Plus, X, Eye, Play, Check, XCircle, RefreshCw } from "lucide-react";
import MaquinaCard from '../components/MaquinaCard';
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import useCurrentUser from '../utils/useCurrentUser';
import { autoConsumeAfterProduction } from "../utils/autoConsume";
import { useNavigate } from "react-router-dom";
import MaquinaDetalle from "./MaquinaDetalle"; 

const estadoColores = {
  activo: "bg-green-100 text-green-800",
  inactivo: "bg-gray-100 text-gray-500",
  cola: "bg-yellow-100 text-yellow-800",
};

// helper: fecha local YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Maquinas() {
  const [impresoras, setImpresoras] = useState([
    { id: 1, nombre: "DTF 1 (Left)", estado: "activo", cola: 2 },
    { id: 2, nombre: "DTF 2 (Right)", estado: "inactivo", cola: 0 },
    { id: 3, nombre: "UV DTF", estado: "cola", cola: 5 },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("activo");
  const [historial, setHistorial] = useState([]);
  const [registroModalOpen, setRegistroModalOpen] = useState(false);
  const [metrosHoy, setMetrosHoy] = useState("");
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState(null);
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [corteMetros, setCorteMetros] = useState({}); // { [machineId]: metros }
  const [corteFecha, setCorteFecha] = useState(new Date().toISOString().slice(0,10));
  const [registroFecha, setRegistroFecha] = useState(new Date().toISOString().slice(0, 10));
  const [latestRecords, setLatestRecords] = useState({}); // { [machineId]: { date, meters_printed, registered_by } }
  const [queues, setQueues] = useState({}); // { [machineId]: array of jobs }
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [queueMachine, setQueueMachine] = useState(null);
  const [queueItems, setQueueItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // fetch latest records for the current impresoras
  const fetchLatestRecords = async () => {
    try {
      const ids = impresoras.map(i => i.id);
      if (!ids.length) { setLatestRecords({}); return; }
      const { data, error } = await supabase
        .from('machine_daily_prints')
        .select('machine_id, date, meters_printed, registered_by')
        .in('machine_id', ids)
        .order('date', { ascending: false });
      if (error) {
        console.error('fetchLatestRecords error', error);
        return;
      }
      const map = {};
      (data || []).forEach(r => {
        if (!map[r.machine_id]) map[r.machine_id] = r; // keep first (latest) per machine
      });
      setLatestRecords(map);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLatestRecords();
  }, [impresoras]);

  // fetch queue per machine
  const fetchQueues = async () => {
    try {
      const ids = impresoras.map(i => i.id);
      if (!ids.length) { setQueues({}); return; }
      const { data, error } = await supabase
        .from('machine_job_queue')
        .select('*')
        .in('machine_id', ids)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('fetchQueues error', error);
        return;
      }
      const map = {};
      (data || []).forEach(j => {
        if (!map[j.machine_id]) map[j.machine_id] = [];
        map[j.machine_id].push(j);
      });
      setQueues(map);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [impresoras]);

  const openQueueModal = async (machine) => {
    setQueueMachine(machine);
    setQueueModalOpen(true);
    await loadQueueForMachine(machine.id);
  };

  const loadQueueForMachine = async (machineId) => {
    try {
      setQueueLoading(true);
      setQueueError('');
      // include pending and in_progress by default; optionally include done/canceled if showHistory
      let query = supabase
        .from('machine_job_queue')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: true });
      if (!showHistory) {
        query = query.in('status', ['pending', 'in_progress']);
      }
      const { data, error } = await query;
      if (error) throw error;
      setQueueItems(data || []);
    } catch (e) {
      console.error(e);
      setQueueError(e.message || 'Error cargando cola');
    } finally {
      setQueueLoading(false);
    }
  };

  const updateJobStatus = async (jobId, status) => {
    try {
      const { error } = await supabase
        .from('machine_job_queue')
        .update({ status })
        .eq('id', jobId);
      if (error) throw error;
      // refresh modal list and cards summary
      if (queueMachine) await loadQueueForMachine(queueMachine.id);
      await fetchQueues();
    } catch (e) {
      alert(e.message || 'Error actualizando estado');
    }
  };

  const agregarImpresora = () => {
    const nueva = {
      id: impresoras.length + 1,
      nombre: nuevaNombre,
      estado: nuevoEstado,
      cola: 0,
    };
    setImpresoras([...impresoras, nueva]);
    setNuevaNombre("");
    setNuevoEstado("activo");
    setModalOpen(false);
  };

  const cambiarEstado = (id, nuevoEstado) => {
    const actualizado = impresoras.map((impresora) =>
      impresora.id === id ? { ...impresora, estado: nuevoEstado } : impresora
    );
    setImpresoras(actualizado);

    const impresoraNombre = impresoras.find((i) => i.id === id)?.nombre;

    const nuevoEvento = {
      id: historial.length + 1,
      impresoraId: id,
      impresoraNombre,
      nuevoEstado,
      timestamp: new Date().toLocaleString(),
    };

    setHistorial([...historial, nuevoEvento]);
  };

  // Función para guardar en Supabase
  const registrarMetros = async () => {
    if (!metrosHoy || isNaN(Number(metrosHoy))) {
      alert("Ingresa una cantidad válida de metros.");
      return;
    }
    const payload = {
      machine_id: impresoraSeleccionada.id,
      date: registroFecha,
      meters_printed: Number(metrosHoy),
      registered_by: (currentUser && (currentUser.name || currentUser.username || currentUser.email)) || 'Sistema'
    };
    let previousMeters = 0;
    try {
      const { data: existing } = await supabase
        .from('machine_daily_prints')
        .select('id, meters_printed')
        .eq('machine_id', payload.machine_id)
        .eq('date', payload.date)
        .maybeSingle();
      if (existing) {
        previousMeters = Number(existing.meters_printed) || 0;
      }
    } catch (fetchError) {
      console.warn('No se pudo obtener registro previo', fetchError);
    }

    const { data: upserted, error } = await supabase
      .from('machine_daily_prints')
      .upsert([payload], { onConflict: ['machine_id', 'date'] })
      .select();
    if (error) {
      alert("Error al registrar: " + error.message);
      return;
    }

    const record = Array.isArray(upserted) ? upserted[0] : null;
    const deltaMeters = payload.meters_printed - previousMeters;

    if (record && deltaMeters !== 0) {
      try {
        await autoConsumeAfterProduction({
          machineId: record.machine_id,
          meters: deltaMeters,
          operator: record.registered_by,
          productionRecordId: record.id,
          productionDate: record.date,
        });
      } catch (consumeError) {
        console.error('Error descontando insumos', consumeError);
        alert('Registro guardado, pero no se pudo descontar el insumo automáticamente: ' + (consumeError.message || consumeError));
      }
    }

    // actualizar UI localmente
    setLatestRecords(prev => ({ ...prev, [impresoraSeleccionada.id]: { ...payload } }));
    alert("Registro guardado");
    setRegistroModalOpen(false);
    setMetrosHoy("");
    setImpresoraSeleccionada(null);
  };

  // Nuevo: Guardar corte diario para todas las máquinas
  const registrarCorteDiario = async () => {
    const registros = impresoras
      .filter((imp) => corteMetros[imp.id] && !isNaN(Number(corteMetros[imp.id])))
      .map((imp) => ({
        machine_id: imp.id,
        date: corteFecha,
        meters_printed: Number(corteMetros[imp.id]),
        registered_by: (currentUser && (currentUser.name || currentUser.username || currentUser.email)) || 'Sistema'
      }));
    if (registros.length === 0) {
      alert("Ingresa al menos un valor válido de metros.");
      return;
    }
    const { data: inserted, error } = await supabase
      .from('machine_daily_prints')
      .insert(registros)
      .select();
    if (error) {
      alert("Error al registrar: " + error.message);
    } else {
      if (Array.isArray(inserted)) {
        for (const record of inserted) {
          try {
            await autoConsumeAfterProduction({
              machineId: record.machine_id,
              meters: record.meters_printed,
              operator: record.registered_by,
              productionRecordId: record.id,
              productionDate: record.date,
            });
          } catch (consumeError) {
            console.error('Error descontando insumos', consumeError);
          }
        }
      }
      alert("Corte diario guardado");
      setCorteModalOpen(false);
      setCorteMetros({});
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Impresoras</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCorteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            Corte Diario
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Agregar impresora
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {impresoras.map((impresora) => {
          const last = latestRecords[impresora.id];
          const registeredToday = last && String(last.date).slice(0,10) === getLocalDateString();
          return (
            <div
              key={impresora.id}
              className="p-4 bg-white shadow rounded-xl border border-gray-200 transition cursor-pointer hover:shadow-md"
              onClick={() => navigate(`/maquinas/${impresora.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/maquinas/${impresora.id}`); }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Printer className="text-blue-600" size={32} />
                  <div>
                    <h2 className="font-semibold text-lg">{impresora.nombre}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {last
                        ? <>Último: <strong>{Number(last.meters_printed).toFixed(2)} m</strong> — {String(last.date).slice(0,10)}</>
                        : <>Sin registros</>
                      }
                    </p>
                  </div>
                </div>

                {/* indicador pequeño */}
                <div className="flex flex-col items-end">
                  <span className={`w-3 h-3 rounded-full ${registeredToday ? 'bg-green-500' : 'bg-red-400'}`} title={registeredToday ? 'Registrado hoy' : 'No registrado hoy'}></span>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                {Array.isArray(queues[impresora.id]) && queues[impresora.id].length > 0 ? (
                  <>
                    {(() => {
                      const totalMeters = queues[impresora.id].reduce((sum, q) => sum + (Number(q.quantity_m) || 0), 0);
                      return (
                        <div className="font-medium">En cola: {queues[impresora.id].length} · {totalMeters.toFixed(2)} m</div>
                      );
                    })()}
                    <ul className="list-disc ml-5 mt-1">
                      {queues[impresora.id].slice(0,3).map(q => (
                        <li key={q.id}>{q.client_name} — {q.quantity_m} m {q.job_code ? `· ${q.job_code}` : ''}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-gray-400">Sin trabajos en cola</div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); openQueueModal(impresora); }}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm"
                >
                  <div className="flex items-center justify-center gap-2"><Eye size={16}/> Ver cola</div>
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setImpresoraSeleccionada(impresora);
                    setRegistroModalOpen(true);
                    setMetrosHoy("");
                    setRegistroFecha(getLocalDateString());
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Registrar Metros
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CORTE DIARIO */}
      {corteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setCorteModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Corte Diario de Metros Impresos</h2>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Fecha</label>
              <input
                type="date"
                value={corteFecha}
                onChange={e => setCorteFecha(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div className="flex flex-col gap-3">
              {impresoras.map((imp) => (
                <div key={imp.id}>
                  <label className="block text-gray-700 font-semibold mb-1">{imp.nombre}</label>
                  <input
                    type="number"
                    placeholder="Metros impresos"
                    value={corteMetros[imp.id] || ""}
                    onChange={e => setCorteMetros({ ...corteMetros, [imp.id]: e.target.value })}
                    className="border rounded px-3 py-2 w-full"
                    min="0"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={registrarCorteDiario}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 w-full mt-4"
            >
              Guardar Corte Diario
            </button>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Agregar nueva impresora
            </h2>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nombre de la impresora"
                value={nuevaNombre}
                onChange={(e) => setNuevaNombre(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="activo">Activa</option>
                <option value="inactivo">Inactiva</option>
                <option value="cola">En cola</option>
              </select>
              <button
                onClick={agregarImpresora}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Agregar impresora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COLA COMPLETA */}
      {queueModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-lg relative">
            <button
              onClick={() => setQueueModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Cola de {queueMachine?.nombre || 'máquina'}</h2>
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={showHistory} onChange={async (e)=>{ setShowHistory(e.target.checked); if(queueMachine) await loadQueueForMachine(queueMachine.id); }} />
                  Mostrar historial
                </label>
                <button className="px-2 py-1 border rounded text-gray-700 hover:bg-gray-50" onClick={()=> queueMachine && loadQueueForMachine(queueMachine.id)}>
                  <div className="flex items-center gap-1"><RefreshCw size={14}/> Refrescar</div>
                </button>
              </div>
            </div>
            {queueLoading ? (
              <div className="text-center py-6 text-gray-500">Cargando…</div>
            ) : queueError ? (
              <div className="text-red-600 text-sm">{queueError}</div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                {['in_progress','pending','done','canceled'].filter(st => showHistory || ['in_progress','pending'].includes(st)).map(section => {
                  const items = (queueItems||[]).filter(i => i.status === section);
                  if (!items.length) return null;
                  const titleMap = { pending: 'Pendientes', in_progress: 'En progreso', done: 'Completados', canceled: 'Cancelados' };
                  return (
                    <div key={section} className="mb-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{titleMap[section]} ({items.length})</div>
                      <ul className="space-y-2">
                        {items.map(i => (
                          <li key={i.id} className="p-3 border rounded flex items-center justify-between">
                            <div className="text-sm">
                              <div className="font-medium">{i.client_name} — {Number(i.quantity_m).toFixed(2)} m {i.job_code ? `· ${i.job_code}` : ''}</div>
                              <div className="text-xs text-gray-500">{new Date(i.created_at).toLocaleString()} · {i.status}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {i.status === 'pending' && (
                                <button className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200" onClick={()=> updateJobStatus(i.id,'in_progress')}>
                                  <div className="flex items-center gap-1"><Play size={14}/> Iniciar</div>
                                </button>
                              )}
                              {['pending','in_progress'].includes(i.status) && (
                                <button className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200" onClick={()=> updateJobStatus(i.id,'done')}>
                                  <div className="flex items-center gap-1"><Check size={14}/> Completar</div>
                                </button>
                              )}
                              {['pending','in_progress'].includes(i.status) && (
                                <button className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200" onClick={()=> updateJobStatus(i.id,'canceled')}>
                                  <div className="flex items-center gap-1"><XCircle size={14}/> Cancelar</div>
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {(!queueItems || queueItems.length === 0) && (
                  <div className="text-sm text-gray-500">Sin trabajos.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRO DE METROS */}
      {registroModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-xs shadow-lg relative">
            <button
              onClick={() => setRegistroModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Registrar metros para {impresoraSeleccionada?.nombre}
            </h2>
            <div className="mb-3">
              <label className="block text-gray-700 font-bold mb-1">Fecha</label>
              <input
                type="date"
                value={registroFecha}
                onChange={e => setRegistroFecha(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <input
              type="number"
              placeholder="Metros impresos"
              value={metrosHoy}
              onChange={e => setMetrosHoy(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-4"
              min="0"
            />
            <button
              onClick={registrarMetros}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Guardar registro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
