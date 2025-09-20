import { Printer, Plus, X } from "lucide-react";
import MaquinaCard from '../components/MaquinaCard';
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
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

  const navigate = useNavigate();

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
      registered_by: localStorage.getItem('currentUser') || 'Sistema'
    };
    const { error } = await supabase
      .from('machine_daily_prints')
      .upsert([payload], { onConflict: ['machine_id', 'date'] }); // upsert evita duplicados por machine+date
    if (error) {
      alert("Error al registrar: " + error.message);
    } else {
      // actualizar UI localmente
      setLatestRecords(prev => ({ ...prev, [impresoraSeleccionada.id]: payload }));
      alert("Registro guardado");
      setRegistroModalOpen(false);
      setMetrosHoy("");
      setImpresoraSeleccionada(null);
    }
  };

  // Nuevo: Guardar corte diario para todas las máquinas
  const registrarCorteDiario = async () => {
    const registros = impresoras
      .filter((imp) => corteMetros[imp.id] && !isNaN(Number(corteMetros[imp.id])))
      .map((imp) => ({
        machine_id: imp.id,
        date: corteFecha,
        meters_printed: Number(corteMetros[imp.id]),
        registered_by: localStorage.getItem('currentUser') || 'Sistema'
      }));
    if (registros.length === 0) {
      alert("Ingresa al menos un valor válido de metros.");
      return;
    }
    const { error } = await supabase.from('machine_daily_prints').insert(registros);
    if (error) {
      alert("Error al registrar: " + error.message);
    } else {
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
              className="p-4 bg-white shadow rounded-xl border border-gray-200 transition"
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
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/maquinas/${impresora.id}`); }}
                    className="text-xs text-blue-600 mt-2 hover:underline"
                  >
                    Ver Historial
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
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
