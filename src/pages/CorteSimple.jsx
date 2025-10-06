import React from "react";

export default function CorteSimple() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sistema de Corte de Caja</h1>
        <p className="text-gray-600">Gestión de efectivo y conteo de denominaciones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario Simple */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Contar Efectivo</h2>
          <p>Aquí irá el formulario de conteo.</p>
        </div>

        {/* Historial Simple */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Historial</h2>
          <p>Aquí irá el historial de cortes.</p>
        </div>
      </div>
    </div>
  );
}