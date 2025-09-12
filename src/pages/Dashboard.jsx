import React from 'react';
import { Wrench, Package, BarChart2, ClipboardList } from 'lucide-react';

const features = [
  {
    title: 'Mantenimiento',
    icon: <Wrench size={28} />,
    description: [
      'Registro de mantenimientos preventivos/correctivos',
      'Alertas por próximas fechas de mantenimiento',
      'Checklist digital para técnicos',
    ],
    link: 'Historial por impresora',
  },
  {
    title: 'Inventario de consumibles',
    icon: <Package size={28} />,
    description: [
      'Tintas, films, repuestos, cabezales',
      'Cantidad en stock y alertas de bajo inventario',
      'Entradas activas vs inactivas',
    ],
  },
  {
    title: 'Reportes',
    icon: <BarChart2 size={28} />,
    description: [
      'Producción diaria/semanal/mensual por impresora',
      'Consumo de metros por diseño o cliente',
      'Tiempos activos vs inactivos',
    ],
  },
  {
    title: 'Órdenes de trabajo',
    icon: <ClipboardList size={28} />,
    description: [
      'Cargar trabajos con info de cliente, diseño, impresora',
      'Estatus: pendiente, en proceso, terminado',
      'Asignación de prioridad y comentarios',
    ],
  },
];

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">Dashboard General</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="bg-white rounded-2xl shadow p-5 hover:shadow-lg transition-all">
            <div className="flex items-center space-x-3 mb-3 text-gray-800">
              {feature.icon}
              <h2 className="text-xl font-medium">{feature.title}</h2>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {feature.description.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {feature.link && (
              <div className="mt-3">
                <a href="#" className="text-blue-600 text-sm underline">{feature.link}</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
