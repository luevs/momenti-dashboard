import { useState } from "react";
import { Printer, Plus, X } from "lucide-react";

const estadoColores = {
  activo: "bg-green-100 text-green-800",
  inactivo: "bg-gray-100 text-gray-500",
  cola: "bg-yellow-100 text-yellow-800",
};

export default function Impresoras() {
  const [impresoras, setImpresoras] = useState([
    { id: 1, nombre: "DTF 1 (Left)", estado: "activo", cola: 2 },
    { id: 2, nombre: "DTF 2 (Right)", estado: "inactivo", cola: 0 },
    { id: 3, nombre: "UV DTF", estado: "cola", cola: 5 },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("activo");
  const [historial, setHistorial] = useState([]);

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Impresoras</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Agregar impresora
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {impresoras.map((impresora) => (
          <div
            key={impresora.id}
            className="p-4 bg-white shadow rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Printer className="text-blue-600" size={32} />
                <div>
                  <h2 className="font-semibold text-lg">{impresora.nombre}</h2>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${estadoColores[impresora.estado]}`}
                  >
                    {impresora.estado === "activo"
                      ? "Activa"
                      : impresora.estado === "inactivo"
                      ? "Inactiva"
                      : "En cola"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Trabajos en cola: <strong>{impresora.cola}</strong>
            </p>

            {/* Botones de estado */}
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => cambiarEstado(impresora.id, "activo")}
                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded"
              >
                Activar
              </button>
              <button
                onClick={() => cambiarEstado(impresora.id, "cola")}
                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded"
              >
                En cola
              </button>
              <button
                onClick={() => cambiarEstado(impresora.id, "inactivo")}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
              >
                Apagar
              </button>
            </div>

            {/* Historial */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold">Historial:</h4>
              <ul className="text-xs text-gray-500 max-h-24 overflow-y-auto mt-1 space-y-1">
                {historial
                  .filter((h) => h.impresoraId === impresora.id)
                  .slice(-5)
                  .reverse()
                  .map((evento) => (
                    <li key={evento.id}>
                      {evento.timestamp} →{" "}
                      <strong>
                        {evento.nuevoEstado === "activo"
                          ? "Activa"
                          : evento.nuevoEstado === "inactivo"
                          ? "Inactiva"
                          : "En cola"}
                      </strong>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

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
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
