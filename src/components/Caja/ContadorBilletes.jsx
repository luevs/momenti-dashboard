import React, { useState, useEffect } from 'react';
import { Banknote, Coins, Calculator, RotateCcw } from 'lucide-react';

const ContadorBilletes = ({ onTotalChange, initialValue = 0, className = '' }) => {
  // Denominaciones en MXN
  const denominaciones = [
    { valor: 1000, tipo: 'billete', color: 'bg-purple-100 border-purple-300' },
    { valor: 500, tipo: 'billete', color: 'bg-blue-100 border-blue-300' },
    { valor: 200, tipo: 'billete', color: 'bg-green-100 border-green-300' },
    { valor: 100, tipo: 'billete', color: 'bg-red-100 border-red-300' },
    { valor: 50, tipo: 'billete', color: 'bg-pink-100 border-pink-300' },
    { valor: 20, tipo: 'billete', color: 'bg-orange-100 border-orange-300' },
    { valor: 10, tipo: 'moneda', color: 'bg-yellow-100 border-yellow-300' },
    { valor: 5, tipo: 'moneda', color: 'bg-gray-100 border-gray-300' },
    { valor: 2, tipo: 'moneda', color: 'bg-indigo-100 border-indigo-300' },
    { valor: 1, tipo: 'moneda', color: 'bg-teal-100 border-teal-300' },
    { valor: 0.5, tipo: 'moneda', color: 'bg-amber-100 border-amber-300' }
  ];

  const [cantidades, setCantidades] = useState({});
  const [total, setTotal] = useState(0);

  // Inicializar cantidades en 0
  useEffect(() => {
    const cantidadesIniciales = {};
    denominaciones.forEach(den => {
      cantidadesIniciales[den.valor] = 0;
    });
    setCantidades(cantidadesIniciales);
  }, []);

  // Calcular total cuando cambien las cantidades
  useEffect(() => {
    const nuevoTotal = denominaciones.reduce((sum, den) => {
      return sum + (den.valor * (cantidades[den.valor] || 0));
    }, 0);
    
    setTotal(nuevoTotal);
    
    if (onTotalChange) {
      onTotalChange(nuevoTotal);
    }
  }, [cantidades, onTotalChange]);

  // Manejar cambio en cantidad
  const handleCantidadChange = (valor, cantidad) => {
    const cantidadNumerica = parseInt(cantidad) || 0;
    setCantidades(prev => ({
      ...prev,
      [valor]: cantidadNumerica >= 0 ? cantidadNumerica : 0
    }));
  };

  // Incrementar/decrementar cantidad
  const ajustarCantidad = (valor, incremento) => {
    const cantidadActual = cantidades[valor] || 0;
    const nuevaCantidad = cantidadActual + incremento;
    if (nuevaCantidad >= 0) {
      handleCantidadChange(valor, nuevaCantidad);
    }
  };

  // Limpiar todas las cantidades
  const limpiarContador = () => {
    const cantidadesVacias = {};
    denominaciones.forEach(den => {
      cantidadesVacias[den.valor] = 0;
    });
    setCantidades(cantidadesVacias);
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Contador de Efectivo</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total contado:</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(total)}
              </p>
            </div>
            <button
              onClick={limpiarContador}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Limpiar contador"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contador de denominaciones */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {denominaciones.map(denominacion => {
            const cantidad = cantidades[denominacion.valor] || 0;
            const subtotal = denominacion.valor * cantidad;
            
            return (
              <div
                key={denominacion.valor}
                className={`p-4 rounded-lg border-2 ${denominacion.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {denominacion.tipo === 'billete' ? (
                      <Banknote className="h-5 w-5 text-gray-600" />
                    ) : (
                      <Coins className="h-5 w-5 text-gray-600" />
                    )}
                    <span className="font-medium text-gray-900">
                      {formatCurrency(denominacion.valor)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => ajustarCantidad(denominacion.valor, -1)}
                    className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600"
                    disabled={cantidad <= 0}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  
                  <input
                    type="number"
                    min="0"
                    value={cantidad}
                    onChange={(e) => handleCantidadChange(denominacion.valor, e.target.value)}
                    className="flex-1 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={() => ajustarCantidad(denominacion.valor, 1)}
                    className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                
                {cantidad > 0 && (
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {cantidad} × {formatCurrency(denominacion.valor)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen total */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-gray-900">
              Total en Efectivo:
            </span>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(total)}
            </span>
          </div>
          
          {total > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span>Billetes: </span>
                  <span className="font-medium">
                    {formatCurrency(
                      denominaciones
                        .filter(d => d.tipo === 'billete')
                        .reduce((sum, den) => sum + (den.valor * (cantidades[den.valor] || 0)), 0)
                    )}
                  </span>
                </div>
                <div>
                  <span>Monedas: </span>
                  <span className="font-medium">
                    {formatCurrency(
                      denominaciones
                        .filter(d => d.tipo === 'moneda')
                        .reduce((sum, den) => sum + (den.valor * (cantidades[den.valor] || 0)), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContadorBilletes;