import React, { useState } from 'react';
import { Calculator, History, CheckCircle } from 'lucide-react';
import FormularioCorte from './FormularioCorte.jsx';
import HistorialCortes from './HistorialCortes.jsx';

const CorteMain = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState('nuevo');
  const [corteRealizado, setCorteRealizado] = useState(null);

  const tabs = [
    {
      id: 'nuevo',
      label: 'Nuevo Corte',
      icon: Calculator,
      description: 'Realizar un nuevo corte de caja'
    },
    {
      id: 'historial',
      label: 'Historial',
      icon: History,
      description: 'Ver cortes anteriores'
    }
  ];

  const handleCorteRealizado = (corte) => {
    setCorteRealizado(corte);
    // Mostrar mensaje de éxito por unos segundos
    setTimeout(() => {
      setCorteRealizado(null);
      // Cambiar al historial para ver el nuevo corte
      setActiveTab('historial');
    }, 3000);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Mensaje de éxito */}
      {corteRealizado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-green-800">
                ¡Corte realizado exitosamente!
              </h3>
              <p className="text-green-700 mt-1">
                El corte de caja se ha guardado correctamente. 
                Diferencia: {corteRealizado.diferencia >= 0 ? '+' : ''}
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(corteRealizado.diferencia))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'nuevo' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Realizar Nuevo Corte de Caja
                </h2>
                <p className="text-gray-600">
                  Configura el período, cuenta el efectivo en caja y realiza el corte.
                  El sistema calculará automáticamente las diferencias.
                </p>
              </div>
              
              <FormularioCorte onCorteRealizado={handleCorteRealizado} />
            </div>
          )}

          {activeTab === 'historial' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Historial de Cortes
                </h2>
                <p className="text-gray-600">
                  Consulta los cortes de caja realizados anteriormente.
                </p>
              </div>
              
              <HistorialCortes />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorteMain;