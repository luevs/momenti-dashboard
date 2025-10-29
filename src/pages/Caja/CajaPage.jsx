import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  DollarSign, 
  Plus, 
  Calculator, 
  BarChart3,
  Settings,
  AlertCircle,
  X
} from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

// Componentes
import ResumenCaja from '../../components/Caja/ResumenCaja.jsx';
import FiltrosMovimientos from '../../components/Caja/FiltrosMovimientos.jsx';
import ListaMovimientos from '../../components/Caja/ListaMovimientos.jsx';
import RegistroMovimiento from '../../components/Caja/RegistroMovimiento.jsx';
import CorteMain from '../../components/Caja/CorteMain.jsx';
import GestionCategorias from '../../components/Caja/GestionCategorias.jsx';

// Tu componente de Corte original
import CorteOriginal from '../Corte.jsx';

const CajaPage = () => {
  const location = useLocation();
  const { error, limpiarError } = useCaja();
  const [activeTab, setActiveTab] = useState('movimientos');
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [movimientoEdit, setMovimientoEdit] = useState(null);

  // Determinar tab activo basado en la ruta
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/caja/cortes')) {
      setActiveTab('cortes');
    } else if (path.includes('/caja/reportes')) {
      setActiveTab('reportes');
    } else if (path.includes('/caja/categorias')) {
      setActiveTab('configuracion');
    } else {
      setActiveTab('movimientos');
    }
  }, [location.pathname]);

  const tabs = [
    {
      id: 'movimientos',
      label: 'Movimientos',
      icon: DollarSign,
      description: 'Registrar y consultar movimientos de caja'
    },
    {
      id: 'cortes',
      label: 'Cortes de Caja',
      icon: Calculator,
      description: 'Realizar y consultar cortes de caja'
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: BarChart3,
      description: 'Análisis y reportes financieros'
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
      description: 'Gestionar categorías y configuraciones'
    }
  ];

  const handleEditMovimiento = (movimiento) => {
    setMovimientoEdit(movimiento);
    setShowRegistroModal(true);
  };

  const handleCloseModal = () => {
    setShowRegistroModal(false);
    setMovimientoEdit(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'movimientos':
        return (
          <div className="space-y-6">
            {/* Resumen */}
            <ResumenCaja />
            
            {/* Filtros */}
            <FiltrosMovimientos />
            
            {/* Lista de movimientos */}
            <ListaMovimientos onEditMovimiento={handleEditMovimiento} />
          </div>
        );

      case 'cortes':
        return <CorteOriginal />;

      case 'reportes':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Reportes y Análisis
            </h3>
            <p className="text-gray-600 mb-4">
              Esta sección estará disponible próximamente con reportes detallados, 
              gráficos de tendencias y análisis financieros.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Funcionalidades planeadas:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Reportes de ingresos y gastos por período</li>
                <li>• Análisis por categorías y métodos de pago</li>
                <li>• Gráficos de tendencias temporales</li>
                <li>• Comparativas entre períodos</li>
                <li>• Exportación a Excel/PDF</li>
              </ul>
            </div>
          </div>
        );

      case 'configuracion':
        return <GestionCategorias />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Módulo de Caja
                </h1>
                <p className="text-sm text-gray-600">
                  Gestión completa de movimientos y cortes de caja
                </p>
              </div>
            </div>
            
            {activeTab === 'movimientos' && (
              <button
                onClick={() => setShowRegistroModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Movimiento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error en el sistema
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={limpiarError}
                className="ml-3 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab description */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </div>

      {/* Modal de registro */}
      <RegistroMovimiento
        isOpen={showRegistroModal}
        onClose={handleCloseModal}
        movimientoEdit={movimientoEdit}
      />
    </div>
  );
};

export default CajaPage;