import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  Save
} from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';
import ContadorBilletes from './ContadorBilletes.jsx';

const FormularioCorte = ({ onCorteRealizado, className = '' }) => {
  const { realizarCorte, obtenerUltimoCorte, cajaService, loading } = useCaja();
  
  const [formData, setFormData] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
    tipoCorte: 'turno' // turno, dia, personalizado
  });
  
  const [efectivoContado, setEfectivoContado] = useState(0);
  const [desgloseBilletes, setDesgloseBilletes] = useState({});
  const [calculosCorte, setCalculosCorte] = useState({
    saldoInicial: 0,
    totalIngresos: 0,
    totalGastos: 0,
    saldoCalculado: 0,
    diferencia: 0
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Configurar fechas según el tipo de corte
  useEffect(() => {
    const ahora = new Date();
    let inicio, fin;

    switch (formData.tipoCorte) {
      case 'turno':
        // Turno actual (desde las 8:00 AM del día actual)
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 8, 0);
        if (ahora.getHours() < 8) {
          // Si son antes de las 8 AM, el turno empezó ayer
          inicio.setDate(inicio.getDate() - 1);
        }
        fin = ahora;
        break;
      
      case 'dia':
        // Día completo (desde 00:00 hasta ahora)
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0);
        fin = ahora;
        break;
      
      default: // personalizado
        return; // No cambiar las fechas
    }

    setFormData(prev => ({
      ...prev,
      fecha_inicio: inicio.toISOString().slice(0, 16),
      fecha_fin: fin.toISOString().slice(0, 16)
    }));
  }, [formData.tipoCorte]);

  // Calcular datos del corte cuando cambien las fechas
  useEffect(() => {
    if (formData.fecha_inicio && formData.fecha_fin) {
      calcularDatosCorte();
    }
  }, [formData.fecha_inicio, formData.fecha_fin]);

  // Calcular diferencia cuando cambie el efectivo contado
  useEffect(() => {
    const diferencia = efectivoContado - calculosCorte.saldoCalculado;
    setCalculosCorte(prev => ({
      ...prev,
      diferencia
    }));
  }, [efectivoContado, calculosCorte.saldoCalculado]);

  const calcularDatosCorte = async () => {
    try {
      // Obtener último corte para saldo inicial
      const ultimoCorte = await obtenerUltimoCorte();
      const saldoInicial = ultimoCorte?.saldo_calculado || 0;

      // Obtener resumen del periodo
      const resumen = await cajaService.getResumen(
        new Date(formData.fecha_inicio).toISOString(),
        new Date(formData.fecha_fin).toISOString()
      );

      const saldoCalculado = saldoInicial + resumen.ingresos - resumen.gastos;

      setCalculosCorte({
        saldoInicial,
        totalIngresos: resumen.ingresos,
        totalGastos: resumen.gastos,
        saldoCalculado,
        diferencia: efectivoContado - saldoCalculado
      });
    } catch (error) {
      console.error('Error calculando datos del corte:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleTipoCorteChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipoCorte: tipo
    }));
  };

  const handleEfectivoChange = (total, desglose = {}) => {
    setEfectivoContado(total);
    setDesgloseBilletes(desglose);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fecha_inicio) {
      newErrors.fecha_inicio = 'La fecha de inicio es requerida';
    }

    if (!formData.fecha_fin) {
      newErrors.fecha_fin = 'La fecha de fin es requerida';
    }

    if (new Date(formData.fecha_inicio) >= new Date(formData.fecha_fin)) {
      newErrors.fecha_fin = 'La fecha de fin debe ser posterior a la de inicio';
    }

    if (efectivoContado === 0) {
      newErrors.efectivo = 'Debe contar el efectivo en caja';
    }

    // Si la diferencia es muy alta, requerir observaciones
    if (Math.abs(calculosCorte.diferencia) > 50 && !formData.observaciones.trim()) {
      newErrors.observaciones = 'Las observaciones son requeridas cuando hay diferencias mayores a $50';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const corteData = {
        fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
        fecha_fin: new Date(formData.fecha_fin).toISOString(),
        efectivo_contado: efectivoContado,
        desglose_billetes: desgloseBilletes,
        observaciones: formData.observaciones.trim() || null
      };

      const nuevoCorte = await realizarCorte(corteData);
      
      if (onCorteRealizado) {
        onCorteRealizado(nuevoCorte);
      }

      // Limpiar formulario
      setFormData({
        fecha_inicio: '',
        fecha_fin: '',
        observaciones: '',
        tipoCorte: 'turno'
      });
      setEfectivoContado(0);
      setDesgloseBilletes({});

    } catch (error) {
      console.error('Error realizando corte:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getDiferenciaColor = (diferencia) => {
    if (diferencia === 0) return 'text-green-600';
    if (Math.abs(diferencia) <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDiferenciaIcon = (diferencia) => {
    if (diferencia === 0) return CheckCircle;
    if (Math.abs(diferencia) <= 50) return AlertTriangle;
    return AlertTriangle;
  };

  const getDiferenciaMessage = (diferencia) => {
    if (diferencia === 0) return 'Corte perfecto';
    if (Math.abs(diferencia) <= 50) return 'Diferencia aceptable';
    return 'Diferencia significativa - Revisar';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuración del período */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Configurar Período del Corte</h3>
        </div>

        {/* Tipo de corte */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Corte
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { value: 'turno', label: 'Turno Actual', desc: 'Desde 8:00 AM' },
              { value: 'dia', label: 'Día Completo', desc: 'Desde 00:00' },
              { value: 'personalizado', label: 'Personalizado', desc: 'Rango específico' }
            ].map(tipo => (
              <button
                key={tipo.value}
                type="button"
                onClick={() => handleTipoCorteChange(tipo.value)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.tipoCorte === tipo.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="font-medium text-gray-900">{tipo.label}</div>
                <div className="text-sm text-gray-600">{tipo.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Fechas - solo mostrar si es personalizado */}
        {formData.tipoCorte === 'personalizado' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha y Hora Inicio
              </label>
              <input
                type="datetime-local"
                name="fecha_inicio"
                value={formData.fecha_inicio}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fecha_inicio ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.fecha_inicio && (
                <p className="text-red-500 text-sm mt-1">{errors.fecha_inicio}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha y Hora Fin
              </label>
              <input
                type="datetime-local"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fecha_fin ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.fecha_fin && (
                <p className="text-red-500 text-sm mt-1">{errors.fecha_fin}</p>
              )}
            </div>
          </div>
        )}

        {/* Mostrar período seleccionado */}
        {formData.fecha_inicio && formData.fecha_fin && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Período seleccionado:</strong><br />
              Del {cajaService.formatDate(formData.fecha_inicio)} al {cajaService.formatDate(formData.fecha_fin)}
            </div>
          </div>
        )}
      </div>

      {/* Contador de efectivo */}
      <ContadorBilletes 
        onTotalChange={handleEfectivoChange}
        className=""
      />
      {errors.efectivo && (
        <p className="text-red-500 text-sm">{errors.efectivo}</p>
      )}

      {/* Cálculos del corte */}
      {formData.fecha_inicio && formData.fecha_fin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Calculator className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Cálculos del Corte</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Saldo Inicial</div>
              <div className="text-xl font-bold text-blue-800">
                {cajaService.formatCurrency(calculosCorte.saldoInicial)}
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Ingresos</div>
              <div className="text-xl font-bold text-green-800">
                {cajaService.formatCurrency(calculosCorte.totalIngresos)}
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Total Gastos</div>
              <div className="text-xl font-bold text-red-800">
                {cajaService.formatCurrency(calculosCorte.totalGastos)}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Saldo Calculado</div>
              <div className="text-xl font-bold text-gray-800">
                {cajaService.formatCurrency(calculosCorte.saldoCalculado)}
              </div>
            </div>
          </div>

          {/* Comparación */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <div className="text-sm text-gray-600">Efectivo Contado</div>
                <div className="text-2xl font-bold text-blue-600">
                  {cajaService.formatCurrency(efectivoContado)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">Diferencia</div>
                <div className={`text-2xl font-bold ${getDiferenciaColor(calculosCorte.diferencia)}`}>
                  {calculosCorte.diferencia >= 0 ? '+' : ''}
                  {cajaService.formatCurrency(Math.abs(calculosCorte.diferencia))}
                </div>
                <div className={`text-sm ${getDiferenciaColor(calculosCorte.diferencia)} flex items-center justify-center mt-1`}>
                  {React.createElement(getDiferenciaIcon(calculosCorte.diferencia), { className: 'h-4 w-4 mr-1' })}
                  {getDiferenciaMessage(calculosCorte.diferencia)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">Saldo Calculado</div>
                <div className="text-2xl font-bold text-gray-800">
                  {cajaService.formatCurrency(calculosCorte.saldoCalculado)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observaciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <FileText className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Observaciones</h3>
        </div>
        
        <textarea
          name="observaciones"
          value={formData.observaciones}
          onChange={handleInputChange}
          rows={4}
          placeholder="Observaciones adicionales sobre el corte de caja (requeridas si hay diferencias mayores a $50)..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
            errors.observaciones ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.observaciones && (
          <p className="text-red-500 text-sm mt-1">{errors.observaciones}</p>
        )}
      </div>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || loading || !formData.fecha_inicio || !formData.fecha_fin || efectivoContado === 0}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5 mr-2" />
          {submitting ? 'Guardando Corte...' : 'Realizar Corte de Caja'}
        </button>
      </div>
    </div>
  );
};

export default FormularioCorte;