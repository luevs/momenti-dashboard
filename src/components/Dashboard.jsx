import React from 'react';
import { Wrench, Package, BarChart2, ClipboardList, Users } from 'lucide-react'; // Importa 'Users'

const features = [
  // ... tus otras características
  {
    title: 'Programa de Lealtad', // Nuevo
    icon: <Users size={28} />, // Nuevo
    description: [ // Nuevo
      'Gestión de metros consumidos de clientes',
      'Alertas de saldo bajo y expiración',
      'Facilitar la renovación del programa',
    ],
    link: 'Ver clientes', // Nuevo
    path: '/clientes-lealtad' // Nuevo
  },
  // ... tus otras características
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
                <a href={feature.path} className="text-blue-600 text-sm underline">{feature.link}</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}