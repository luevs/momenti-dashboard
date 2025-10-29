import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

const ResumenCaja = ({ fechaInicio = null, fechaFin = null, className = '' }) => {
  const { resumen, cajaService } = useCaja();

  const cards = [
    {
      title: 'Total Ingresos',
      value: resumen.ingresos,
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-600'
    },
    {
      title: 'Total Gastos',
      value: resumen.gastos,
      icon: TrendingDown,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      iconColor: 'text-red-600'
    },
    {
      title: 'Balance',
      value: resumen.balance,
      icon: DollarSign,
      color: resumen.balance >= 0 ? 'green' : 'red',
      bgColor: resumen.balance >= 0 ? 'bg-green-100' : 'bg-red-100',
      textColor: resumen.balance >= 0 ? 'text-green-800' : 'text-red-800',
      iconColor: resumen.balance >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Movimientos',
      value: resumen.totalMovimientos,
      icon: Activity,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      isCount: true
    }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.isCount 
                    ? card.value.toLocaleString('es-MX')
                    : cajaService.formatCurrency(card.value)
                  }
                </p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-full`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
            
            {/* Indicador visual adicional para el balance */}
            {card.title === 'Balance' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    resumen.balance > 0 
                      ? 'bg-green-500' 
                      : resumen.balance < 0 
                        ? 'bg-red-500' 
                        : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-gray-600">
                    {resumen.balance > 0 
                      ? 'Positivo' 
                      : resumen.balance < 0 
                        ? 'Negativo' 
                        : 'Neutro'
                    }
                  </span>
                </div>
              </div>
            )}
            
            {/* Información adicional para movimientos */}
            {card.title === 'Movimientos' && resumen.totalMovimientos > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  Promedio: {cajaService.formatCurrency(
                    (resumen.ingresos + resumen.gastos) / resumen.totalMovimientos
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResumenCaja;