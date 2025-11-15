import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ClienteDashboard() {
  const [customer, setCustomer] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('cliente_session') || '{}');
    if (!session.customer_id) {
      navigate('/cliente/login');
      return;
    }

    loadCustomerData(session.customer_id);
  }, [navigate]);

  const loadCustomerData = async (customerId) => {
    setLoading(true);
    try {
      // Cargar datos del cliente
      const { data: customerData, error: customerError } = await supabase
        .from('customers_')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Cargar programas de lealtad
      const { data: programsData, error: programsError } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('customer_id', customerId)
        .order('purchase_date', { ascending: false });

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Cargar historial
      const { data: historyData, error: historyError } = await supabase
        .from('order_history')
        .select('*')
        .eq('customer_id', customerId)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setHistory(historyData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar tus datos');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('cliente_session');
    navigate('/cliente/login');
  };

  const formatMeters = (meters) => {
    return `${parseFloat(meters || 0).toFixed(2)}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus datos...</p>
        </div>
      </div>
    );
  }

  const activePrograms = programs.filter(p => (parseFloat(p.remaining_meters) || 0) > 0);
  const totalActiveMeters = activePrograms.reduce((sum, p) => sum + (parseFloat(p.remaining_meters) || 0), 0);
  const totalConsumed = programs.reduce((sum, p) => sum + (parseFloat(p.total_meters) || 0) - (parseFloat(p.remaining_meters) || 0), 0);

  // Separar programas por tipo - mejorar detección de tipo
  const dtfPrograms = activePrograms.filter(p => {
    const type = (p.type || '').toLowerCase();
    // Solo DTF que NO contenga UV
    return type.includes('dtf') && !type.includes('uv');
  });
  
  const uvPrograms = activePrograms.filter(p => {
    const type = (p.type || '').toLowerCase();
    // UV o UV DTF
    return type.includes('uv');
  });
  
  const dtfMeters = dtfPrograms.reduce((sum, p) => sum + (parseFloat(p.remaining_meters) || 0), 0);
  const uvMeters = uvPrograms.reduce((sum, p) => sum + (parseFloat(p.remaining_meters) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Mi Cuenta Momenti</h1>
            <p className="text-gray-600">Hola, {customer?.razon_social || customer?.alias}</p>
          </div>
          <button
            onClick={logout}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Resumen de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* DTF Textil */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatMeters(dtfMeters)}
            </div>
            <div className="text-gray-600 font-medium">DTF Textil</div>
            <div className="text-sm text-gray-500 mt-1">
              {dtfPrograms.length} programa(s)
            </div>
          </div>

          {/* UV */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {formatMeters(uvMeters)}
            </div>
            <div className="text-gray-600 font-medium">UV</div>
            <div className="text-sm text-gray-500 mt-1">
              {uvPrograms.length} programa(s)
            </div>
          </div>

          {/* Total Consumido */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {formatMeters(totalConsumed)}
            </div>
            <div className="text-gray-600 font-medium">Total consumido</div>
            <div className="text-sm text-gray-500 mt-1">
              {history.length} transacciones
            </div>
          </div>

          {/* Total Programas */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-2">
              {programs.length}
            </div>
            <div className="text-gray-600 font-medium">Programas totales</div>
            <div className="text-sm text-gray-500 mt-1">
              Historial completo
            </div>
          </div>
        </div>

        {/* Programas activos */}
        {activePrograms.length > 0 && (
          <div className="space-y-6 mb-8">
            {/* DTF Textil Programs */}
            {dtfPrograms.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    DTF Textil - {formatMeters(dtfMeters)} disponibles
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {dtfPrograms.map((program) => (
                      <div key={program.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800">
                              Folio {program.program_folio}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Comprado: {formatDate(program.purchase_date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {formatMeters(program.remaining_meters)}
                            </div>
                            <div className="text-sm text-gray-500">
                              de {formatMeters(program.total_meters)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="mt-3">
                          <div className="bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${((parseFloat(program.remaining_meters) || 0) / (parseFloat(program.total_meters) || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* UV Programs */}
            {uvPrograms.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    UV - {formatMeters(uvMeters)} disponibles
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {uvPrograms.map((program) => (
                      <div key={program.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800">
                              Folio {program.program_folio}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Comprado: {formatDate(program.purchase_date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-600">
                              {formatMeters(program.remaining_meters)}
                            </div>
                            <div className="text-sm text-gray-500">
                              de {formatMeters(program.total_meters)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="mt-3">
                          <div className="bg-purple-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${((parseFloat(program.remaining_meters) || 0) / (parseFloat(program.total_meters) || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historial reciente */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Historial reciente</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {history.map((record, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-800">
                        {record.type} - Folio {record.program_folio}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(record.recorded_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-800">
                        {formatMeters(record.meters_consumed)}
                      </div>
                      <div className="text-xs text-gray-500">
                        consumido
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mensaje si no hay datos */}
        {activePrograms.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-lg font-medium mb-2">No tienes programas activos</h3>
              <p className="text-gray-400">Contacta con nosotros para adquirir tu programa de lealtad</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}