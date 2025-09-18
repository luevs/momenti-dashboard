import { useNavigate } from "react-router-dom";

export default function MaquinaCard({ maquina }) {
  const navigate = useNavigate();

  // Ejemplo de cómo podrías mostrar estado y alarmas
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-xl font-semibold">{maquina.name}</h2>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            maquina.status === "activo"
              ? "bg-green-100 text-green-700"
              : maquina.status === "inactivo"
              ? "bg-gray-200 text-gray-600"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {maquina.status === "activo"
            ? "Activa"
            : maquina.status === "inactivo"
            ? "Inactiva"
            : "En cola"}
        </span>
        {/* Puedes agregar más badges aquí */}
      </div>
      <div className="mb-2 text-sm text-gray-600">
        Trabajos en cola: <strong>{maquina.trabajosEnCola ?? 0}</strong>
      </div>
      <div className="mb-2 text-sm text-gray-600">
        Metros impresos hoy: <strong>{maquina.metrosHoy ?? 0}</strong>
      </div>
      {/* Alarmas de insumos */}
      {maquina.alarmas && maquina.alarmas.length > 0 && (
        <div className="mb-2">
          {maquina.alarmas.map((alarma, idx) => (
            <span
              key={idx}
              className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-xs mr-1"
            >
              {alarma}
            </span>
          ))}
        </div>
      )}
      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => navigate(`/maquinas/${maquina.id}`)}
      >
        Ver Detalle
      </button>
    </div>
  );
}