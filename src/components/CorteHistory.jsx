import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CorteDetailModal from "./CorteDetailModal";
import { formatCurrency, formatDate, formatDateShort } from "../utils/cashCutUtils";
import { Eye, Edit, Trash2, Clock, CheckCircle } from "lucide-react";

export default function CorteHistory({ onEdit, compact = false }) {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCut, setSelectedCut] = useState(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    loadCuts();
    const handler = () => loadCuts();
    window.addEventListener('corte:changed', handler);
    return () => window.removeEventListener('corte:changed', handler);
  }, []);

  async function loadCuts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cash_cuts")
        .select(`
          *,
          cash_cut_items (
            denomination_value,
            denomination_label,
            quantity
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit || 10);
      
      if (error) throw error;
      setCuts(data || []);
    } catch (err) {
      console.error("Error cargando cortes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(cutId) {
    if (!confirm('¿Estás seguro de eliminar este corte?')) return;
    
    try {
      // Eliminar items primero
      await supabase
        .from('cash_cut_items')
        .delete()
        .eq('cash_cut_id', cutId);

      // Eliminar el corte
      const { error } = await supabase
        .from('cash_cuts')
        .delete()
        .eq('id', cutId);

      if (error) throw error;

      loadCuts();
      alert('Corte eliminado exitosamente');
    } catch (err) {
      console.error("Error eliminando corte:", err);
      alert('Error al eliminar el corte: ' + err.message);
    }
  }

  const calculateCutTotal = (cut) => {
    if (cut.total_amount) return cut.total_amount;
    if (cut.cash_cut_items) {
      return cut.cash_cut_items.reduce((sum, item) => sum + (item.subtotal || (item.quantity * item.denomination_value)), 0);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${compact ? 'p-2' : 'p-3'}`}>
      <div className={`flex items-center justify-between mb-2` }>
        <h2 className={`text-${compact ? 'sm' : 'lg'} font-semibold text-gray-800`}>Historial de Cortes</h2>
        <Clock className="text-gray-400" size={compact ? 18 : 20} />
      </div>

      {cuts.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Clock size={40} className="mx-auto mb-2 opacity-50" />
          <p>No hay cortes registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={`text-${compact ? 'xs' : 'sm'} text-gray-600 mb-2`}>
            Mostrando {cuts.length} cortes recientes
          </div>
          
          {cuts.map(cut => {
            const total = calculateCutTotal(cut);
            const isDraft = cut.draft;
            
            return (
              <div key={cut.id} className={`border border-gray-200 rounded-md ${compact ? 'p-1' : 'p-2'} hover:bg-gray-50`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`flex items-center space-x-2 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                      <div className={`flex items-center space-x-1 ${isDraft ? 'text-amber-600' : 'text-green-600'}`}>
                        {isDraft ? <Clock size={compact ? 12 : 14} /> : <CheckCircle size={compact ? 12 : 14} />}
                        <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                          {isDraft ? 'Borrador' : 'Cerrado'}
                        </span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{formatDateShort(cut.created_at)}</span>
                    </div>
                    
                    <div className={`text-xs text-gray-600 ${compact ? 'truncate' : ''}`}>{cut.notes || 'Sin observaciones'}</div>
                  </div>

                  <div className="text-right ml-3">
                    <div className={`${compact ? 'text-sm font-medium' : 'text-md font-semibold'} text-gray-800 mb-1`}>{formatCurrency(total)}</div>
                    <div className="flex space-x-1">
                      <button onClick={() => setSelectedCut(cut)} className={`bg-blue-600 hover:bg-blue-700 text-white ${compact ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded flex items-center space-x-1`}>
                        <Eye size={compact ? 12 : 12} />
                        <span>Ver</span>
                      </button>
                      {isDraft && (
                        <button onClick={() => onEdit && onEdit(cut.id)} className={`bg-yellow-500 hover:bg-yellow-600 text-white ${compact ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded flex items-center space-x-1`}>
                          <Edit size={12} />
                          <span>Editar</span>
                        </button>
                      )}
                      <button onClick={() => handleDelete(cut.id)} className={`bg-red-600 hover:bg-red-700 text-white ${compact ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded flex items-center space-x-1`}>
                        <Trash2 size={12} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-center">
            <button onClick={() => { setLimit(prev => prev + 10); loadCuts(); }} className="text-sm text-blue-600 hover:underline">Mostrar más</button>
          </div>
        </div>
      )}

      {selectedCut && (
        <CorteDetailModal cut={selectedCut} onClose={() => setSelectedCut(null)} />
      )}
    </div>
  );
}
