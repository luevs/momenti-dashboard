import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Phone, Mail, Calendar, MapPin, Clock } from 'lucide-react';
import ProgramTypeSection from './ProgramTypeSection';

// Función simple para formatear fecha (solo fecha, sin hora)
const formatDateSimple = (dateString) => {
  if (!dateString) return null;
  
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dateStr = dateString.toString();
  
  // Para timestamps como "2025-10-03T10:38:00" o "2025-10-03 10:38:00"
  if (dateStr.includes('T') || (dateStr.includes('-') && dateStr.includes(':'))) {
    let datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    const [year, month, day] = datePart.split('-');
    const monthName = meses[parseInt(month) - 1];
    return `${parseInt(day)} ${monthName} ${year}`;
  }
  
  // Para fechas simples
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    const monthName = meses[parseInt(month) - 1];
    return `${parseInt(day)} ${monthName} ${year}`;
  }
  
  return null;
};

function CustomerLoyaltyCard({
  customer,
  programs,
  isExpanded,
  onToggleExpand,
  onAddProgram,
  onEditProgram,
  onRegisterMeters,
  onProgramWhatsApp,
  onProgramPrint,
  onOpenProgramHistory
}) {
  // Calcular métricas del cliente
  const calculateMetrics = () => {
    let totalActiveMeters = 0;
    let totalPrograms = 0;
    let activeProgramsCount = 0;
    let programTypes = [];

    Object.entries(programs || {}).forEach(([type, typePrograms]) => {
      const activePrograms = (typePrograms && typePrograms.active) || [];
      const historicalPrograms = (typePrograms && typePrograms.historical) || [];

      const remainingMeters = activePrograms.reduce(
        (sum, program) => sum + (Number(program.remaining_meters) || 0),
        0
      );

      const totalMetersForType = [...activePrograms, ...historicalPrograms].reduce(
        (sum, program) => sum + (Number(program.total_meters) || 0),
        0
      );

      programTypes.push({
        type,
        activeMeters: remainingMeters,
        activeCount: activePrograms.length,
        totalCount: activePrograms.length + historicalPrograms.length,
        totalMeters: totalMetersForType,
        folios: activePrograms
          .map(program => program?.program_folio)
          .filter(Boolean)
      });

      totalActiveMeters += remainingMeters;
      totalPrograms += activePrograms.length + historicalPrograms.length;
      activeProgramsCount += activePrograms.length;
    });

    return {
      totalActiveMeters,
      totalPrograms,
      activeProgramsCount,
      programTypes
    };
  };

  const metrics = calculateMetrics();

  // Obtener el último programa (más reciente)
  const getLastPurchaseDate = () => {
    let lastDate = null;
    Object.values(programs || {}).forEach(typePrograms => {
      [...(typePrograms.active || []), ...(typePrograms.historical || [])].forEach(program => {
        const purchaseDate = new Date(program.purchase_date);
        if (!lastDate || purchaseDate > lastDate) {
          lastDate = purchaseDate;
        }
      });
    });
    return lastDate;
  };

  const lastPurchase = getLastPurchaseDate();

  // Determinar el estado general del cliente
  const getCustomerStatus = () => {
    if (metrics.activeProgramsCount === 0) return 'inactivo';
    if (metrics.totalActiveMeters > 50) return 'premium';
    if (metrics.totalActiveMeters > 20) return 'regular';
    return 'nuevo';
  };

  const status = getCustomerStatus();

  // Colores por estado
  const statusColors = {
    premium: 'border-l-yellow-500 bg-yellow-50',
    regular: 'border-l-green-500 bg-green-50',
    nuevo: 'border-l-blue-500 bg-blue-50',
    inactivo: 'border-l-gray-500 bg-gray-50'
  };

  const statusLabels = {
    premium: 'Premium',
    regular: 'Regular', 
    nuevo: 'Nuevo',
    inactivo: 'Inactivo'
  };

  const statusTextColors = {
    premium: 'text-yellow-700',
    regular: 'text-green-700',
    nuevo: 'text-blue-700',
    inactivo: 'text-gray-700'
  };

  return (
    <div className={`border-l-4 ${statusColors[status]} rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200`}>
      {/* Header - Información básica del cliente */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          {/* Info del cliente */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {(customer.razon_social || customer.alias || 'N/A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customer.razon_social || customer.alias || 'Sin nombre'}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    ID: {customer.id}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]} ${statusTextColors[status]}`}>
                    {statusLabels[status]}
                  </span>
                  {customer.celular && (
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      <span>{customer.celular}</span>
                    </div>
                  )}
                  {/* fallback to telefono removed; prefer 'celular' only */}
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail size={14} />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resumen de programas - MODIFICADO para mostrar por tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {metrics.programTypes.map(typeInfo => (
                <div key={typeInfo.type} className="bg-white rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${typeInfo.type === 'DTF Textil' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                    <span className="text-sm font-medium text-gray-700">{typeInfo.type}</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">{typeInfo.activeMeters.toFixed(2)}m</div>
                  <div className="text-xs text-gray-600">{typeInfo.activeCount} activo{typeInfo.activeCount !== 1 ? 's' : ''}</div>
                  {typeInfo.folios?.length > 0 && (
                    <div className="mt-1 text-[11px] text-gray-500 font-medium">
                      Folios: {typeInfo.folios.join(', ')}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Card de total general */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200 md:col-span-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{metrics.totalActiveMeters.toFixed(2)}m</div>
                  <div className="text-sm text-gray-600">Total Metros Activos • {metrics.activeProgramsCount} programas</div>
                </div>
              </div>
            </div>

            {/* Última compra */}
            {lastPurchase && (
              <div className="mt-3 flex items-center gap-1 text-sm text-gray-600">
                <Calendar size={14} />
                <span>Última compra: {lastPurchase.toLocaleDateString('es-MX')}</span>
              </div>
            )}

            {/* Último registro de metros */}
            {customer.lastMetersRegistry && (
              <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                <Clock size={14} />
                <span>Último registro: {formatDateSimple(customer.lastMetersRegistry)}</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onOpenProgramHistory && onOpenProgramHistory(customer, null)}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded"
              title="Historial"
            >
              Historial
            </button>
            <button
              onClick={() => onAddProgram(customer.id)}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              Programa
            </button>
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Contraer' : 'Expandir'}
            </button>
          </div>
        </div>
      </div>

      {/* Detalle expandido - Programas por tipo */}
      {isExpanded && (
        <div className="border-t bg-white">
          <div className="p-4 space-y-4">
            {/* Render a ProgramTypeSection per program type */}
            {programs && Object.keys(programs).length > 0 ? (
              Object.entries(programs).map(([ptype, lists]) => (
                <ProgramTypeSection
                  key={ptype}
                  customer={customer}
                  type={ptype}
                  programs={lists}
                  onRegisterMeters={onRegisterMeters}
                  onEditProgram={onEditProgram}
                  onProgramWhatsApp={onProgramWhatsApp}
                  onProgramPrint={onProgramPrint}
                  onOpenProgramHistory={onOpenProgramHistory}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>Este cliente no tiene programas de lealtad aún</p>
                <button
                  onClick={() => onAddProgram(customer.id)}
                  className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Crear primer programa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLoyaltyCard;