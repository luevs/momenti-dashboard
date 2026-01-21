import React from 'react';
import { Edit3, Calendar, CheckCircle, XCircle, Clock, AlertCircle, FileText, MessageCircle, Printer } from 'lucide-react';

export default function ProgramTypeSection({
  customer,
  programs = [],
  onRegisterMeters,
  onEditProgram,
  onProgramWhatsApp,
  onProgramPrint,
  onOpenProgramHistory,
  type = '',              // <-- aceptar type como prop
  customerId = null       // <-- aceptar customerId como prop (fallback abajo)
}) {
  const formatFolioDisplay = (folio) => {
    if (!folio) return '';
    const s = String(folio).trim();
    const parts = s.split(/[^0-9]+/).filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (last.length >= 3) return last.slice(-3);
      return last.padStart(3, '0');
    }
    return s.slice(-3).padStart(3, '0');
  };
  // DEBUG: log incoming props to diagnose button issues
  try {
    console.log('ProgramTypeSection props:', { type, customerId, customer, programs, hasWhatsApp: !!onProgramWhatsApp, hasPrint: !!onProgramPrint });
  } catch (e) {
    // ignore
  }
  // Asegurar customerId si no se pasó explícitamente
  const resolvedCustomerId = customerId || customer?.id || null;

  // Aceptar ambos formatos:
  // - programs = { active: [], historical: [] }
  // - programs = [ prog1, prog2, ... ]  (todo activo)
  let activePrograms = [];
  let historicalPrograms = [];
  if (Array.isArray(programs)) {
    activePrograms = programs;
    historicalPrograms = [];
  } else if (programs && (programs.active || programs.historical)) {
    activePrograms = programs.active || [];
    historicalPrograms = programs.historical || [];
  } else {
    activePrograms = [];
    historicalPrograms = [];
  }

  // Ordenar programas por número de programa (más reciente primero)
  const sortedActive = activePrograms.sort((a, b) => (b.program_number || 0) - (a.program_number || 0));
  const sortedHistorical = historicalPrograms.sort((a, b) => (b.program_number || 0) - (a.program_number || 0));

  // Determinar el programa principal (más reciente activo)
  const mainActiveProgram = sortedActive[0];
  const additionalActivePrograms = sortedActive.slice(1);

  // Función para obtener el color del programa según su estado
  const getProgramStatusColor = (program) => {
    const total = Number(program.total_meters) || 0;
    const remaining = Number(program.remaining_meters) || 0;
    if (program.status === 'activo') {
      const percentage = total === 0 ? 0 : (remaining / total) * 100;
      if (percentage > 50) return 'border-green-200 bg-green-50';
      if (percentage > 20) return 'border-yellow-200 bg-yellow-50';
      return 'border-red-200 bg-red-50';
    }
    if (program.status === 'completado') return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50'; // expirado
  };

  // Función para obtener el ícono del estado
  const getStatusIcon = (program) => {
    const total = Number(program.total_meters) || 0;
    const remaining = Number(program.remaining_meters) || 0;
    switch (program.status) {
      case 'activo':
        const percentage = total === 0 ? 0 : (remaining / total) * 100;
        if (percentage > 50) return <CheckCircle size={16} className="text-green-600" />;
        if (percentage > 20) return <AlertCircle size={16} className="text-yellow-600" />;
        return <AlertCircle size={16} className="text-red-600" />;
      case 'completado':
        return <CheckCircle size={16} className="text-blue-600" />;
      case 'expirado':
        return <XCircle size={16} className="text-gray-600" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateInput) => {
    if (!dateInput) return '-';

    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const value = dateInput instanceof Date ? dateInput : dateInput.toString().trim();

    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = value.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return `${localDate.getDate()} ${meses[localDate.getMonth()]} ${localDate.getFullYear()}`;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getDate()} ${meses[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }

    return value.toString();
  };

  // Función para calcular el porcentaje de progreso
  const getProgressPercentage = (remaining, total) => {
    const r = Number(remaining) || 0;
    const t = Number(total) || 0;
    if (t === 0) return '0.00';
    return ((r / t) * 100).toFixed(2);
  };

  // Componente para mostrar un programa individual
  const ProgramBadge = ({ program, variant = 'default', isMain = false }) => {
    const totalMeters = Number(program.total_meters) || 0;
    const remainingMeters = Number(program.remaining_meters) || 0;
    const percentage = getProgressPercentage(remainingMeters, totalMeters);

    return (
      <div className={`border rounded-lg p-3 transition-all duration-200 hover:shadow-sm ${getProgramStatusColor(program)}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(program)}
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 flex items-center gap-2">
                  <span>
                    Programa #{program.program_number}
                    {isMain && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Principal</span>}
                  </span>
                  {program.program_folio && (
                    <span className="text-xs font-semibold uppercase tracking-wide bg-gray-900/10 text-gray-700 px-2 py-1 rounded-full">
                      Folio {formatFolioDisplay(program.program_folio)}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500 capitalize">{program.status}</span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">
                  {remainingMeters.toFixed(2)}m / {totalMeters.toFixed(2)}m
                </span>
                <span className="text-gray-500">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    program.status === 'activo' ? 'bg-blue-500' : 
                    program.status === 'completado' ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${Number(percentage)}%` }}
                ></div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>Compra: {formatDate(program.purchase_date)}</span>
              </div>
              {program.completion_date && (
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} />
                  <span>Completado: {formatDate(program.completion_date)}</span>
                </div>
              )}
              {customer.celular && (
                <span>📱 {customer.celular}</span>
              )}
            </div>

            {/* Razón de edición si existe */}
            {program.edit_reason && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                <strong>Editado:</strong> {program.edit_reason}
                {program.edit_authorized_by && <span> por {program.edit_authorized_by}</span>}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Botones de acción */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onOpenProgramHistory ? onOpenProgramHistory(customer, program) : null}
                className="text-sm px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
              >
                Historial
              </button>
              
              {/* Botn WhatsApp - usar <a> con href directo para evitar bloqueos de popup */}
              {(() => {
                const phoneRaw = customer?.celular || customer?.numeroWpp || customer?.numero_wpp || program?.numero_wpp || '';
                const phone = String(phoneRaw || '').replace(/\D/g, '').trim();
                if (phone && phone.length >= 8) {
                  const tipo = program?.type || customer?.type || '';
                  const fecha = program?.purchase_date ? new Date(program.purchase_date).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');
                  const metrosConsumidos = Number(((program?.total_meters || 0) - (program?.remaining_meters || 0)).toFixed(2));
                  const metrosRestantes = Number((program?.remaining_meters || 0).toFixed(2));
                  const message = `Saludos ${customer?.razon_social || customer?.name || ''}\nLe informamos que su pedido de ${tipo} ya está listo para que pase por el.\nEl día ${fecha} consumiste ${metrosConsumidos.toFixed(2)} metros de tu programa de lealtad ${tipo}. Te quedan ${metrosRestantes.toFixed(2)} metros en tu plan. ¡Gracias por tu preferencia!`;
                  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1"
                      title="Enviar mensaje de WhatsApp"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  );
                }
                // Fallback: si no hay número válido, mantener el botón que usa el handler (muestra alert en el handler)
                return (
                  <button
                    onClick={() => onProgramWhatsApp && onProgramWhatsApp(customer, program)}
                    className="text-sm px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1"
                    title="Enviar mensaje de WhatsApp"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                );
              })()}
              
              {/* Botón Imprimir */}
              <button
                onClick={() => onProgramPrint && onProgramPrint(customer, program)}
                className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                title="Imprimir ticket"
              >
                <Printer size={14} />
                Imprimir
              </button>
            </div>

            {/* Botón de editar */}
            <button
              onClick={() => onEditProgram && onEditProgram(program.id)}
              className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
              title="Editar programa"
            >
              <Edit3 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Si no hay programas de este tipo, no mostrar nada
  if (activePrograms.length === 0 && historicalPrograms.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      {/* Header del tipo - MODIFICADO */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${type === 'DTF Textil' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
          <h4 className="text-lg font-semibold text-gray-800">{type}</h4>
          <span className="text-sm text-gray-500">
            ({activePrograms.length + historicalPrograms.length} programa{activePrograms.length + historicalPrograms.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Resumen de metros activos */}
          {activePrograms.length > 0 && (
            <div className="text-right mr-3">
              <div className="text-lg font-bold text-blue-600">
                {activePrograms.reduce((sum, p) => sum + (Number(p.remaining_meters) || 0), 0).toFixed(2)}m
              </div>
              <div className="text-xs text-gray-500">disponibles</div>
            </div>
          )}
          
          {/* Botón Registrar Metros - NUEVO */}
          {activePrograms.length > 0 && (
            <button
              onClick={() => {
                console.log('🚀 ProgramTypeSection onClick - Registrar Metros');
                console.log('🔥 Registering meters for:', { 
                  resolvedCustomerId, 
                  customer, 
                  type, 
                  activePrograms 
                });
                
                // 🔥 FILTRAR SOLO PROGRAMAS DEL TIPO CORRECTO
                const programsOfThisType = activePrograms.filter(p => p.type === type);
                console.log(`🔥 Registrando metros para tipo: ${type}`);
                console.log(`🔥 Programas filtrados:`, programsOfThisType.map(p => ({
                  id: p.id,
                  folio: p.program_folio,
                  type: p.type,
                  remaining: p.remaining_meters
                })));
                
                onRegisterMeters && onRegisterMeters(resolvedCustomerId || customer, type, programsOfThisType);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              📏 Registrar Metros
            </button>
          )}
        </div>
      </div>

      {/* Programas activos */}
      {activePrograms.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Programas Activos ({activePrograms.length})
          </h5>
          <div className="space-y-3">
            {/* Programa principal */}
            {mainActiveProgram && (
              <ProgramBadge program={mainActiveProgram} variant="main" isMain={true} />
            )}
            
            {/* Programas activos adicionales */}
            {additionalActivePrograms.map(program => (
              <ProgramBadge 
                key={program.id} 
                program={program} 
                variant="additional" 
              />
            ))}
          </div>
        </div>
      )}

      {/* Programas históricos */}
      {historicalPrograms.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            Historial ({historicalPrograms.length})
          </h5>
          <div className="space-y-2">
            {sortedHistorical.map(program => (
              <ProgramBadge 
                key={program.id} 
                program={program} 
                variant="historical" 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};