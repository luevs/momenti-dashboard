import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatCurrency, calculateTotal, generateUUID, getCurrentUser } from "../utils/cashCutUtils";
import { Save, Calculator, X, CheckCircle } from "lucide-react";

export default function CorteForm({ compact = false, editCutId = null, onSaved }) {
  const [denoms, setDenoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentCutId, setCurrentCutId] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchDenominations();
    if (editCutId) loadEditCut(editCutId);
  }, []);

  useEffect(() => {
    if (editCutId) loadEditCut(editCutId);
  }, [editCutId]);

  async function loadEditCut(id) {
    setLoading(true);
    try {
      const { data: cut, error: cutErr } = await supabase
        .from('cash_cuts')
        .select('*')
        .eq('id', id)
        .single();
      if (cutErr) throw cutErr;

      const { data: items, error: itemsErr } = await supabase
        .from('cash_cut_items')
        .select('*')
        .eq('cash_cut_id', id);
      if (itemsErr) throw itemsErr;

  // map denominations to quantities (use empty string when missing so inputs can be cleared)
  const denomMap = {};
  (items || []).forEach(it => { denomMap[String(it.denomination_value)] = it.quantity; });
  setDenoms(prev => prev.map(d => ({ ...d, quantity: denomMap[String(d.value)] ?? '' })));
      setCurrentCutId(id);
      setNotes(cut.notes || "");
    } catch (err) {
      console.error("Error cargando corte:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDenominations() {
    // Si no hay denominations en la DB, usar las predefinidas
    const { data, error } = await supabase
      .from("denominations")
      .select("*")
      .eq("active", true)
      .order("value", { ascending: false });
    
    if (error || !data || data.length === 0) {
      console.warn("No se encontraron denominaciones, usando predefinidas");
      const defaultDenoms = [
        { id: 1, value: 1000, label: "$1000", type: "bill", active: true },
        { id: 2, value: 500, label: "$500", type: "bill", active: true },
        { id: 3, value: 200, label: "$200", type: "bill", active: true },
        { id: 4, value: 100, label: "$100", type: "bill", active: true },
        { id: 5, value: 50, label: "$50", type: "bill", active: true },
        { id: 6, value: 20, label: "$20", type: "bill", active: true },
        { id: 7, value: 10, label: "$10", type: "coin", active: true },
        { id: 8, value: 5, label: "$5", type: "coin", active: true },
        { id: 9, value: 2, label: "$2", type: "coin", active: true },
        { id: 10, value: 1, label: "$1", type: "coin", active: true }
      ];
      setDenoms(defaultDenoms.map(d => ({ ...d, quantity: '' })));
      return;
    }
    
    setDenoms(data.map(d => ({ ...d, quantity: '' })));
  }

  function setQty(index, qty) {
    const copy = [...denoms];
    const raw = String(qty);
    // allow clearing the field
    if (raw === '') {
      copy[index].quantity = '';
      setDenoms(copy);
      return;
    }

    // remove any non-digit characters (no decimals, no signs)
    const cleaned = raw.replace(/[^0-9]/g, '');
    copy[index].quantity = cleaned === '' ? '' : parseInt(cleaned, 10);
    setDenoms(copy);
  }

  const total = calculateTotal(denoms);

  async function handleCloseCut() {
    setLoading(true);
    try {
      const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
      
      let userId = localStorage.getItem('localUserId');
      if (!isUuid(userId)) {
        userId = generateUUID();
        localStorage.setItem('localUserId', userId);
        console.warn('Generated new localUserId for dev:', userId);
      }

      const cutDate = new Date().toISOString().slice(0, 10);
      const currentUser = getCurrentUser();

      // Crear el corte directamente usando solo las columnas disponibles en el esquema
      // Intentamos leer un register_id desde localStorage si existe en tu flujo
      let cut = null;
      try {
        const registerId = localStorage.getItem('currentRegisterId') || localStorage.getItem('registerId') || null;

        const payload = {
          user_id: userId,
          cut_date: cutDate,
          total_amount: total,
          notes: notes || null,
          draft: false
        };

        if (registerId) payload.register_id = registerId;

        const { data: cutData, error: cutError } = await supabase
          .from("cash_cuts")
          .insert([payload])
          .select()
          .single();

        if (cutError) throw cutError;
        cut = cutData;
      } catch (errInsert) {
        throw errInsert;
      }

      // Crear los items (asegurarse de enviar enteros)
      const items = denoms
        .filter(d => Number(d.quantity || 0) > 0)
        .map(d => ({
          cash_cut_id: cut.id,
          denomination_value: d.value,
          denomination_label: d.label,
          quantity: Math.trunc(Number(d.quantity || 0))
        }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("cash_cut_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

  // Reset form
  setDenoms(prev => prev.map(d => ({ ...d, quantity: '' })));
      setNotes("");
      setCurrentCutId(null);
      
      if (onSaved) onSaved();
      alert(`Corte cerrado exitosamente. Total: ${formatCurrency(total)}`);

    } catch (err) {
      console.error("Error al cerrar corte:", err);
      alert("Error al cerrar el corte: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setDenoms(prev => prev.map(d => ({ ...d, quantity: '' })));
    setNotes("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${compact ? 'p-3' : 'p-6'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-gray-800`}>Contar Efectivo</h2>
        <Calculator className="text-gray-400" size={compact ? 18 : 24} />
      </div>

      <div className={`${compact ? 'mb-4' : 'mb-6'}`}>
        <div className="overflow-y-auto max-h-[56vh] space-y-2">
        {denoms.map((denom, index) => (
          <div key={denom.id || index} className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} bg-gray-50 rounded-lg`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${denom.type === 'bill' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              <span className={`${compact ? 'text-sm' : 'font-medium text-gray-700'}`}>{denom.label}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="number"
                inputMode="numeric"
                pattern="\d*"
                step="1"
                min="0"
                value={denom.quantity === '' ? '' : denom.quantity}
                onChange={(e) => setQty(index, e.target.value)}
                onKeyDown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                className={`${compact ? 'w-16 px-1 py-1 text-sm' : 'w-20 px-2 py-1'} border border-gray-300 rounded text-center`}
                placeholder=""
              />
              <span className={`text-sm text-gray-500 ${compact ? 'w-16' : 'w-20'} text-right`}>
                = {formatCurrency((Number(denom.quantity) || 0) * (Number(denom.value) || 0))}
              </span>
            </div>
          </div>
        ))}
      </div>

      </div>

      <div className="border-t sticky bottom-0 bg-white p-3"> 
        <div className={`${compact ? 'flex items-center justify-between mb-0' : 'flex justify-between items-center mb-0'}`}>
          <span className={`${compact ? 'text-sm font-medium' : 'text-lg font-semibold text-gray-700'}`}>Total:</span>
          <span className={`${compact ? 'text-lg font-bold text-green-600' : 'text-2xl font-bold text-green-600'}`}>{formatCurrency(total)}</span>
        </div>

        <div className="flex space-x-3 mt-2">
          <button
            onClick={handleCloseCut}
            disabled={loading || total === 0}
            className={`${compact ? 'flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded flex items-center justify-center space-x-2 text-sm' : 'flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2'}`}
          >
            <CheckCircle size={compact ? 14 : 16} />
            <span>{compact ? 'Cerrar' : 'Cerrar Corte'}</span>
          </button>
          
          <button
            onClick={handleClear}
            disabled={loading}
            className={`${compact ? 'bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center justify-center space-x-2' : 'bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2'}`}
          >
            <X size={compact ? 14 : 16} />
            <span>{compact ? 'Limpiar' : 'Limpiar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
