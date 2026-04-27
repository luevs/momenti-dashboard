import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, User, Trash2, Edit, History, Clock, Calendar, FileText, SlidersHorizontal, LayoutGrid, Table2, Users, Sparkles, Ruler, Search, Key, Download } from "lucide-react";
import { supabase } from "../supabaseClient";
import useCurrentUser from '../utils/useCurrentUser';
import { generateTicketHTML } from '../utils/ticketUtils';
import { getNextProgramFolio, generateRandomFolio3 } from '../utils/folioUtils';
import ClienteCredentialsManager from '../components/ClienteCredentialsManager';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";
import LoyaltyTicket from "../components/LoyaltyTicket";
import CustomerLoyaltyCard from '../components/CustomerLoyaltyCard';
import CustomerLoyaltyTable from '../components/CustomerLoyaltyTable';

// Colores para el estado
const estadoColores = {
  activo: "bg-green-100 text-green-800",
  expirado: "bg-red-100 text-red-800",
};

// Función para determinar el estado visual
const getClientStatus = (remainingMeters, totalMeters) => {
  if (remainingMeters <= 0) {
    return 'expirado';
  }
  const remainingPercentage = (remainingMeters / totalMeters) * 100;
  return 'activo';
};

// Formato de fecha tolerante a distintos formatos y sin desfasar fechas tipo YYYY-MM-DD
const formatDate = (dateInput, options = {}) => {
  const { useUTC = false } = options;
  if (!dateInput) return 'Fecha no disponible';

  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const value = dateInput instanceof Date ? dateInput : dateInput.toString().trim();

  // Caso YYYY-MM-DD (Supabase DATE) ⇒ crear fecha en zona local para evitar desface
  const isoDateOnlyMatch = typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoDateOnlyMatch) {
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return `${localDate.getDate()} ${meses[localDate.getMonth()]} ${localDate.getFullYear()}`;
  }

  // ISO con tiempo (ej. 2025-10-03T10:38:00Z) o similar
  const isoDateTimeMatch = typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (isoDateTimeMatch) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const day = useUTC ? date.getUTCDate() : date.getDate();
      const monthName = useUTC ? meses[date.getUTCMonth()] : meses[date.getMonth()];
      const year = useUTC ? date.getUTCFullYear() : date.getFullYear();
      const hoursRaw = useUTC ? date.getUTCHours() : date.getHours();
      const minutes = (useUTC ? date.getUTCMinutes() : date.getMinutes()).toString().padStart(2, '0');
      const hours = hoursRaw;
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
      const hour12 = hours % 12 === 0 ? 12 : hours % 12;
      return `${day} ${monthName} ${year}, ${hour12}:${minutes} ${ampm}`;
    }
  }

  // Intento estándar con Date
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const day = useUTC ? parsed.getUTCDate() : parsed.getDate();
    const monthName = useUTC ? meses[parsed.getUTCMonth()] : meses[parsed.getMonth()];
    const year = useUTC ? parsed.getUTCFullYear() : parsed.getFullYear();
    return `${day} ${monthName} ${year}`;
  }

  // dd-mm-yyyy o dd/mm/yyyy
  if (typeof value === 'string' && (value.includes('-') || value.includes('/'))) {
    const separator = value.includes('-') ? '-' : '/';
    const parts = value.split(separator);
    if (parts.length === 3) {
      const cleanParts = parts.map(str => str.replace(/\D/g, ''));
      if (cleanParts[0].length === 4) {
        const [year, month, day] = cleanParts.map(Number);
        if (year && month) {
          const localDate = new Date(year, month - 1, day || 1);
          return `${localDate.getDate()} ${meses[localDate.getMonth()]} ${localDate.getFullYear()}`;
        }
      } else {
        const [day, month, year] = cleanParts.map(Number);
        if (year && month) {
          return `${day} ${meses[month - 1]} ${year}`;
        }
      }
    }
  }

  return value.toString();
};

// Usar hook centralizado para obtener el usuario actual
// (fallbacks handled in the hook)

function getExpiringThreshold(totalMeters) {
  if (totalMeters <= 5) return 0.5;
  if (totalMeters > 5 && totalMeters <= 10) return 0.333;
  if (totalMeters > 10 && totalMeters <= 30) return 0.2;
  return 0.1;
}

export default function ClientesLealtad() {
  const currentUser = useCurrentUser();
  // Helper centralizado para obtener un nombre identificable del usuario actual
  const getCurrentUser = () => (currentUser?.name || currentUser?.email || 'Sistema');
  const [allClients, setAllClients] = useState([]);
  const [clientes, setClientes] = useState([]); // filtrados por tipo
  const [customersWithPrograms, setCustomersWithPrograms] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState([]); // Para controlar qué cards están expandidas
  const [isLoading, setIsLoading] = useState(true);
  
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", type: "", totalMeters: "", numeroWpp: "", lastPurchase: "" });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState([]);
  const [deletorName, setDeletorName] = useState("");
  const deleteReasonsList = ["Error de captura", "Cliente inactivo", "Solicitud del cliente", "Cierre de negocio"];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showExpiringClients, setShowExpiringClients] = useState(false);

  // Estados para el modal de edición
  const [editClientModalOpen, setEditClientModalOpen] = useState(false);
  const [editingClientData, setEditingClientData] = useState(null);

  // Estados para el historial
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState(null);
  
  // Estados para modales de registro
  const [observaciones, setObservaciones] = useState("");
  const [registeredBy, setRegisteredBy] = useState(() => currentUser?.name || currentUser?.email || 'Sistema');
  const [registeredByCustom, setRegisteredByCustom] = useState("");
  const [autorizacionCliente, setAutorizacionCliente] = useState(false);

  // Nuevos estados para el historial global
  const [globalHistoryModalOpen, setGlobalHistoryModalOpen] = useState(false);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [isLoadingGlobalHistory, setIsLoadingGlobalHistory] = useState(false);

  // Estados para el modal de pedido mejorado
  const [postPedidoModalOpen, setPostPedidoModalOpen] = useState(false);
  const [ultimoPedidoGuardado, setUltimoPedidoGuardado] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  const [activeTab, setActiveTab] = useState("clientes"); // "clientes" o "historial"

  // NUEVOS ESTADOS PARA EL TICKET
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Estados adicionales
  const [signatureData, setSignatureData] = useState("");
  const signatureRef = React.useRef();

  const [selectedType, setSelectedType] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos'); // 'Todos', 'Activos', 'Históricos'
  const [viewMode, setViewMode] = useState('cards');
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = React.useRef(null);
  
  // Estados para filtros temporales y vista de movimientos
  const [periodFilter, setPeriodFilter] = useState('hoy'); // 'hoy', 'ayer', 'semana', 'mes', 'todo'
  const [showMovementsPanel, setShowMovementsPanel] = useState(false);
  const [movementsData, setMovementsData] = useState([]);

  // Estados para el modal de registro por programa (faltaban, restaurados)
  const [registerMetersModalOpen, setRegisterMetersModalOpen] = useState(false);
  const [selectedCustomerForMeters, setSelectedCustomerForMeters] = useState(null);
  const [selectedTypeForMeters, setSelectedTypeForMeters] = useState('');
  const [activePrograms, setActivePrograms] = useState([]);
  const [metersToRegister, setMetersToRegister] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [isSubmittingMeters, setIsSubmittingMeters] = useState(false);
  const isSubmittingMetersRef = React.useRef(false);

  // Estados para el pokayoke de duplicados
  const [duplicateWarningModalOpen, setDuplicateWarningModalOpen] = useState(false);
  const [previousTodayRecord, setPreviousTodayRecord] = useState(null);
  const [pendingSubmission, setPendingSubmission] = useState(null);

  // Función para abrir modal de registro de metros (invocada desde CustomerLoyaltyCard)
  // customerOrId can be either a customer object or an id
  const handleRegisterMeters = (customerOrId, type, programs) => {
    console.log('🔍 handleRegisterMeters called with:', { customerOrId, type, programs });
    console.log('📋 Current customersWithPrograms:', customersWithPrograms);
    
    let customer = null;
    
    // Caso 1: customerOrId es un objeto cliente completo
    if (customerOrId && typeof customerOrId === 'object' && customerOrId.id) {
      console.log('✅ Customer passed as object');
      customer = customerOrId;
    } 
    // Caso 2: customerOrId es solo un ID
    else {
      console.log('🔍 Searching for customer by ID:', customerOrId);
      customer = customersWithPrograms.find(c => {
        const match = String(c.id) === String(customerOrId);
        console.log(`Comparing ${c.id} === ${customerOrId}: ${match}`);
        return match;
      });
      
      if (!customer) {
        console.log('❌ Customer not found by ID, trying alternative search');
        // defensive: try to find by program customer reference if programs provided
        if (programs && programs.length > 0 && programs[0].customer_id) {
          customer = customersWithPrograms.find(c => String(c.id) === String(programs[0].customer_id));
          console.log('🔍 Alternative search result:', customer);
        }
      }
    }

    if (!customer) {
      console.error('❌ No customer found after all attempts');
      console.log('Available customer IDs:', customersWithPrograms.map(c => c.id));
      alert('No se encontró el cliente para registrar metros. Refresca la lista e intenta de nuevo.');
      return;
    }

    console.log('✅ Customer found:', customer);

    setSelectedCustomerForMeters(customer);
    setSelectedTypeForMeters(type);
    setActivePrograms(programs || []);
    setSelectedProgramId((programs && programs[0] && programs[0].id) ? programs[0].id : '');
    setMetersToRegister('');
    isSubmittingMetersRef.current = false;
    setIsSubmittingMeters(false);
    setRegisterMetersModalOpen(true);
  };

  // Función para verificar si ya hay registros del mismo programa hoy
  const checkTodayDuplicates = async (programId, customerId) => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Buscar en orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('program_id', programId)
        .gte('recorded_at', todayStart.toISOString())
        .lte('recorded_at', todayEnd.toISOString())
        .order('recorded_at', { ascending: false });

      if (ordersError) {
        console.warn('Error checking orders:', ordersError);
      }

      // Buscar en order_history
      const { data: historyData, error: historyError } = await supabase
        .from('order_history')
        .select('*')
        .eq('program_id', programId)
        .gte('recorded_at', todayStart.toISOString())
        .lte('recorded_at', todayEnd.toISOString())
        .order('recorded_at', { ascending: false });

      if (historyError) {
        console.warn('Error checking order_history:', historyError);
      }

      // Combinar resultados
      const allRecords = [...(ordersData || []), ...(historyData || [])];
      
      // Ordenar por fecha más reciente primero
      allRecords.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
      
      return allRecords.length > 0 ? allRecords[0] : null;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return null;
    }
  };

  // Manejar el envío del formulario de registro por programa
  const handleSubmitMeters = async (e, bypassDuplicateCheck = false) => {
    e.preventDefault();

    if (isSubmittingMetersRef.current) {
      // Prevent duplicate submissions triggered by double clicks / press
      return;
    }

    if (!selectedCustomerForMeters) {
      console.error('handleSubmitMeters called but selectedCustomerForMeters is null');
      alert('No se encontró el cliente seleccionado. Cierra el modal y vuelve a intentar.');
      return;
    }

    if (!selectedProgramId || !metersToRegister) {
      alert("Por favor, completa todos los campos");
      return;
    }

    const metersUsed = parseFloat(metersToRegister);
    if (metersUsed <= 0) {
      alert("Los metros deben ser mayor a 0");
      return;
    }

    const selectedProgram = activePrograms.find(p => String(p.id) === String(selectedProgramId));
    if (!selectedProgram) {
      alert("Programa no encontrado");
      return;
    }

    if (metersUsed > selectedProgram.remaining_meters) {
      alert(`No puedes registrar más metros de los disponibles (${selectedProgram.remaining_meters}m)`);
      return;
    }

    // Validaciones adicionales
    if (!registeredBy || registeredBy === '') {
      alert('Por favor selecciona quién registra el pedido.');
      return;
    }
    if (registeredBy === 'Otro' && !registeredByCustom.trim()) {
      alert('Por favor ingresa el nombre en "Otro"');
      return;
    }
    if (!autorizacionCliente) {
      alert('Por favor, confirma la autorización del cliente.');
      return;
    }

    // 🛡️ POKAYOKE: Verificar duplicados del mismo día (solo si no viene de confirmación)
    if (!bypassDuplicateCheck) {
      const todayRecord = await checkTodayDuplicates(selectedProgramId, selectedCustomerForMeters.id);
      
      if (todayRecord) {
        // Hay un registro previo hoy - mostrar modal de confirmación
        setPreviousTodayRecord(todayRecord);
        setPendingSubmission({ metersUsed, selectedRegisteredBy: registeredBy === 'Otro' ? registeredByCustom.trim() : registeredBy });
        setDuplicateWarningModalOpen(true);
        return; // Detener el proceso hasta que el usuario confirme
      }
    }

    try {
      isSubmittingMetersRef.current = true;
      setIsSubmittingMeters(true);
      
      // 🔥 OBTENER VALOR ACTUAL DE LA BASE DE DATOS (NO CONFIAR EN selectedProgram)
      console.log("🔥 OBTENIENDO REMAINING METERS ACTUAL DE LA BASE DE DATOS...");
      
      const { data: programData, error: fetchError } = await supabase
        .from('loyalty_programs')
        .select('remaining_meters, total_meters, status')
        .eq('id', selectedProgramId)
        .single();
      
      if (fetchError || !programData) {
        console.error("Error al obtener programa:", fetchError);
        alert("Error al consultar el programa: " + (fetchError?.message || 'Programa no encontrado'));
        return;
      }
      
      // Usar el remaining_meters ACTUAL de la base de datos
      const currentRemaining = Number(programData.remaining_meters) || 0;
      console.log(`🔥 Remaining REAL en DB: ${currentRemaining}m`);
      console.log(`🔥 Metros a consumir ahora: ${metersUsed}m`);
      
      // Calcular nuevo remaining: ACTUAL - CONSUMO
      const newRemainingMeters = Number((currentRemaining - metersUsed).toFixed(2));
      console.log(`🔥 NUEVO remaining: ${newRemainingMeters}m`);
      
      const newStatus = newRemainingMeters <= 0 ? 'completado' : 'activo';
      const completionDate = newRemainingMeters <= 0 ? new Date().toISOString().split('T')[0] : null;

      // 1) Actualizar loyalty_programs
      const { error: loyaltyError } = await supabase
        .from('loyalty_programs')
        .update({
          remaining_meters: newRemainingMeters,
          status: newStatus,
          completion_date: completionDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProgramId);

      if (loyaltyError) {
        console.error("Error al actualizar loyalty_programs:", loyaltyError);
        alert("Error al registrar metros: " + loyaltyError.message);
        return;
      }

      // 2) Guardar en historial (intenta 'orders' y si falla intenta 'order_history')
      const selectedRegisteredBy = registeredBy === 'Otro' ? registeredByCustom.trim() : registeredBy;
      const orderRecord = {
        // include both possible client id fields to match your schema
  client_id: selectedCustomerForMeters.id,
  customer_id: selectedCustomerForMeters.id,
  client_name: selectedCustomerForMeters.razon_social || selectedCustomerForMeters.name,
        program_id: selectedProgramId,
        program_number: selectedProgram.program_number,
  program_folio: selectedProgram.program_folio || null,
        remaining_meters: newRemainingMeters,
        type: selectedTypeForMeters,
        meters_consumed: Number(metersUsed.toFixed ? metersUsed.toFixed(2) : metersUsed),
        unit: 'metros',
        status: 'completado',
        recorded_at: new Date(new Date().getTime() - (6 * 60 * 60 * 1000)).toISOString(),
        recorded_by: selectedRegisteredBy,
        observaciones: observaciones?.trim() || '',
        signature: null
      };

      // Reemplaza la sección de insert en handleSubmitMeters por esta
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .insert([orderRecord])
          .select();
        console.log('orders insert response', { data: ordersData, error: ordersError });

        if (ordersError) {
          console.warn("orders insert failed, trying order_history:", ordersError);
          // Build a payload that matches the order_history schema to avoid sending unknown columns (e.g., folio)
          const historyPayload = {
            client_id: orderRecord.client_id,
            client_name: orderRecord.client_name,
            type: orderRecord.type,
            meters_consumed: orderRecord.meters_consumed,
            recorded_at: orderRecord.recorded_at,
            recorded_by: orderRecord.recorded_by,
            observaciones: orderRecord.observaciones,
            signature: orderRecord.signature,
            customer_id: orderRecord.customer_id,
            program_id: orderRecord.program_id,
            program_folio: orderRecord.program_folio,
            remaining_meters: orderRecord.remaining_meters
          };

          const { data: histData, error: histError } = await supabase
            .from('order_history')
            .insert([historyPayload])
            .select();

          console.log('order_history insert response', { data: histData, error: histError });
          if (histError) {
            // muestra el error concreto al usuario y lanza para entrar en el catch
            alert('Error guardando historial: ' + (histError.message || JSON.stringify(histError)));
            throw histError;
          }
        }
      } catch (err) {
        console.error("Error insertando en history/orders:", err);
        alert("Error guardando historial: " + (err.message || JSON.stringify(err)));
        throw err;
      }

      // ✅ YA NO RECALCULAMOS - CONFIAMOS EN EL VALOR ACTUAL DE remaining_meters
      console.log('✅ Remaining meters actualizado correctamente a:', newRemainingMeters);

      // 3) Preparar datos para modal Post-Pedido
  // Usar folio de 3 dígitos consistente para tickets
  const generatedFolio = generateRandomFolio3();
  const programFolio = selectedProgram.program_folio || String(generatedFolio);
      const ticketInfo = {
        client: {
          id: selectedCustomerForMeters.id,
          name: selectedCustomerForMeters.razon_social,
          type: selectedTypeForMeters,
          totalMeters: selectedProgram.total_meters,
          remainingMeters: newRemainingMeters,
          celular: selectedCustomerForMeters.celular || '', // ✅ Agregar celular del cliente
          loyaltyProgramPhone: selectedProgram.numero_wpp || selectedCustomerForMeters.celular || '', // ✅ Usar loyaltyProgramPhone
          programFolio
        },
        order: {
          folio: generatedFolio,
          programFolio,
          metersConsumed: metersUsed,
          recordedAt: new Date(new Date().getTime() - (6 * 60 * 60 * 1000)).toISOString(),
          recordedBy: selectedRegisteredBy,
          observaciones: orderRecord.observaciones || ''
        }
      };

      setUltimoPedidoGuardado({
        customerName: ticketInfo.client.name,
        metros: Number(metersUsed.toFixed ? metersUsed.toFixed(2) : metersUsed),
        type: selectedTypeForMeters,
        registeredBy: ticketInfo.order.recordedBy || 'Sistema',
        programFolio
      });

      setTicketData(ticketInfo);

      // 4) Cerrar modal y limpiar
      setRegisterMetersModalOpen(false);
      setMetersToRegister('');
      setSelectedProgramId('');
      setAutorizacionCliente(false);
      setRegisteredBy(getCurrentUser());
      setRegisteredByCustom('');
      setPostPedidoModalOpen(true);

      // 5) Recargar datos
      fetchCustomersWithPrograms();

    } catch (error) {
      console.error("Error inesperado al registrar metros:", error);
      alert("Error inesperado al registrar metros");
    } finally {
      setIsSubmittingMeters(false);
      isSubmittingMetersRef.current = false;
    }
  };

  // Función para confirmar y proceder con el registro a pesar del duplicado
  const handleConfirmDuplicate = () => {
    setDuplicateWarningModalOpen(false);
    // Crear un evento sintético para pasarlo a handleSubmitMeters
    const syntheticEvent = { preventDefault: () => {} };
    handleSubmitMeters(syntheticEvent, true); // bypassDuplicateCheck = true
  };

  // Función para cancelar el registro duplicado
  const handleCancelDuplicate = () => {
    setDuplicateWarningModalOpen(false);
    setPreviousTodayRecord(null);
    setPendingSubmission(null);
  };

  // Helpers para post-pedido: generar ticket, enviar WhatsApp y cerrar modal
  const handleGenerateTicket = () => {
    if (!ticketData) return;
    // Use centralized ticket util to generate HTML (includes signature if available)
    try {
      const html = generateTicketHTML(ticketData, signatureData || null);
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      w.print();
    } catch (err) {
      console.error('Error generando ticket con ticketUtils:', err);
      alert('No se pudo generar el ticket. Revisa la consola.');
    }
  };

  const handleSendWhatsApp = () => {
    if (!ticketData) return;
    const cliente = ticketData.client || {};
    const pedido = ticketData.order || {};
    const tipo = ticketData.client?.type || '';
    const fecha = pedido.recordedAt ? new Date(pedido.recordedAt).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');
    const metros = pedido.metersConsumed || 0;
    const restantes = ticketData.client?.remainingMeters ?? '';
  // Prefer the canonical program folio stored on the client/program record
  // (support both camelCase and snake_case), then fall back to the order folio.
  const programFolioRaw = cliente.programFolio || cliente.program_folio || pedido.programFolio || pedido.program_folio || '';
  const formatFolio = (f) => {
    if (!f && f !== 0) return '';
    const s = String(f).trim();
    const groups = s.split(/[^0-9]+/).filter(Boolean);
    const last = groups.length > 0 ? groups[groups.length - 1] : s;
    return last.length >= 3 ? last.slice(-3) : last.padStart(3, '0');
  };
  const programFolio = formatFolio(programFolioRaw);

    console.log('📊 WhatsApp Message Data:', {
      cliente,
      pedido,
      tipo,
      fecha,
      metros,
      restantes,
      fullTicketData: ticketData
    });

    // ✅ SIEMPRE usar customers_.celular (intentar varias claves)
    const phoneRaw = cliente?.celular || cliente?.numeroWpp || cliente?.numero_wpp || cliente?.loyaltyProgramPhone || '';
    const phone = String(phoneRaw || '').replace(/\D/g, '').trim();
    console.log('📱 WhatsApp phone source (post-pedido):', { phoneRaw, phone, clientData: cliente });

    if (!phone) {
      alert('No hay número de WhatsApp registrado en el programa de lealtad. Revisa el dato del cliente.');
      return;
    }
    // Phone sanity check: must be reasonably long (country+number). If clearly invalid, show details.
    if (phone.length < 8) {
      alert(`Número de WhatsApp inválido: "${phoneRaw}" (normalizado: "${phone}"). Corrige el número antes de enviar.`);
      return;
    }

  const metrosTxt = typeof metros === 'number' ? metros.toFixed(2) : metros;
  const restantesTxt = typeof restantes === 'number' ? restantes.toFixed(2) : restantes;
  // Temporarily remove folio line for debugging (it caused failures for some phones)
  const message = `Saludos ${cliente.name}\nLe informamos que su pedido de ${tipo} ya está listo para que pase por el.\nEl día ${fecha} consumiste ${metrosTxt} metros de tu programa de lealtad ${tipo}. Te quedan ${restantesTxt} metros en tu plan. ¡Gracias por tu preferencia!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    console.log('🔗 Generando enlace WhatsApp (post-pedido):', url);
    try {
      const opened = window.open(url, '_blank');
      if (!opened) {
        // Popup blocked, fallback to navigating the page
        console.warn('window.open fue bloqueado, redirigiendo a la URL');
        window.location.href = url;
      }
    } catch (err) {
      console.error('Error al abrir el enlace de WhatsApp:', err);
      window.location.href = url;
    }
  };

    // Enviar WhatsApp para un programa específico
    const handleProgramWhatsApp = (customer, program) => {
      console.log('handleProgramWhatsApp called with:', { customer, program });
      // Use the same WhatsApp template as post-pedido
      const nombre = customer?.razon_social || customer?.name || '';
      const phoneRaw = customer?.celular || customer?.numeroWpp || customer?.numero_wpp || program?.numero_wpp || '';
      const phone = String(phoneRaw || '').replace(/\D/g, '').trim();
      console.log('📱 WhatsApp phone source (program):', { phoneRaw, phone, customer, program });
      if (!phone) {
        alert('No hay número válido para enviar WhatsApp. Revisa el cliente y el programa.');
        return;
      }
      if (phone.length < 8) {
        alert(`Número de WhatsApp inválido: "${phoneRaw}" (normalizado: "${phone}").`);
        return;
      }

      const tipo = program?.type || customer?.type || '';
      const fecha = program?.purchase_date ? new Date(program.purchase_date).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');
      const metrosConsumidos = Number(((program?.total_meters || 0) - (program?.remaining_meters || 0)).toFixed(2));
      const metrosRestantes = Number((program?.remaining_meters || 0).toFixed(2));
  const programFolioRaw = program?.program_folio || program?.programFolio || customer?.programFolio || customer?.program_folio || '';
  const programFolio = (f => {
    if (!f && f !== 0) return '';
    const s = String(f).trim();
    const groups = s.split(/[^0-9]+/).filter(Boolean);
    const last = groups.length > 0 ? groups[groups.length - 1] : s;
    return last.length >= 3 ? last.slice(-3) : last.padStart(3, '0');
  })(programFolioRaw);

  // Temporarily remove folio line for debugging
  const message = `Saludos ${nombre}\nLe informamos que su pedido de ${tipo} ya está listo para que pase por el.\nEl día ${fecha} consumiste ${metrosConsumidos.toFixed(2)} metros de tu programa de lealtad ${tipo}. Te quedan ${metrosRestantes.toFixed(2)} metros en tu plan. ¡Gracias por tu preferencia!`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      console.log('🔗 Generando enlace WhatsApp (program):', url);
      try {
        const opened = window.open(url, '_blank');
        if (!opened) {
          console.warn('window.open fue bloqueado, redirigiendo a la URL (program)');
          window.location.href = url;
        }
      } catch (err) {
        console.error('Error al abrir el enlace de WhatsApp (program):', err);
        window.location.href = url;
      }
      // NOTE: no llamar window.open nuevamente aquí (ya intentamos arriba).
    };

    // Imprimir ticket resumen para un programa específico
    const handleProgramPrintTicket = (customer, program) => {
      console.log('handleProgramPrintTicket called with:', { customer, program });
      // Build canonical ticketData and use generateTicketHTML to open a print window
      const ticketInfo = {
        client: {
          id: customer?.id,
          name: customer?.razon_social || customer?.name || '',
          type: program?.type || customer?.type || '',
          totalMeters: program?.total_meters || customer?.totalMeters || 0,
          remainingMeters: program?.remaining_meters || customer?.remainingMeters || 0,
          celular: customer?.celular || '',
          numeroWpp: customer?.celular || program?.numero_wpp || customer?.numeroWpp || '',
          programFolio: program?.program_folio || ''
        },
        order: {
          metersConsumed: Number(((program?.total_meters || 0) - (program?.remaining_meters || 0)).toFixed(2)),
          registeredBy: getCurrentUser(),
          observaciones: `Resumen del programa #${program?.program_number || ''}`,
          recordedAt: new Date().toISOString(),
          folio: generateRandomFolio3(),
          programFolio: program?.program_folio || ''
        }
      };

      // Instead of opening a new window (which may be blocked), open the preview modal so the user can print from there.
      setTicketData(ticketInfo);
      setTicketModalOpen(true);
    };

  const closePostPedidoModal = () => {
    setPostPedidoModalOpen(false);
    setTicketData(null);
    setUltimoPedidoGuardado(null);
  };

  // 1. Solo una función para traer todos los clientes
  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('loyalty_clients')
      .select('*');
    if (error) {
      console.error("Error al obtener clientes:", error);
    } else {
      setAllClients(data);
    }
    setIsLoading(false);
  };

  // Reemplazar la función fetchClients por esta nueva función
  const fetchCustomersWithPrograms = async () => {
    setIsLoading(true);
    try {
      // 1. OBTENER PROGRAMAS DIRECTAMENTE DE loyalty_programs
      const { data: programsData, error: programsError } = await supabase
        .from('loyalty_programs')
        .select('*');

      if (programsError) {
        console.error("Error al obtener programas:", programsError);
        setCustomersWithPrograms([]);
        return;
      }

      // 2. OBTENER CLIENTES que tienen esos programas
      const customerIds = [...new Set(programsData.map(p => p.customer_id))];
      const { data: customersData, error: customersError } = await supabase
        .from('customers_')
        .select('*')
        .in('id', customerIds);

      if (customersError) {
        console.error("Error al obtener clientes:", customersError);
        setCustomersWithPrograms([]);
        return;
      }

      // 3. OBTENER ORDER_HISTORY para recalcular metros consumidos por program_folio
      const { data: orderHistoryData, error: historyError } = await supabase
        .from('order_history')
        .select('customer_id, program_folio, meters_consumed')
        .in('customer_id', customerIds);

      if (historyError) {
        console.error("Error al obtener order_history:", historyError);
      }

      // 4. CALCULAR METROS CONSUMIDOS POR PROGRAM_FOLIO
      const consumedByFolio = {};
      if (orderHistoryData) {
        orderHistoryData.forEach(order => {
          const folio = order.program_folio;
          const customerId = order.customer_id;
          const consumed = parseFloat(order.meters_consumed) || 0;
          
          if (folio) {
            const key = `${customerId}-${folio}`;
            consumedByFolio[key] = (consumedByFolio[key] || 0) + consumed;
          }
        });
      }

      console.log("🔥 Metros consumidos por folio:", consumedByFolio);
      console.log("Programas encontrados:", programsData?.length || 0);
      console.log("Clientes encontrados:", customersData?.length || 0);
      
      // 5. COMBINAR CLIENTES CON SUS PROGRAMAS - USAR VALORES REALES DE SUPABASE
      const customersWithProgramsData = customersData.map(customer => {
        const customerPrograms = programsData.filter(p => p.customer_id === customer.id).map(program => {
          // USAR EL VALOR REAL DE SUPABASE, NO RECALCULAR
          const realRemainingMeters = parseFloat(program.remaining_meters) || 0;
          const folioKey = `${customer.id}-${program.program_folio}`;
          const consumedFromHistory = consumedByFolio[folioKey] || 0;
          const totalMeters = parseFloat(program.total_meters) || 0;
          
          console.log(`🔥 Programa ${program.program_folio}: real_remaining=${realRemainingMeters}, total=${totalMeters}, consumed_history=${consumedFromHistory}`);
          
          return {
            ...program,
            remaining_meters: realRemainingMeters, // ✅ USAR EL VALOR REAL DE SUPABASE
            consumed_from_history: consumedFromHistory // Para debugging
          };
        });
        
        const groupedPrograms = groupProgramsByType(customerPrograms);
        
        return {
          id: customer.id,
          razon_social: customer.razon_social,
          alias: customer.alias,
          celular: customer.celular,
          email: customer.email,
          direccion: customer.direccion,
          name: customer.razon_social,
          programs: groupedPrograms, // ¡USAR GROUPED PROGRAMS!
          groupedPrograms,
          totalActiveMeters: calculateTotalActiveMeters(customerPrograms),
          totalPrograms: customerPrograms.length,
          activePrograms: customerPrograms.filter(p => p.status === 'activo').length,
        };
      });

      console.log("✅ Clientes procesados:", customersWithProgramsData.length);
      console.log("🔍 Ejemplo de cliente procesado:", customersWithProgramsData[0]);
      setCustomersWithPrograms(customersWithProgramsData);
    } catch (error) {
      console.error("Error inesperado:", error);
      setCustomersWithPrograms([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función auxiliar para agrupar programas por tipo
  const groupProgramsByType = (programs) => {
    return programs.reduce((acc, program) => {
      if (!acc[program.type]) {
        acc[program.type] = {
          active: [],
          historical: []
        };
      }
      
      // MODIFICADO: Considerar activo si tiene saldo restante > 0, independientemente del status
      const hasRemaining = (parseFloat(program.remaining_meters) || 0) > 0;
      const isActive = program.status === 'activo' || hasRemaining;
      
      if (isActive) {
        acc[program.type].active.push(program);
      } else {
        acc[program.type].historical.push(program);
      }
      
      return acc;
    }, {});
  };

  // Función auxiliar para calcular metros activos totales
  const calculateTotalActiveMeters = (programs) => {
    return programs
      .filter(p => {
        // MODIFICADO: Considerar activo si tiene saldo restante > 0, independientemente del status
        const hasRemaining = (parseFloat(p.remaining_meters) || 0) > 0;
        return p.status === 'activo' || hasRemaining;
      })
      .reduce((sum, p) => sum + (p.remaining_meters || 0), 0);
  };

  const parseMeters = (value) => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const roundMeters = (value) => {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * 100) / 100;
  };

  useEffect(() => {
    fetchCustomersWithPrograms();
  }, []);

  // 🔄 POLLING: Actualizar datos automáticamente cada 2 minutos
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      // Solo hacer polling si la ventana está visible
      if (document.visibilityState === 'visible') {
        console.log('🔄 Polling: Actualizando datos automáticamente...');
        fetchCustomersWithPrograms();
      }
    }, 120000); // 2 minutos

    return () => clearInterval(pollingInterval);
  }, []);

  useEffect(() => {
    if (!showFilters) return;

    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  // Función para obtener historial de un cliente filtrado por program_folio
  const getClientHistoryByFolio = async (clientId, programFolio = null) => {
    setIsLoadingHistory(true);
    try {
      console.log('🔍🔍🔍 BUSCANDO HISTORIAL COMPLETO:', { clientId, programFolio });
      
      const cliente = customersWithPrograms.find(c => c.id === clientId);
      const clientName = cliente?.razon_social || cliente?.name;
      console.log('🔍 Cliente encontrado:', clientName);

      let allRecords = [];
      
      // 🔥 BÚSQUEDA 1: Por customer_id/client_id + program_folio
      console.log('🔥 BÚSQUEDA 1: Por IDs + folio');
      let query1 = supabase
        .from('order_history')
        .select('*')
        .or(`customer_id.eq.${clientId},client_id.eq.${clientId}`);
      
      if (programFolio) {
        query1 = query1.eq('program_folio', programFolio);
      }
      
      const { data: records1, error: error1 } = await query1.order('recorded_at', { ascending: false });
      console.log('🔍 Resultados búsqueda 1:', records1?.length || 0, error1);
      if (records1) allRecords = [...allRecords, ...records1];

      // 🔥 BÚSQUEDA 2: Por nombre del cliente
      if (clientName) {
        console.log('🔥 BÚSQUEDA 2: Por nombre del cliente');
        let query2 = supabase
          .from('order_history')
          .select('*')
          .eq('client_name', clientName);
        
        if (programFolio) {
          query2 = query2.eq('program_folio', programFolio);
        }
        
        const { data: records2, error: error2 } = await query2.order('recorded_at', { ascending: false });
        console.log('🔍 Resultados búsqueda 2:', records2?.length || 0, error2);
        if (records2) allRecords = [...allRecords, ...records2];
      }

      // 🔥 BÚSQUEDA 3: También en tabla 'orders' (puede tener registros)
      console.log('🔥 BÚSQUEDA 3: En tabla orders');
      let query3 = supabase
        .from('orders')
        .select('*')
        .or(`customer_id.eq.${clientId},client_id.eq.${clientId}`);
      
      if (programFolio) {
        query3 = query3.eq('program_folio', programFolio);
      }
      
      const { data: records3, error: error3 } = await query3.order('recorded_at', { ascending: false });
      console.log('🔍 Resultados búsqueda 3 (orders):', records3?.length || 0, error3);
      if (records3) allRecords = [...allRecords, ...records3];

      // 🔥 ELIMINAR DUPLICADOS por ID único
      const uniqueRecords = allRecords.filter((record, index, self) => 
        index === self.findIndex(r => r.id === record.id)
      );
      
      console.log('🔍 TOTAL REGISTROS ÚNICOS ENCONTRADOS:', uniqueRecords.length);
      console.log('🔍 Registros detallados:', uniqueRecords.map(r => ({
        id: r.id,
        meters: r.meters_consumed,
        fecha: r.recorded_at,
        folio: r.program_folio
      })));

      setClientHistory(uniqueRecords || []);
    } catch (err) {
      console.error('Error inesperado al obtener historial:', err);
      setClientHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Abrir modal de historial
  const openHistoryModal = (cliente) => {
    console.log('openHistoryModal called with client:', cliente);
    setSelectedClient(cliente);
    setHistoryModalOpen(true);
    setHistoryTypeFilter(null);
    getClientHistory(cliente.id);
  };

  // Abrir historial de un programa específico del cliente
  const openProgramHistory = (cliente, program) => {
    console.log('🔍 openProgramHistory called with:', { cliente, program });
    console.log('🔍 program.program_folio:', program?.program_folio);
    console.log('🔍 program.programFolio:', program?.programFolio);
    console.log('🔍 Full program object:', program);
    
    setSelectedClient(cliente);
    setHistoryModalOpen(true);
    setHistoryTypeFilter(program?.type || null);
    
    // USAR PROGRAM_FOLIO en lugar de program_id
    const programFolio = program?.program_folio || program?.programFolio || null;
    console.log('🔍 Using programFolio:', programFolio);
    
    getClientHistoryByFolio(cliente.id, programFolio);
  };

  // Cerrar modal de historial
  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    setSelectedClient(null);
    setClientHistory([]);
    setHistoryTypeFilter(null);
  };

  const [existingCustomers, setExistingCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(true);
  const [selectedCustomerWhatsApp, setSelectedCustomerWhatsApp] = useState('');
  const [selectedCustomerPrograms, setSelectedCustomerPrograms] = useState([]);
  const [availableProgramTypes, setAvailableProgramTypes] = useState(['DTF Textil', 'UV DTF']);
  
  // Estados para el searchable dropdown
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  // Función para cargar clientes existentes
  const fetchExistingCustomers = async () => {
    const { data, error } = await supabase
      .from('customers_')
      .select('id, razon_social, alias, celular')
      .order('razon_social');
    
    if (error) {
      console.error("Error al cargar clientes:", error);
      setExistingCustomers([]);
    } else {
      setExistingCustomers(data || []);
    }
  };

  // Función para filtrar clientes basado en la búsqueda
  const filteredCustomersForDropdown = existingCustomers.filter(customer => {
    if (!customerSearchQuery.trim()) return true;
    
    const searchTerm = customerSearchQuery.toLowerCase();
    const name = (customer.razon_social || '').toLowerCase();
    const alias = (customer.alias || '').toLowerCase();
    const phone = (customer.celular || '').toLowerCase();
    
    return name.includes(searchTerm) || 
           alias.includes(searchTerm) || 
           phone.includes(searchTerm);
  }).slice(0, 10); // Límite de 10 resultados

  // Función para resaltar texto coincidente
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : 
        part
    );
  };

  // Función para manejar la selección del cliente y obtener su WhatsApp y programas
  const handleCustomerSelection = async (customerId) => {
    setSelectedCustomerId(customerId);
    
    if (customerId) {
      const selectedCustomer = existingCustomers.find(c => c.id === customerId);
      if (selectedCustomer) {
        setSelectedCustomerWhatsApp(selectedCustomer.celular || '');
        // También actualizar el newClientData para mantener consistencia
        setNewClientData(prev => ({ 
          ...prev, 
          numeroWpp: selectedCustomer.celular || '' 
        }));

        // Consultar programas activos del cliente
        try {
          const { data: programs, error } = await supabase
            .from('loyalty_programs')
            .select('type, status, remaining_meters, total_meters')
            .eq('customer_id', customerId)
            .eq('status', 'activo');

          if (error) {
            console.error("Error al consultar programas:", error);
            setSelectedCustomerPrograms([]);
            setAvailableProgramTypes(['DTF Textil', 'UV DTF']);
          } else {
            const activePrograms = programs || [];
            setSelectedCustomerPrograms(activePrograms);
            
            // Filtrar tipos disponibles (excluir los que ya tienen programa activo)
            const existingTypes = activePrograms.map(p => p.type);
            const allTypes = ['DTF Textil', 'UV DTF'];
            const availableTypes = allTypes.filter(type => !existingTypes.includes(type));
            setAvailableProgramTypes(availableTypes);

            // Si no hay tipos disponibles, resetear el tipo seleccionado
            if (availableTypes.length === 0) {
              setNewClientData(prev => ({ ...prev, type: '' }));
            } else if (!availableTypes.includes(newClientData.type)) {
              setNewClientData(prev => ({ ...prev, type: availableTypes[0] }));
            }
          }
        } catch (err) {
          console.error("Error inesperado al consultar programas:", err);
          setSelectedCustomerPrograms([]);
          setAvailableProgramTypes(['DTF Textil', 'UV DTF']);
        }
      }
    } else {
      setSelectedCustomerWhatsApp('');
      setSelectedCustomerPrograms([]);
      setAvailableProgramTypes(['DTF Textil', 'UV DTF']);
      setNewClientData(prev => ({ ...prev, numeroWpp: '', type: 'DTF Textil' }));
    }
  };

  // Función específica para seleccionar cliente desde el searchable dropdown
  const selectCustomerFromDropdown = async (customer) => {
    setSelectedCustomerName(customer.razon_social);
    setCustomerSearchQuery(customer.razon_social);
    setShowCustomerDropdown(false);
    await handleCustomerSelection(customer.id);
  };

  // Función para limpiar selección de cliente
  const clearCustomerSelection = () => {
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setCustomerSearchQuery('');
    setSelectedCustomerWhatsApp('');
    setSelectedCustomerPrograms([]);
    setAvailableProgramTypes(['DTF Textil', 'UV DTF']);
    setNewClientData(prev => ({ ...prev, numeroWpp: '', type: '' }));
    setShowCustomerDropdown(false);
  };

  // Agregar useEffect para cargar clientes cuando se abra el modal
  useEffect(() => {
    if (addClientModalOpen) {
      fetchExistingCustomers();
    }
  }, [addClientModalOpen]);

  const handleAddClient = async () => {
    const { type: rawType, totalMeters, numeroWpp, lastPurchase } = newClientData;
    // Normalizar y validar el tipo para evitar concatenaciones o valores inesperados
    let normalizedType = (rawType || '').toString().trim();
    const masterTypes = (availableProgramTypes && availableProgramTypes.length > 0) ? availableProgramTypes : ['DTF Textil', 'UV DTF'];
    if (!normalizedType || !masterTypes.includes(normalizedType)) {
      // Si el usuario no seleccionó o el valor no está en la lista, elegir el primer tipo disponible
      normalizedType = masterTypes[0];
    }
    
    // Solo permitir clientes existentes
    if (!selectedCustomerId) {
      alert("Por favor, selecciona un cliente.");
      return;
    }

    const selectedCustomer = existingCustomers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer) {
      alert("Por favor, selecciona un cliente válido.");
      return;
    }

    if (!normalizedType || !totalMeters || !lastPurchase) {
      alert("Por favor, completa todos los campos obligatorios.");
      return;
    }

    try {
      // 1. Si el número de WhatsApp cambió, actualizar en customers_
      const originalWhatsApp = selectedCustomer.celular || '';
      const newWhatsApp = numeroWpp.trim();
      
      if (newWhatsApp !== originalWhatsApp && newWhatsApp !== '') {
        const { error: customerUpdateError } = await supabase
          .from('customers_')
          .update({ celular: newWhatsApp })
          .eq('id', selectedCustomerId);
          
        if (customerUpdateError) {
          console.error("Error al actualizar WhatsApp del cliente:", customerUpdateError);
          alert("Error al actualizar el número de WhatsApp: " + customerUpdateError.message);
          return;
        }
      }

      // Obtener programas existentes del cliente para calcular número consecutivo y validar duplicados
      const { data: existingProgramsAll, error: existingProgramsError } = await supabase
        .from('loyalty_programs')
        .select('program_number, type, status')
        .eq('customer_id', selectedCustomerId);

      if (existingProgramsError) {
        console.error('Error al consultar programas existentes:', existingProgramsError);
        alert('No se pudo calcular el número del programa. Intenta de nuevo.');
        return;
      }

      // Validar que no exista un programa activo del mismo tipo
      const activeProgramsSameType = (existingProgramsAll || []).filter(program => 
        (program.type || '').toLowerCase() === normalizedType.toLowerCase() && 
        (program.status || '').toLowerCase() === 'activo'
      );

      if (activeProgramsSameType.length > 0) {
        alert(`No se puede agregar el programa. El cliente ya tiene un programa activo de tipo "${normalizedType}". Debe completar o cerrar el programa actual antes de crear uno nuevo.`);
        return;
      }

      const programsSameType = (existingProgramsAll || []).filter(program => (program.type || '').toLowerCase() === normalizedType.toLowerCase());
      const nextProgramNumber = programsSameType.reduce((max, program) => {
        const num = parseInt(program.program_number, 10);
        return Number.isFinite(num) && num > max ? num : max;
      }, 0) + 1;

      // Calcular folio global consecutivo de 3 dígitos usando helper
      let nextProgramFolio = await getNextProgramFolio(supabase);
      if (!nextProgramFolio) {
        // Fallback a aleatorio de 3 dígitos si la consulta falla
        nextProgramFolio = generateRandomFolio3();
      }

      // 2. Crear programa de lealtad usando la nueva estructura loyalty_programs
      const { error: programError } = await supabase
        .from('loyalty_programs')
        .insert([{
          customer_id: selectedCustomerId,
          type: normalizedType,
          total_meters: parseFloat(totalMeters),
          remaining_meters: parseFloat(totalMeters),
          status: 'activo',
          purchase_date: lastPurchase,
          numero_wpp: newWhatsApp,
          program_number: nextProgramNumber,
          program_folio: nextProgramFolio,
          completion_date: null
        }]);

      if (programError) {
        console.error("Error al crear programa:", programError);
        alert("Error al crear el programa de lealtad: " + programError.message);
        return;
      }

      alert("Programa de lealtad agregado correctamente");
      setAddClientModalOpen(false);
      clearCustomerSelection();
  setNewClientData({ name: "", type: "", totalMeters: "", numeroWpp: "", lastPurchase: "" });
      fetchCustomersWithPrograms();

    } catch (err) {
      console.error("Error inesperado al agregar programa:", err);
      alert("Ocurrió un error inesperado.");
    }
  };
  
  const handleDeleteClient = async () => {
    if (!deleteReason.length || !deletorName) {
      alert("Por favor, selecciona al menos una razón y escribe tu nombre.");
      return;
    }
  
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('deleted_clients_audit')
        .insert([
          {
            deleted_at: new Date().toISOString(),
            client_id: selectedClient.id,
            client_name: selectedClient.name,
            deleted_by_name: deletorName,
            reasons: deleteReason,
          }
        ]);
  
      if (auditError) {
        console.error("Error al registrar la eliminación:", auditError);
        alert("Hubo un error al registrar la eliminación. Intenta de nuevo. Detalles: " + auditError.message);
        return;
      }
  
      const { error: deleteError } = await supabase
        .from('loyalty_clients')
        .delete()
        .eq('id', selectedClient.id);
  
      if (deleteError) {
        console.error("Error al eliminar el cliente:", deleteError);
        alert("Hubo un error al eliminar el cliente. El registro de auditoría fue guardado. Detalles: " + deleteError.message);
      } else {
        alert("Cliente eliminado con éxito y registrado.");
        setDeleteModalOpen(false);
        setDeleteReason([]);
        setDeletorName("");
        fetchClients();
      }
    } catch (err) {
      console.error("Error inesperado al eliminar cliente:", err);
      alert("Ocurrió un error inesperado.");
    }
  };
  
  const toggleReason = (reason) => {
    if (deleteReason.includes(reason)) {
      setDeleteReason(deleteReason.filter(r => r !== reason));
    } else {
      setDeleteReason([...deleteReason, reason]);
    }
  };

  const handleOpenEditModal = (client) => {
    setEditingClientData({ ...client });
    setEditClientModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditClientModalOpen(false);
    setEditingClientData(null);
  };

  const handleSaveEdit = async () => {
    if (
      !editingClientData.name ||
      !editingClientData.totalMeters ||
      !editingClientData.editReason ||
      !editingClientData.editAuthorizedBy
    ) {
      alert("Todos los campos son obligatorios, incluyendo razón y autorización.");
      return;
    }

    try {
      const { error } = await supabase
        .from('loyalty_clients')
        .update({
          name: editingClientData.name,
          type: editingClientData.type,
          totalMeters: parseFloat(editingClientData.totalMeters),
          remainingMeters: parseFloat(editingClientData.remainingMeters),
          numeroWpp: editingClientData.numeroWpp,
          lastPurchase: editingClientData.lastPurchase,
          editReason: editingClientData.editReason,
          editAuthorizedBy: editingClientData.editAuthorizedBy
        })
        .eq('id', editingClientData.id);

      if (error) {
        console.error("Error al actualizar el cliente:", error);
        alert("Hubo un error al actualizar los datos del cliente: " + error.message);
      } else {
        alert("Cliente actualizado correctamente");
        handleCloseEditModal();
        fetchClients();
      }
    } catch (err) {
      console.error("Error inesperado al guardar la edición:", err);
      alert("Ocurrió un error inesperado. Revisa la consola.");
    }
  };

  // Estados para editar programa (agregar cerca de otros useState)
  const [editProgramModalOpen, setEditProgramModalOpen] = useState(false);
  const [editingProgramData, setEditingProgramData] = useState(null);

  // Reemplazar la función handleEditProgram (antes placeholder) por esta
  const handleEditProgram = (programId) => {
    // Buscar el programa dentro de customersWithPrograms
    for (const customer of customersWithPrograms) {
      const programsByType = customer.programs || {};
      for (const [type, lists] of Object.entries(programsByType)) {
        const found = [...(lists.active || []), ...(lists.historical || [])].find(p => String(p.id) === String(programId));
        if (found) {
          setEditingProgramData({
            id: found.id,
            customerId: customer.id,
            customerName: customer.razon_social || customer.alias || '',
            type: found.type || type,
            program_number: found.program_number,
            total_meters: found.total_meters ?? found.totalMeters ?? 0,
            remaining_meters: found.remaining_meters ?? found.remainingMeters ?? 0,
            purchase_date: found.purchase_date ? found.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0],
            edit_reason: found.edit_reason || '',
            edit_authorized_by: found.edit_authorized_by || ''
          });
          setEditProgramModalOpen(true);
          return;
        }
      }
    }
    alert('Programa no encontrado para edición.');
  };

  // Función para guardar cambios del programa
  const handleSaveProgramEdit = async (e) => {
    e.preventDefault();
    if (!editingProgramData) return;

    const total = parseFloat(editingProgramData.total_meters);
    const remaining = parseFloat(editingProgramData.remaining_meters);
    const reason = (editingProgramData.edit_reason || '').trim();
    const authorizedBy = (editingProgramData.edit_authorized_by || '').trim();

    if (isNaN(total) || total <= 0) {
      alert('Ingresa un valor válido para Metros totales.');
      return;
    }
    if (isNaN(remaining) || remaining < 0) {
      alert('Ingresa un valor válido para Metros restantes.');
      return;
    }
    if (remaining > total) {
      alert('Los metros restantes no pueden ser mayores que los metros totales.');
      return;
    }
    if (!reason) {
      alert('Es necesaria la razón de edición.');
      return;
    }
    if (!authorizedBy) {
      alert('Es necesario indicar quién autoriza la edición.');
      return;
    }

    try {
      const { error } = await supabase
        .from('loyalty_programs')
        .update({
          total_meters: total,
          remaining_meters: remaining,
          edit_reason: reason,
          edit_authorized_by: authorizedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProgramData.id);

      if (error) {
        console.error('Error actualizando programa:', error);
        alert('Error al guardar cambios: ' + error.message);
        return;
      }

      // Cerrar modal y recargar datos
      setEditProgramModalOpen(false);
      setEditingProgramData(null);
      await fetchCustomersWithPrograms();
      alert('Programa actualizado correctamente.');
    } catch (err) {
      console.error('Error inesperado al guardar edición:', err);
      alert('Error inesperado al guardar edición.');
    }
  };

  // Calcular estadísticas del historial enfocadas en folios activos e históricos
  const calculateHistoryStats = (history = [], client = null, typeFilter = null) => {
    const stats = {
      activeCount: 0,
      activeBreakdown: '—',
      totalActiveRemaining: 0,
      totalActiveMeters: 0,
      consumedActive: 0,
      totalConsumedFromHistory: 0, // NUEVO: total consumido desde historial real
      completedCount: 0,
      lastCompletedDate: null,
      totalTrackedFolios: 0
    };

    const normalizedType = typeFilter ? typeFilter.toLowerCase() : null;

    const typeMatches = (programType) => {
      if (!normalizedType) return true;
      return (programType || '').toLowerCase() === normalizedType;
    };

    // NUEVO: Calcular metros consumidos desde el historial real de pedidos
    if (history.length) {
      stats.totalConsumedFromHistory = history
        .filter(record => typeMatches(record.type))
        .reduce((total, record) => {
          const consumed = parseFloat(record.meters_consumed) || 0;
          return total + consumed;
        }, 0);
    }

    if (client?.programs) {
      const activePrograms = [];
      const historicalPrograms = [];
      const programsWithRemaining = []; // NUEVO: programas con saldo restante

      Object.values(client.programs).forEach(({ active = [], historical = [] }) => {
        const filteredActive = active.filter(program => typeMatches(program.type));
        const filteredHistorical = historical.filter(program => typeMatches(program.type));
        activePrograms.push(...filteredActive);
        historicalPrograms.push(...filteredHistorical);
        
        // NUEVO: Incluir TODOS los programas con saldo restante > 0
        [...filteredActive, ...filteredHistorical].forEach(program => {
          const remaining = parseFloat(program.remaining_meters) || 0;
          if (remaining > 0) {
            programsWithRemaining.push(program);
          }
        });
      });

      stats.activeCount = activePrograms.length;

      // MODIFICADO: Usar programsWithRemaining para calcular saldo activo real
      if (programsWithRemaining.length > 0) {
        const breakdown = {};

        programsWithRemaining.forEach(program => {
          const remaining = parseFloat(program.remaining_meters) || 0;
          const total = parseFloat(program.total_meters) || 0;
          stats.totalActiveRemaining += remaining;
          stats.totalActiveMeters += total;
          const typeLabel = program.type || 'General';
          breakdown[typeLabel] = (breakdown[typeLabel] || 0) + 1;
        });

        // MODIFICADO: usar el historial real en lugar del cálculo basado en programas activos solamente
        const consumedFromActivePrograms = Math.max(stats.totalActiveMeters - stats.totalActiveRemaining, 0);
        stats.consumedActive = Math.max(stats.totalConsumedFromHistory, consumedFromActivePrograms);
        
        stats.activeBreakdown = Object.entries(breakdown)
          .map(([type, count]) => `${type}: ${count}`)
          .join(' • ');
      } else {
        // Si no hay programas con saldo, usar el total del historial
        stats.consumedActive = stats.totalConsumedFromHistory;
      }

      const completedPrograms = [
        ...historicalPrograms.filter(program => (program.status || '').toLowerCase() === 'completado'),
        ...activePrograms.filter(program => (program.status || '').toLowerCase() === 'completado')
      ];

      stats.completedCount = completedPrograms.length;

      if (completedPrograms.length) {
        const lastCompleted = completedPrograms
          .map(program => program.completion_date || program.updated_at || program.created_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0];
        stats.lastCompletedDate = lastCompleted || null;
      }
    }

    if (history.length) {
      const folios = new Set();
      history.forEach(record => {
        if (typeMatches(record.type) && record.program_folio) {
          folios.add(record.program_folio);
        }
      });
      stats.totalTrackedFolios = folios.size;
    }

    return stats;
  };
  
  // Función de filtrado unificada para clientes
  const filteredCustomers = useMemo(() => {
    let filtered = customersWithPrograms.filter(customer => {
      const searchTerm = searchQuery.toLowerCase();
      const customerName = (customer.razon_social || customer.alias || '').toLowerCase();
  const customerPhone = (customer.celular || '').toLowerCase();
      const customerEmail = (customer.email || '').toLowerCase();
      const customerId = (customer.id || '').toLowerCase();
      
      return customerName.includes(searchTerm) || 
             customerPhone.includes(searchTerm) || 
             customerEmail.includes(searchTerm) ||
             customerId.includes(searchTerm);
    });

    // Filtrar por tipo de programa
    if (selectedType !== 'Todos' && !showExpiringClients) {
      filtered = filtered.filter(customer => {
        return customer.programs && customer.programs[selectedType] && 
               (customer.programs[selectedType].active?.length > 0 || 
                customer.programs[selectedType].historical?.length > 0);
      });
    }

    // Filtrar por estado de programas (Activos/Históricos/Sin Programas Activos)
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(customer => {
        if (!customer.programs) return statusFilter === 'Sin Programas Activos';
        
        let hasMatchingStatus = false;
        const allPrograms = Object.values(customer.programs).flatMap(typePrograms => [
          ...(typePrograms.active || []),
          ...(typePrograms.historical || [])
        ]);
        
        // Verificar si tiene algún programa activo con metros > 0
        const hasActiveProgram = allPrograms.some(p => p.status === 'active' && p.remaining_meters > 0);
        
        if (statusFilter === 'Sin Programas Activos') {
          return !hasActiveProgram;
        }
        
        Object.values(customer.programs).forEach(typePrograms => {
          if (statusFilter === 'Activos' && typePrograms.active?.length > 0) {
            hasMatchingStatus = true;
          }
          if (statusFilter === 'Históricos' && typePrograms.historical?.length > 0) {
            hasMatchingStatus = true;
          }
        });
        
        return hasMatchingStatus;
      });
    }

    // Filtrar clientes a punto de expirar
    if (showExpiringClients) {
      filtered = filtered.filter(customer => {
        // Revisar todos los programas activos del cliente
        if (!customer.programs) return false;
        
        let hasExpiringProgram = false;
        Object.values(customer.programs).forEach(typePrograms => {
          if (typePrograms.active) {
            typePrograms.active.forEach(program => {
              const expiringThreshold = getExpiringThreshold(program.total_meters);
              const isExpiring = program.remaining_meters > 0 && 
                               program.remaining_meters <= (program.total_meters * expiringThreshold);
              if (isExpiring) hasExpiringProgram = true;
            });
          }
        });
        
        return hasExpiringProgram;
      });
    }

    return filtered;
  }, [customersWithPrograms, searchQuery, selectedType, statusFilter, showExpiringClients]);

  const loyaltyStats = useMemo(() => {
    const aggregates = {
      activeCustomers: 0,
      activeDTFCustomers: 0,
      activeUVCustomers: 0,
      activePrograms: 0,
      historicalPrograms: 0,
      availableMeters: 0,
      totalMeters: 0,
      totalCustomers: customersWithPrograms.length || 0,
      inactiveCustomers: 0,
      // Métricas por producto
      dtfMeters: { total: 0, consumed: 0, available: 0, activePrograms: 0 },
      uvMeters: { total: 0, consumed: 0, available: 0, activePrograms: 0 }
    };

    customersWithPrograms.forEach(customer => {
      const programsByType = customer.programs || {};
      let hasActiveProgram = false;
      let hasActiveDTF = false;
      let hasActiveUV = false;

      Object.entries(programsByType).forEach(([type, typePrograms]) => {
        const active = typePrograms?.active || [];
        const historical = typePrograms?.historical || [];

        // Contar programas activos e históricos
        aggregates.activePrograms += active.length;
        aggregates.historicalPrograms += historical.length;

        // Verificar si tiene programas activos
        if (active.length > 0) {
          hasActiveProgram = true;
          if (type === 'DTF Textil') hasActiveDTF = true;
          if (type === 'UV DTF') hasActiveUV = true;
        }

        // Calcular metros disponibles (solo de activos)
        active.forEach(program => {
          const remaining = Number(program?.remaining_meters) || 0;
          const total = Number(program?.total_meters) || 0;
          const consumed = total - remaining;
          
          aggregates.availableMeters += remaining;
          aggregates.totalMeters += total;

          // Métricas por tipo de producto
          if (type === 'DTF Textil') {
            aggregates.dtfMeters.total += total;
            aggregates.dtfMeters.consumed += consumed;
            aggregates.dtfMeters.available += remaining;
            aggregates.dtfMeters.activePrograms += 1;
          } else if (type === 'UV DTF') {
            aggregates.uvMeters.total += total;
            aggregates.uvMeters.consumed += consumed;
            aggregates.uvMeters.available += remaining;
            aggregates.uvMeters.activePrograms += 1;
          }
        });

        // Sumar metros totales de históricos
        historical.forEach(program => {
          const total = Number(program?.total_meters) || 0;
          aggregates.totalMeters += total;
          
          // Metros consumidos de históricos
          if (type === 'DTF Textil') {
            aggregates.dtfMeters.total += total;
            aggregates.dtfMeters.consumed += total;
          } else if (type === 'UV DTF') {
            aggregates.uvMeters.total += total;
            aggregates.uvMeters.consumed += total;
          }
        });
      });

      if (hasActiveProgram) {
        aggregates.activeCustomers += 1;
      } else {
        aggregates.inactiveCustomers += 1;
      }
      
      if (hasActiveDTF) aggregates.activeDTFCustomers += 1;
      if (hasActiveUV) aggregates.activeUVCustomers += 1;
    });

    return aggregates;
  }, [customersWithPrograms]);

  const productCards = useMemo(() => ([
    {
      id: 'dtf',
      label: 'DTF Textil',
      total: Math.round(loyaltyStats.dtfMeters.total),
      consumed: Math.round(loyaltyStats.dtfMeters.consumed),
      available: Math.round(loyaltyStats.dtfMeters.available),
      programs: loyaltyStats.dtfMeters.activePrograms,
      border: 'border-blue-200',
      progressColor: 'bg-gradient-to-r from-blue-500 to-blue-600'
    },
    {
      id: 'uv',
      label: 'UV DTF',
      total: Math.round(loyaltyStats.uvMeters.total),
      consumed: Math.round(loyaltyStats.uvMeters.consumed),
      available: Math.round(loyaltyStats.uvMeters.available),
      programs: loyaltyStats.uvMeters.activePrograms,
      border: 'border-purple-200',
      progressColor: 'bg-gradient-to-r from-purple-500 to-purple-600'
    }
  ]), [loyaltyStats]);

  const summaryCards = useMemo(() => ([
    {
      id: 'activeCustomers',
      label: 'Clientes Activos',
      value: loyaltyStats.activeCustomers,
      iconBg: 'bg-green-500/10 text-green-600',
      border: 'border-green-100',
      icon: <Users size={22} />,
      suffix: '',
      description: `${loyaltyStats.activeDTFCustomers} DTF • ${loyaltyStats.activeUVCustomers} UV DTF • ${loyaltyStats.inactiveCustomers} inactivos`
    },
    {
      id: 'activePrograms',
      label: 'Programas Activos',
      value: loyaltyStats.activePrograms,
      iconBg: 'bg-blue-500/10 text-blue-600',
      border: 'border-blue-100',
      icon: <User size={22} />,
      suffix: '',
      description: `${loyaltyStats.historicalPrograms} programas completados`
    },
    {
      id: 'availableMeters',
      label: 'Metros Disponibles',
      value: Math.round(loyaltyStats.availableMeters),
      iconBg: 'bg-purple-500/10 text-purple-600',
      border: 'border-purple-100',
      icon: <Sparkles size={22} />,
      suffix: 'm',
      description: 'Metros restantes en programas activos'
    },
    {
      id: 'totalMeters',
      label: 'Metros Vendidos',
      value: Math.round(loyaltyStats.totalMeters),
      iconBg: 'bg-amber-500/10 text-amber-600',
      border: 'border-amber-100',
      icon: <Ruler size={22} />,
      suffix: 'm',
      description: 'Total de metros contratados'
    }
  ]), [loyaltyStats]);

  const handleFilterSelect = (type) => {
    setSelectedType(type);
    setShowExpiringClients(false);
    setShowFilters(false);
  };

  // Función para exportar clientes con programas a Excel
  const exportCustomersToExcel = () => {
    if (!filteredCustomers.length) {
      alert('No hay clientes para exportar');
      return;
    }

    const exportData = [];
    
    filteredCustomers.forEach(customer => {
      const customerName = customer.razon_social || customer.alias || customer.name || 'Sin nombre';
      const customerPhone = customer.celular || customer.numeroWpp || customer.numero_wpp || '';
      const customerEmail = customer.email || '';
      const customerId = customer.id || '';
      
      if (customer.programs) {
        Object.entries(customer.programs).forEach(([type, typePrograms]) => {
          // Programas activos
          if (typePrograms.active && typePrograms.active.length > 0) {
            typePrograms.active.forEach(program => {
              exportData.push({
                'ID Cliente': customerId,
                'Cliente': customerName,
                'Teléfono': customerPhone,
                'Email': customerEmail,
                'Tipo Programa': type,
                'Estado': 'Activo',
                'Número Programa': program.program_number || '',
                'Folio': program.program_folio || '',
                'Metros Totales': program.total_meters || 0,
                'Metros Restantes': program.remaining_meters || 0,
                'Metros Consumidos': (program.total_meters || 0) - (program.remaining_meters || 0),
                'Fecha Compra': program.purchase_date || '',
                'Fecha Creación': program.created_at || ''
              });
            });
          }
          
          // Programas históricos
          if (typePrograms.historical && typePrograms.historical.length > 0) {
            typePrograms.historical.forEach(program => {
              exportData.push({
                'ID Cliente': customerId,
                'Cliente': customerName,
                'Teléfono': customerPhone,
                'Email': customerEmail,
                'Tipo Programa': type,
                'Estado': 'Histórico',
                'Número Programa': program.program_number || '',
                'Folio': program.program_folio || '',
                'Metros Totales': program.total_meters || 0,
                'Metros Restantes': program.remaining_meters || 0,
                'Metros Consumidos': (program.total_meters || 0) - (program.remaining_meters || 0),
                'Fecha Compra': program.purchase_date || '',
                'Fecha Creación': program.created_at || '',
                'Fecha Completado': program.completed_at || ''
              });
            });
          }
        });
      } else {
        // Cliente sin programas
        exportData.push({
          'ID Cliente': customerId,
          'Cliente': customerName,
          'Teléfono': customerPhone,
          'Email': customerEmail,
          'Tipo Programa': '',
          'Estado': 'Sin programas',
          'Número Programa': '',
          'Folio': '',
          'Metros Totales': 0,
          'Metros Restantes': 0,
          'Metros Consumidos': 0,
          'Fecha Compra': '',
          'Fecha Creación': ''
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes y Programas');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `clientes_programas_lealtad_${timestamp}.xlsx`);
  };

  const fetchGlobalHistory = async () => {
    setIsLoadingGlobalHistory(true);
    const { data, error } = await supabase
      .from('order_history')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error("Error al obtener historial global:", error);
      setGlobalHistory([]);
    } else {
      setGlobalHistory(data || []);
    }
    setIsLoadingGlobalHistory(false);
  };

  // Función para obtener movimientos filtrados por período
  const fetchMovementsByPeriod = async (period = 'hoy') => {
    setIsLoadingGlobalHistory(true);
    
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'hoy':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'ayer':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'mes':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'todo':
        startDate = new Date('2020-01-01');
        break;
    }

    let query = supabase
      .from('order_history')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (period === 'ayer') {
      const endYesterday = new Date(startDate);
      endYesterday.setDate(startDate.getDate() + 1);
      endYesterday.setHours(0, 0, 0, 0);
      query = query
        .gte('recorded_at', startDate.toISOString())
        .lt('recorded_at', endYesterday.toISOString());
    } else if (period !== 'todo') {
      query = query.gte('recorded_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener movimientos:', error);
      setMovementsData([]);
    } else {
      setMovementsData(data || []);
    }
    
    setIsLoadingGlobalHistory(false);
  };

  // Calcular estadísticas de movimientos
  const movementsStats = useMemo(() => {
    if (!movementsData || movementsData.length === 0) {
      return {
        totalMovements: 0,
        totalMetersConsumed: 0,
        dtfMetersConsumed: 0,
        uvMetersConsumed: 0,
        uniqueClients: 0
      };
    }

    const uniqueClients = new Set(movementsData.map(m => m.customer_id)).size;
    const totalMetersConsumed = movementsData.reduce((sum, m) => sum + (Number(m.meters_consumed) || 0), 0);
    const dtfMetersConsumed = movementsData
      .filter(m => m.type === 'DTF Textil')
      .reduce((sum, m) => sum + (Number(m.meters_consumed) || 0), 0);
    const uvMetersConsumed = movementsData
      .filter(m => m.type === 'UV DTF')
      .reduce((sum, m) => sum + (Number(m.meters_consumed) || 0), 0);

    return {
      totalMovements: movementsData.length,
      totalMetersConsumed: Math.round(totalMetersConsumed),
      dtfMetersConsumed: Math.round(dtfMetersConsumed),
      uvMetersConsumed: Math.round(uvMetersConsumed),
      uniqueClients
    };
  }, [movementsData]);

  // Cargar movimientos cuando cambia el período
  useEffect(() => {
    if (showMovementsPanel) {
      fetchMovementsByPeriod(periodFilter);
    }
  }, [periodFilter, showMovementsPanel]);

  useEffect(() => {
    if (globalHistoryModalOpen) {
      fetchGlobalHistory();
    }
  }, [globalHistoryModalOpen]);

  const exportGlobalHistoryToExcel = () => {
    if (!globalHistory.length) return;
    const worksheet = XLSX.utils.json_to_sheet(globalHistory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "historial_global.xlsx");
  };

  const handleDeleteHistoryRecord = async (historyId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro del historial?")) return;
    const { error } = await supabase
      .from('order_history')
      .delete()
      .eq('id', historyId);

    if (error) {
      alert("Error al eliminar el registro: " + error.message);
    } else {
      setGlobalHistory(globalHistory.filter(r => r.id !== historyId));
    }
  };

  // Agregar estas funciones para controlar la expansión
  const toggleExpand = (customerId) => {
    setExpandedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const isExpanded = (customerId) => {
    return expandedCustomers.includes(customerId);
  };

  // Abrir modal para agregar programa a cliente existente
  const openAddProgramModal = async (customerId) => {
    console.log('🚀 openAddProgramModal called with customerId:', customerId);
    console.log('🔍 Current addClientModalOpen state:', addClientModalOpen);
    
    const customer = customersWithPrograms.find(c => c.id === customerId);
    if (customer) {
      console.log('✅ Customer found:', customer.razon_social);
      
      try {
        // Cargar programas activos directamente
        console.log('⏳ Loading customer programs directly from DB...');
        const { data: programs, error } = await supabase
          .from('loyalty_programs')
          .select('type, status, remaining_meters, total_meters')
          .eq('customer_id', customerId)
          .eq('status', 'activo');

        if (error) {
          console.error("Error al consultar programas:", error);
          setSelectedCustomerPrograms([]);
          setAvailableProgramTypes(['DTF Textil', 'UV DTF']);
        } else {
          const activePrograms = programs || [];
          console.log('✅ Programs loaded:', activePrograms);
          setSelectedCustomerPrograms(activePrograms);
          
          // Filtrar tipos disponibles (excluir los que ya tienen programa activo)
          const existingTypes = activePrograms.map(p => p.type);
          const allTypes = ['DTF Textil', 'UV DTF'];
          const availableTypes = allTypes.filter(type => !existingTypes.includes(type));
          setAvailableProgramTypes(availableTypes);
        }

        // Preseleccionar cliente
        setSelectedCustomerId(customerId);
        setSelectedCustomerName(customer.razon_social);
        setCustomerSearchQuery(customer.razon_social);
        setSelectedCustomerWhatsApp(customer.celular || '');
        setIsExistingCustomer(true);
        
        // Preseleccionar el tipo: preferir UV DTF si está disponible, sino DTF Textil
        const preferredType = availableProgramTypes.includes('UV DTF') ? 'UV DTF' : 
                            availableProgramTypes.includes('DTF Textil') ? 'DTF Textil' : 
                            availableProgramTypes[0] || 'DTF Textil';

        setNewClientData({ 
          name: customer.razon_social, 
          type: preferredType, 
          totalMeters: "", 
          numeroWpp: customer.celular || "", 
          lastPurchase: "" 
        });
        
        console.log('📝 Setting addClientModalOpen to true');
        setAddClientModalOpen(true);
        
      } catch (error) {
        console.error('Error en openAddProgramModal:', error);
        alert('Error al cargar los programas del cliente');
      }
    } else {
      console.log('❌ Customer not found with id:', customerId);
    }
  };

  

  // Función para abrir modal post-pedido desde historial
  const openHistoryPostPedidoModal = (record) => {
    console.log('🔄 Converting history record to post-pedido format:', record);
    console.log('📱 selectedClient data:', selectedClient);
    
    // ✅ SIEMPRE buscar el número del programa de lealtad específico
    // El record debería tener la referencia al programa (program_id)
    let loyaltyProgramPhone = '';
    let currentRemainingMeters = 0;
    let totalProgramMeters = 0;
  let activeProgramFolio = record.program_folio || '';
    
    // Buscar en los programas del cliente el que corresponda al tipo del record
    if (selectedClient?.programs && record.type) {
      const typePrograms = selectedClient.programs[record.type];
      if (typePrograms?.active?.length > 0) {
        // Buscar el programa específico o usar el primero disponible
        const program = typePrograms.active[0]; // Por ahora usamos el primero
        loyaltyProgramPhone = program.numero_wpp || '';
        currentRemainingMeters = Number(program.remaining_meters ?? 0); // ✅ Obtener metros restantes actuales
        totalProgramMeters = Number(program.total_meters ?? 0); // ✅ Obtener metros totales del programa
        activeProgramFolio = program.program_folio || activeProgramFolio;
      }
    }
    
    // Fallback: usar numero_wpp del record si existe
    if (!loyaltyProgramPhone) {
      loyaltyProgramPhone = record?.numero_wpp || '';
    }
    
    console.log('📞 Loyalty Program Data:', {
      loyaltyProgramPhone,
      currentRemainingMeters,
      recordType: record.type,
      selectedClientPrograms: selectedClient?.programs,
      availablePrograms: selectedClient?.programs,
      record: record
    });
    
    // Calcular metros restantes actuales (estimación)
    const metersConsumedNum = Number(record.meters_consumed ?? 0);
    
    const ticketInfo = {
      client: {
        id: selectedClient?.id,
        name: selectedClient?.name || selectedClient?.razon_social || '',
        type: selectedClient?.type || record.type || '',
        totalMeters: totalProgramMeters || 0,
        remainingMeters: currentRemainingMeters, // ✅ Usar metros restantes del programa de lealtad
        celular: selectedClient?.celular || '', // ✅ Agregar celular del cliente actual
        loyaltyProgramPhone: loyaltyProgramPhone, // ✅ Usar el número del programa de lealtad
        programFolio: activeProgramFolio || record.program_folio || ''
      },
      order: {
        metersConsumed: metersConsumedNum,
        registeredBy: record.recorded_by || 'Sistema',
        observaciones: record.observaciones || '',
        recordedAt: record.recorded_at || new Date().toISOString(),
  folio: record.folio || generateRandomFolio3(),
        programFolio: activeProgramFolio || record.program_folio || ''
      }
    };

    console.log('✅ Converted to ticket format:', ticketInfo);
    
    // Configurar datos y abrir modal post-pedido
    setTicketData(ticketInfo);
    setUltimoPedidoGuardado({
      customerName: ticketInfo.client.name,
      metros: metersConsumedNum, // ✅ Usar 'metros' no 'metersConsumed'
      type: ticketInfo.client.type,
      registeredBy: record.recorded_by || 'Sistema',
      programFolio: activeProgramFolio || record.program_folio || ''
    });
    
    // Cerrar modal de historial y abrir post-pedido
    closeHistoryModal();
    setPostPedidoModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes con Programa de Lealtad</h1>
        <div className="flex gap-2">
          {/* Botón de movimientos */}
          <button
            onClick={() => {
              setShowMovementsPanel(!showMovementsPanel);
              if (!showMovementsPanel) fetchMovementsByPeriod(periodFilter);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full transition ${
              showMovementsPanel 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title="Ver movimientos por período"
          >
            <Clock size={18} />
            <span className="font-medium text-sm hidden sm:inline">Movimientos</span>
          </button>
          {/* Botón de exportar */}
          <button
            onClick={exportCustomersToExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-green-100 hover:bg-green-200 transition"
            title="Exportar base de datos a Excel"
          >
            <Download className="text-green-600" size={18} />
            <span className="text-green-600 font-medium text-sm hidden sm:inline">Exportar</span>
          </button>
          {/* Botón de agregar cliente */}
          <button
            onClick={() => setAddClientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Agregar Programa
          </button>
        </div>
      </div>
      
      {/* Resumen de clientes y programas */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => {
          const formattedValue = typeof card.value === 'number'
            ? card.value.toLocaleString('es-MX')
            : card.value;

          return (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl border ${card.border} bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-white/60 to-transparent" aria-hidden="true"></div>
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${card.iconBg}`}>
                  {card.icon}
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400 text-right max-w-[130px]">
                  {card.label}
                </span>
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-gray-900">{formattedValue}{card.suffix}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tarjetas de métricas por producto */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2">
        {productCards.map(card => {
          const percentageConsumed = card.total > 0 ? Math.round((card.consumed / card.total) * 100) : 0;
          
          return (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl border ${card.border} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{card.label}</h3>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                  {card.programs} programa{card.programs !== 1 ? 's' : ''} activo{card.programs !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total vendido</div>
                  <div className="text-xl font-bold text-gray-900">{card.total}m</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Consumido</div>
                  <div className="text-xl font-bold text-amber-600">{card.consumed}m</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Disponible</div>
                  <div className="text-xl font-bold text-green-600">{card.available}m</div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`${card.progressColor} h-2.5 rounded-full transition-all duration-300`}
                  style={{ width: `${percentageConsumed}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-right">
                {percentageConsumed}% consumido
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de movimientos por período */}
      {showMovementsPanel && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-blue-600" size={24} />
              Movimientos de Lealtad
            </h2>
            
            {/* Filtros de período */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'hoy', label: 'Hoy' },
                { value: 'ayer', label: 'Ayer' },
                { value: 'semana', label: 'Semana' },
                { value: 'mes', label: 'Mes' },
                { value: 'todo', label: 'Todo' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setPeriodFilter(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    periodFilter === option.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-blue-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estadísticas del período */}
          {isLoadingGlobalHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-5">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                  <div className="text-xs text-gray-500 mb-1">Total Movimientos</div>
                  <div className="text-2xl font-bold text-blue-600">{movementsStats.totalMovements}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                  <div className="text-xs text-gray-500 mb-1">Metros Totales</div>
                  <div className="text-2xl font-bold text-purple-600">{movementsStats.totalMetersConsumed}m</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-cyan-100">
                  <div className="text-xs text-gray-500 mb-1">DTF Textil</div>
                  <div className="text-2xl font-bold text-cyan-600">{movementsStats.dtfMetersConsumed}m</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
                  <div className="text-xs text-gray-500 mb-1">UV DTF</div>
                  <div className="text-2xl font-bold text-indigo-600">{movementsStats.uvMetersConsumed}m</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                  <div className="text-xs text-gray-500 mb-1">Clientes únicos</div>
                  <div className="text-2xl font-bold text-green-600">{movementsStats.uniqueClients}</div>
                </div>
              </div>

              {/* Lista de movimientos */}
              {movementsData.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-gray-600">No hay movimientos en este período</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha/Hora</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Folio</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Metros</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registrado por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {movementsData.map((movement) => (
                          <tr key={movement.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {formatDate(movement.recorded_at, { useUTC: true })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{movement.client_name}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                movement.type === 'DTF Textil' 
                                  ? 'bg-cyan-100 text-cyan-800' 
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {movement.type || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{movement.program_folio || '—'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                              {Number(movement.meters_consumed || 0).toFixed(2)}m
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{movement.recorded_by || 'Sistema'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Filtros y búsqueda - Compact Single Row */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Segmented Control: Tipo */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {['Todos', 'DTF Textil', 'UV DTF'].map(type => (
              <button
                key={type}
                onClick={() => handleFilterSelect(type)}
                className={`px-3 py-2 text-xs font-medium transition ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type === 'DTF Textil' ? 'DTF' : type === 'UV DTF' ? 'UV' : type}
              </button>
            ))}
          </div>

          {/* Segmented Control: View Mode */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-xs font-medium transition ${
                viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-xs font-medium transition ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE HISTORIAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-lg relative">
            <button
              onClick={closeHistoryModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <History className="text-purple-600" size={24} />
              Historial de {selectedClient?.name || selectedClient?.razon_social || selectedClient?.alias || ''}
            </h2>

            {/* Gestión de credenciales de cliente */}
            <div className="mb-6">
              <ClienteCredentialsManager 
                customer={selectedClient} 
                onUpdate={() => fetchCustomersWithPrograms()}
              />
            </div>

            {isLoadingHistory ? (
              <p className="text-center text-gray-500 py-8">Cargando historial...</p>
            ) : clientHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay registros de pedidos para este cliente.</p>
            ) : (
              <>
                {/* Estadísticas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {(() => {
                    const stats = calculateHistoryStats(clientHistory, selectedClient, historyTypeFilter);
                    const formatMeters = (value) => `${(Number(value) || 0).toFixed(2)}m`;
                    const lastCompletedLabel = stats.lastCompletedDate
                      ? formatDate(stats.lastCompletedDate).split(',')[0]
                      : null;
                    const typeLabel = historyTypeFilter ? historyTypeFilter : 'Todos los programas';

                    return (
                      <>
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{formatMeters(stats.consumedActive)}</p>
                          <p className="text-sm text-gray-600">Metros consumidos</p>
                          <p className="text-xs text-gray-500 mt-1">{stats.activeBreakdown || '—'}</p>
                          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{typeLabel}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{formatMeters(stats.totalActiveRemaining)}</p>
                          <p className="text-sm text-gray-600">Saldo activo</p>
                          <p className="text-xs text-gray-500 mt-1">
                            de {formatMeters(stats.totalActiveMeters)} contratados · consumido {formatMeters(stats.consumedActive)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{typeLabel}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">{stats.completedCount}</p>
                          <p className="text-sm text-gray-600">Folios completados</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {lastCompletedLabel ? `Último: ${lastCompletedLabel}` : 'Sin registros recientes'}
                            {stats.totalTrackedFolios ? ` · Historial: ${stats.totalTrackedFolios}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{typeLabel}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Lista de historial agrupada por programa */}
                <div className="space-y-6">
                  {(() => {
                    if (!clientHistory || !clientHistory.length) return <p className="text-center text-gray-500 py-4">No hay registros para este cliente.</p>;

                    const grouped = clientHistory.reduce((acc, rec) => {
                      const key = rec.program_folio || `${rec.program_id || 'sin-programa'}-${rec.program_number || rec.type || 'General'}`;
                      if (!acc[key]) {
                        acc[key] = {
                          label: rec.program_number
                            ? `Programa #${rec.program_number} (${rec.type || 'Sin tipo'})`
                            : (rec.type || 'General'),
                          folio: rec.program_folio || null,
                          records: []
                        };
                      }
                      acc[key].records.push(rec);
                      return acc;
                    }, {});

                    return Object.entries(grouped).map(([groupKey, groupData]) => {
                      const sortedRecords = [...(groupData.records || [])].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
                      const ascendingRecords = [...sortedRecords].reverse();

                      const programMeta = (() => {
                        if (!selectedClient?.programs) return null;
                        const sample = sortedRecords[0] || groupData.records?.[0];
                        if (!sample || !sample.type) return null;
                        const typePrograms = selectedClient.programs[sample.type] || { active: [], historical: [] };
                        const combined = [...(typePrograms.active || []), ...(typePrograms.historical || [])];
                        if (groupData.folio) {
                          const byFolio = combined.find(p => p.program_folio === groupData.folio);
                          if (byFolio) return byFolio;
                        }
                        if (sample.program_id) {
                          const byId = combined.find(p => p.id === sample.program_id);
                          if (byId) return byId;
                        }
                        if (sample.program_number) {
                          const byNumber = combined.find(p => p.program_number === sample.program_number);
                          if (byNumber) return byNumber;
                        }
                        return combined[0] || null;
                      })();

                      if (historyTypeFilter && groupData.records.every(rec => (rec.type || '').toLowerCase() !== historyTypeFilter.toLowerCase())) {
                        return null;
                      }

                      const remainingById = new Map();
                      const programTotal = programMeta ? parseMeters(programMeta.total_meters) : null;

                      if (programTotal !== null) {
                        let running = roundMeters(programTotal);
                        ascendingRecords.forEach(record => {
                          const consumed = parseMeters(record.meters_consumed) || 0;
                          let computedRemaining = running !== null && Number.isFinite(running)
                            ? roundMeters(running - consumed)
                            : null;
                          const snapshot = parseMeters(record.remaining_meters);
                          let displayRemaining = computedRemaining;

                          if (snapshot !== null && Number.isFinite(snapshot)) {
                            const diff = computedRemaining !== null && Number.isFinite(computedRemaining)
                              ? Math.abs(snapshot - computedRemaining)
                              : null;

                            if (diff !== null && diff <= 0.05) {
                              displayRemaining = roundMeters(snapshot);
                            } else if (computedRemaining === null || !Number.isFinite(computedRemaining)) {
                              displayRemaining = roundMeters(snapshot);
                            } else {
                              displayRemaining = roundMeters(computedRemaining);
                            }
                          }

                          if (displayRemaining === null || !Number.isFinite(displayRemaining)) {
                            displayRemaining = 0;
                          }

                          displayRemaining = Math.max(displayRemaining, 0);
                          remainingById.set(record.id, roundMeters(displayRemaining));
                          running = displayRemaining;
                        });
                      } else {
                        let running = parseMeters(sortedRecords[0]?.remaining_meters);
                        if (running === null && programMeta) {
                          running = parseMeters(programMeta.remaining_meters);
                        }

                        if (running !== null) {
                          running = roundMeters(running);
                          sortedRecords.forEach(record => {
                            const stored = parseMeters(record.remaining_meters);
                            const consumed = parseMeters(record.meters_consumed) || 0;

                            if (stored !== null) {
                              running = roundMeters(stored);
                            }

                            if (running !== null && Number.isFinite(running)) {
                              remainingById.set(record.id, roundMeters(running));
                              running = roundMeters(running + consumed);
                            }
                          });
                        } else {
                          sortedRecords.forEach(record => {
                            const stored = parseMeters(record.remaining_meters);
                            if (stored !== null) {
                              remainingById.set(record.id, roundMeters(stored));
                            }
                          });
                        }
                      }

                      const purchaseDateLabel = programMeta?.purchase_date
                        ? formatDate(programMeta.purchase_date)
                        : null;

                      return (
                        <div key={groupKey} className="bg-white border border-gray-200 rounded-lg">
                          <div className="px-4 py-3 border-b flex items-center justify-between">
                            <div className="font-semibold flex items-center gap-3 flex-wrap">
                              <span>{groupData.label}</span>
                              {groupData.folio && (
                                <span className="text-xs font-mono bg-gray-900/10 text-gray-700 px-2 py-1 rounded-full uppercase tracking-wide">
                                  Folio {groupData.folio}
                                </span>
                              )}
                              {purchaseDateLabel && (
                                <span className="text-xs text-gray-500 font-normal">
                                  Compra: {purchaseDateLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{sortedRecords.length} movimiento(s)</div>
                          </div>
                          <div className="divide-y">
                            {sortedRecords.map(record => {
                              const metersConsumed = parseMeters(record.meters_consumed) || 0;
                              const displayRemaining = remainingById.has(record.id)
                                ? remainingById.get(record.id)
                                : parseMeters(record.remaining_meters);

                              return (
                                <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Clock className="text-gray-400" size={16} />
                                      <span className="text-lg font-semibold text-blue-600">{metersConsumed.toFixed(2)}m</span>
                                      <span className="text-sm text-gray-500">- {formatDate(record.recorded_at, { useUTC: true })}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Registrado por: {record.recorded_by || 'Sistema'}
                                      {record.observaciones ? ` • ${record.observaciones}` : ''}
                                      {displayRemaining !== null && displayRemaining !== undefined && Number.isFinite(displayRemaining) && (
                                        <span className="block text-xs text-gray-500 mt-1">
                                          Saldo restante: {displayRemaining.toFixed(2)}m
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openHistoryPostPedidoModal(record)}
                                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                      title="Abrir opciones de WhatsApp y ticket para este pedido"
                                    >
                                      <FileText size={14} />
                                      Acciones
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL para agregar nuevo cliente */}
      {addClientModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                console.log('❌ Closing addClientModal');
                setAddClientModalOpen(false);
                clearCustomerSelection();
                setIsExistingCustomer(true);
                setNewClientData({ name: "", type: "", totalMeters: "", numeroWpp: "", lastPurchase: "" });
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Agregar Programa de Lealtad
            </h2>

            <div className="flex flex-col gap-4">
              <label className="block text-gray-700 font-bold">Seleccionar Cliente *</label>
              
              {/* Searchable Dropdown */}
              <div className="relative">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, alias o teléfono..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                      if (!e.target.value.trim()) {
                        clearCustomerSelection();
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="border rounded-l px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {selectedCustomerId && (
                    <button
                      onClick={clearCustomerSelection}
                      className="border-t border-r border-b rounded-r px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title="Limpiar selección"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {showCustomerDropdown && customerSearchQuery.trim() && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredCustomersForDropdown.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        <div className="text-lg mb-1">🔍</div>
                        No se encontraron clientes
                      </div>
                    ) : (
                      filteredCustomersForDropdown.map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => selectCustomerFromDropdown(customer)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {highlightMatch(customer.razon_social, customerSearchQuery)}
                          </div>
                          {customer.alias && customer.alias !== customer.razon_social && (
                            <div className="text-sm text-gray-600">
                              Alias: {highlightMatch(customer.alias, customerSearchQuery)}
                            </div>
                          )}
                          {customer.celular && (
                            <div className="text-sm text-gray-500">
                              📱 {highlightMatch(customer.celular, customerSearchQuery)}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Click overlay to close dropdown */}
                {showCustomerDropdown && (
                  <div 
                    className="fixed inset-0 z-5" 
                    onClick={() => setShowCustomerDropdown(false)}
                  />
                )}
              </div>

              {selectedCustomerId ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-green-600">✓</div>
                    <div>
                      <div className="font-medium text-green-800">Cliente seleccionado:</div>
                      <div className="text-green-700">{selectedCustomerName}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Busca y selecciona el cliente para crear su programa de lealtad
                </p>
              )}
              
              <label className="block text-gray-700 font-bold">Número de WhatsApp</label>
              {selectedCustomerId && selectedCustomerWhatsApp && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <span className="text-blue-700">Número actual: </span>
                  <span className="font-medium">{selectedCustomerWhatsApp}</span>
                </div>
              )}
              <input
                type="text"
                placeholder={selectedCustomerId && !selectedCustomerWhatsApp ? 
                  "El cliente no tiene WhatsApp registrado" : 
                  "Número de WhatsApp"
                }
                value={newClientData.numeroWpp}
                onChange={(e) => setNewClientData({ ...newClientData, numeroWpp: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                Formato recomendado: <b>521XXXXXXXXXX</b> (ejemplo para México, incluye código de país y número sin espacios ni signos)
                {selectedCustomerId && newClientData.numeroWpp !== selectedCustomerWhatsApp && (
                  <span className="block text-orange-600 mt-1">
                    ⚠️ Al guardar se actualizará el número de WhatsApp del cliente
                  </span>
                )}
              </span>

              {/* Mostrar programas existentes del cliente */}
              {selectedCustomerId && selectedCustomerPrograms.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <div className="text-sm font-medium text-amber-800 mb-2">
                    📋 Programas activos de este cliente:
                  </div>
                  {selectedCustomerPrograms.map((program, index) => (
                    <div key={index} className="text-sm text-amber-700 mb-1">
                      • <strong>{program.type}</strong>: {program.remaining_meters}/{program.total_meters} metros restantes
                    </div>
                  ))}
                </div>
              )}
              
              <label className="block text-gray-700 font-bold">Tipo de programa *</label>
              {availableProgramTypes.length === 0 ? (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-red-800 font-medium">⚠️ No se pueden crear más programas</div>
                  <div className="text-red-600 text-sm mt-1">
                    Este cliente ya tiene programas activos de todos los tipos disponibles.
                    Completa los programas existentes antes de crear nuevos.
                  </div>
                </div>
              ) : (
                <>
                  <select
                    value={newClientData.type}
                    onChange={(e) => setNewClientData({ ...newClientData, type: e.target.value })}
                    className="border rounded px-3 py-2 w-full"
                    disabled={!selectedCustomerId}
                  >
                    {!selectedCustomerId && <option value="">Primero selecciona un cliente</option>}
                    {availableProgramTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {selectedCustomerId && availableProgramTypes.length < 2 && (
                    <div className="text-sm text-blue-600 mt-1">
                      ℹ️ Solo se muestran los tipos de programa que no tiene activos este cliente
                    </div>
                  )}
                </>
              )}
              
              <label className="block text-gray-700 font-bold">Metros totales del programa *</label>
              <input
                type="number"
                placeholder="Metros totales del programa"
                value={newClientData.totalMeters}
                onChange={(e) => setNewClientData({ ...newClientData, totalMeters: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              
              <label className="block text-gray-700 font-bold">Fecha de compra *</label>
              <input
                type="date"
                placeholder="Fecha de compra"
                value={newClientData.lastPurchase}
                onChange={(e) => setNewClientData({ ...newClientData, lastPurchase: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              
              <button
                onClick={handleAddClient}
                disabled={availableProgramTypes.length === 0 || !selectedCustomerId}
                className={`px-4 py-2 rounded transition ${
                  availableProgramTypes.length === 0 || !selectedCustomerId
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Crear Programa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {editClientModalOpen && editingClientData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative max-h-[450px] overflow-y-auto">
            <button
              onClick={handleCloseEditModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Editar cliente</h2>
            <div className="flex flex-col gap-4">
              <label className="block text-gray-700 font-bold">Nombre *</label>
              <input
                type="text"
                value={editingClientData.name}
                onChange={e => setEditingClientData({ ...editingClientData, name: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold">Número de WhatsApp</label>
              <input
                type="text"
                value={editingClientData.numeroWpp}
                onChange={e => setEditingClientData({ ...editingClientData, numeroWpp: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                Formato recomendado: <b>521XXXXXXXXXX</b> (ejemplo para México, incluye código de país y número sin espacios ni signos)
              </span>
              <label className="block text-gray-700 font-bold">Tipo de programa *</label>
              <select
                value={editingClientData.type}
                onChange={e => setEditingClientData({ ...editingClientData, type: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="DTF Textil">DTF Textil</option>
                <option value="UV DTF">UV DTF</option>
              </select>
              <label className="block text-gray-700 font-bold">Metros totales *</label>
              <input
                type="number"
                value={editingClientData.totalMeters}
                onChange={e => setEditingClientData({ ...editingClientData, totalMeters: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Metros restantes *</label>
              <input
                type="number"
                value={editingClientData.remainingMeters}
                onChange={e => setEditingClientData({ ...editingClientData, remainingMeters: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Fecha de última compra</label>
              <input
                type="date"
                value={editingClientData.lastPurchase}
                onChange={e => setEditingClientData({ ...editingClientData, lastPurchase: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />

              <label className="block text-gray-700 font-bold">Razón de Edición *</label>
              <input
                type="text"
                value={editingClientData.editReason || ""}
                onChange={e => setEditingClientData({ ...editingClientData, editReason: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                placeholder="Explica la razón de la edición"
              />
              <label className="block text-gray-700 font-bold">Quién autoriza la edición *</label>
              <input
                type="text"
                value={editingClientData.editAuthorizedBy || ""}
                onChange={e => setEditingClientData({ ...editingClientData, editAuthorizedBy: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                placeholder="Nombre de quien autoriza"
              />

              <button
                onClick={handleSaveEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {deleteModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Eliminar cliente</h2>
            <p className="mb-2">¿Por qué deseas eliminar a <strong>{selectedClient.name}</strong>?</p>
            <div className="flex flex-col gap-2 mb-4">
              {deleteReasonsList.map(reason => (
                <label key={reason} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deleteReason.includes(reason)}
                    onChange={() => toggleReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
            <label className="block text-gray-700 font-bold mb-2">Tu nombre *</label>
            <input
              type="text"
              value={deletorName}
              onChange={e => setDeletorName(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-4"
              placeholder="Escribe tu nombre"
            />
            <button
              onClick={handleDeleteClient}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Confirmar eliminación
            </button>
          </div>
        </div>
      )}

      {/* Muestra la tabla de clientes solo si activeTab === "clientes" */}
      {activeTab === "clientes" && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando clientes...</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No hay clientes</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No se encontraron clientes con ese criterio de búsqueda' : 'Aún no tienes clientes registrados'}
              </p>
              <button
                onClick={() => setAddClientModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Agregar Primer Cliente
              </button>
            </div>
          ) : viewMode === 'table' ? (
            <CustomerLoyaltyTable
              customers={filteredCustomers}
              onAddProgram={openAddProgramModal}
              onRegisterMeters={handleRegisterMeters}
              onOpenHistory={openHistoryModal}
              onOpenProgramHistory={openProgramHistory}
            />
          ) : (
            <div className="space-y-4 pb-4">
              {filteredCustomers.map(customer => (
                <CustomerLoyaltyCard
                  key={customer.id}
                  customer={customer}
                  programs={customer.programs}
                  isExpanded={isExpanded(customer.id)}
                  onToggleExpand={() => toggleExpand(customer.id)}
                  onAddProgram={openAddProgramModal}
                  onEditProgram={handleEditProgram}
                  onRegisterMeters={handleRegisterMeters}
                  onProgramWhatsApp={handleProgramWhatsApp}
                  onProgramPrint={handleProgramPrintTicket}
                  onOpenProgramHistory={openProgramHistory}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Muestra la tabla de historial global solo si activeTab === "historial" */}
      {activeTab === "historial" && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="text-purple-600" size={24} />
              Historial Global de Movimientos
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportGlobalHistoryToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Exportar a Excel
              </button>
              <button
                onClick={() => setActiveTab("clientes")}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 flex items-center"
                title="Cerrar historial global"
              >
                <X size={18} className="mr-1" />
                Cerrar
              </button>
            </div>
          </div>
          {isLoadingGlobalHistory ? (
            <p className="text-center text-gray-500 py-8">Cargando historial...</p>
          ) : globalHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Folio</th>
                    <th className="px-4 py-2 text-left">Metros consumidos</th>
                    <th className="px-4 py-2 text-left">Saldo restante</th>
                    <th className="px-4 py-2 text-left">Registrado por</th>
                    <th className="px-4 py-2 text-left">Observaciones</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {globalHistory.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="px-4 py-2">{formatDate(record.recorded_at, { useUTC: true })}</td>
                      <td className="px-4 py-2">{record.client_name}</td>
                      <td className="px-4 py-2">{record.type || ""}</td>
                      <td className="px-4 py-2 font-mono text-xs">{record.program_folio || '—'}</td>
                      <td className="px-4 py-2">{record.meters_consumed}m</td>
                      <td className="px-4 py-2">{record.remaining_meters !== null && record.remaining_meters !== undefined ? `${Number(record.remaining_meters).toFixed(2)}m` : '—'}</td>
                      <td className="px-4 py-2">{record.recorded_by}</td>
                      <td className="px-4 py-2">{record.observaciones || ""}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteHistoryRecord(record.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded-full"
                          title="Eliminar registro"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL POST PEDIDO CON OPCIÓN DE TICKET */}
      {postPedidoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-green-600">¡Pedido Registrado Exitosamente!</h3>
              <button onClick={closePostPedidoModal} className="text-gray-400">✕</button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded">
              <div className="font-semibold">{ultimoPedidoGuardado?.customerName || ticketData?.client?.name}</div>
              <div className="text-sm text-blue-700">
                {(ultimoPedidoGuardado?.metros || ticketData?.order?.metersConsumed || 0).toFixed(2)}m consumidos de <strong>{ultimoPedidoGuardado?.type || ticketData?.client?.type}</strong>
              </div>
              {(ultimoPedidoGuardado?.programFolio || ticketData?.order?.programFolio || ticketData?.client?.programFolio) && (
                <div className="text-xs font-semibold text-blue-800">
                  Folio programa: {ultimoPedidoGuardado?.programFolio || ticketData?.order?.programFolio || ticketData?.client?.programFolio}
                </div>
              )}
              <div className="text-xs text-gray-600">Registrado por: {ultimoPedidoGuardado?.registeredBy || ticketData?.order?.recordedBy || 'Sistema'}</div>
            </div>

            <div className="mt-4 space-y-2">
              <button onClick={handleGenerateTicket} className="w-full bg-blue-600 text-white px-4 py-2 rounded">
                Generar Ticket de Lealtad
              </button>
              {/* Enlace directo a WhatsApp para evitar que window.open sea bloqueado por popups */}
              {(() => {
                const cliente = ticketData?.client || {};
                const pedido = ticketData?.order || {};
                const phoneRaw = cliente?.celular || cliente?.numeroWpp || cliente?.numero_wpp || cliente?.loyaltyProgramPhone || '';
                const phone = String(phoneRaw || '').replace(/\D/g, '').trim();
                if (phone && phone.length >= 8) {
                  const tipo = cliente?.type || '';
                  const fecha = pedido?.recordedAt ? new Date(pedido.recordedAt).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');
                  const metros = pedido?.metersConsumed || 0;
                  const restantes = cliente?.remainingMeters ?? '';
                  const metrosTxt = typeof metros === 'number' ? metros.toFixed(2) : metros;
                  const restantesTxt = typeof restantes === 'number' ? restantes.toFixed(2) : restantes;
                  const message = `Saludos ${cliente.name || ''}\nLe informamos que su pedido de ${tipo} ya está listo para que pase por el.\nEl día ${fecha} consumiste ${metrosTxt} metros de tu programa de lealtad ${tipo}. Te quedan ${restantesTxt} metros en tu plan. ¡Gracias por tu preferencia!`;
                  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="w-full inline-block text-center bg-green-600 text-white px-4 py-2 rounded">
                      Enviar WhatsApp
                    </a>
                  );
                }
                // Fallback: si no hay número válido, usar el botón que ejecuta la función con alert
                return (
                  <button onClick={handleSendWhatsApp} className="w-full bg-green-600 text-white px-4 py-2 rounded">
                    Enviar WhatsApp
                  </button>
                );
              })()}
              <button onClick={closePostPedidoModal} className="w-full bg-gray-200 px-4 py-2 rounded">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE DEL TICKET */}
      <LoyaltyTicket
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        ticketData={ticketData}
      />



      {/* MODAL PARA REGISTRAR METROS */}
      {registerMetersModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setRegisterMetersModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Registrar pedido para {selectedCustomerForMeters?.razon_social}</h2>

            <form onSubmit={handleSubmitMeters} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metros consumidos *</label>
                <input
                  type="number"
                  placeholder="Metros consumidos"
                  value={metersToRegister}
                  onChange={(e) => setMetersToRegister(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registrado por *</label>
                <select
                  value={registeredBy}
                  onChange={e => setRegisteredBy(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                >
                  <option value="">Selecciona...</option>
                  <option value="Jasiel">Jasiel</option>
                  <option value="Daniela">Daniela</option>
                  <option value="Karla">Karla</option>
                  <option value="Eduardo">Eduardo</option>
                  <option value="Otro">Otro</option>
                </select>
                {registeredBy === "Otro" && (
                  <input
                    type="text"
                    placeholder="Escribe el nombre"
                    value={registeredByCustom}
                    onChange={e => setRegisteredByCustom(e.target.value)}
                    className="border rounded px-3 py-2 w-full mt-2"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  placeholder="Notas adicionales (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="border rounded px-3 py-2 w-full h-20 resize-none"
                />
              </div>

              {selectedProgramId && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p>
                    <strong>Metros restantes actuales:</strong> {activePrograms.find(p => p.id === selectedProgramId)?.remaining_meters}m
                  </p>
                  <p>
                    <strong>Después del pedido:</strong>{' '}
                    {(() => {
                      const cur = activePrograms.find(p => p.id === selectedProgramId)?.remaining_meters || 0;
                      const after = Number((cur - Number(metersToRegister || 0)).toFixed(2));
                      return after.toFixed(2) + 'm';
                    })()}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-2">Autorización del cliente *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autorizacionCliente}
                    onChange={e => setAutorizacionCliente(e.target.checked)}
                    id="autorizacionCliente"
                  />
                  <label htmlFor="autorizacionCliente" className="text-sm text-gray-700">
                    El cliente autoriza este pedido y está conforme.
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterMetersModalOpen(false);
                    setMetersToRegister('');
                    setSelectedProgramId('');
                    setAutorizacionCliente(false);
                    setRegisteredBy(getCurrentUser());
                    setRegisteredByCustom('');
                    isSubmittingMetersRef.current = false;
                    setIsSubmittingMeters(false);
                  }}
                  className="px-4 py-2 rounded border hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMeters}
                  className={`px-4 py-2 rounded text-white transition-colors ${
                    isSubmittingMeters
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR PROGRAMA */}
      {editProgramModalOpen && editingProgramData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => { setEditProgramModalOpen(false); setEditingProgramData(null); }}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Editar Programa de Lealtad</h2>

            <form onSubmit={handleSaveProgramEdit} className="space-y-4">
              <div className="text-sm text-gray-600">
                <div><strong>Cliente:</strong> {editingProgramData.customerName}</div>
                <div><strong>Tipo:</strong> {editingProgramData.type} • <strong>Programa #</strong> {editingProgramData.program_number}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metros totales *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingProgramData.total_meters}
                  onChange={e => setEditingProgramData({ ...editingProgramData, total_meters: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metros restantes *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingProgramData.remaining_meters}
                  onChange={e => setEditingProgramData({ ...editingProgramData, remaining_meters: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra *</label>
                <input
                  type="date"
                  value={editingProgramData.purchase_date}
                  onChange={e => setEditingProgramData({ ...editingProgramData, purchase_date: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón de edición *</label>
                <input
                  type="text"
                  value={editingProgramData.edit_reason}
                  onChange={e => setEditingProgramData({ ...editingProgramData, edit_reason: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quién autoriza la edición *</label>
                <input
                  type="text"
                  value={editingProgramData.edit_authorized_by}
                  onChange={e => setEditingProgramData({ ...editingProgramData, edit_authorized_by: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <button
                onClick={handleSaveProgramEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🛡️ MODAL DE ADVERTENCIA DE DUPLICADO */}
      {duplicateWarningModalOpen && previousTodayRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl relative animate-scale-in">
            <div className="absolute top-3 right-3">
              <button
                onClick={handleCancelDuplicate}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Header con icono de alerta */}
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-900">⚠️ Posible Registro Duplicado</h2>
                <p className="text-sm text-amber-700">Ya hay un registro hoy para este programa</p>
              </div>
            </div>

            {/* Información del registro previo */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="text-amber-600" size={20} />
                <h3 className="font-semibold text-amber-900">Registro Anterior de Hoy:</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">📏 Metros consumidos:</span>
                  <span className="font-bold text-amber-900">{Number(previousTodayRecord.meters_consumed).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">👤 Registrado por:</span>
                  <span className="font-semibold text-amber-900">{previousTodayRecord.recorded_by || 'No especificado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🕐 Hora:</span>
                  <span className="font-medium text-amber-900">
                    {new Date(previousTodayRecord.recorded_at).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {previousTodayRecord.observaciones && (
                  <div className="pt-2 border-t border-amber-200">
                    <span className="text-gray-600 block mb-1">📝 Observaciones:</span>
                    <span className="text-amber-900 italic">"{previousTodayRecord.observaciones}"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información del nuevo registro */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="text-blue-600" size={20} />
                <h3 className="font-semibold text-blue-900">Nuevo Registro que Deseas Agregar:</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">📏 Metros a consumir:</span>
                  <span className="font-bold text-blue-900">{Number(metersToRegister).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">👤 Registrado por:</span>
                  <span className="font-semibold text-blue-900">
                    {registeredBy === 'Otro' ? registeredByCustom : registeredBy}
                  </span>
                </div>
                {observaciones && (
                  <div className="pt-2 border-t border-blue-200">
                    <span className="text-gray-600 block mb-1">📝 Observaciones:</span>
                    <span className="text-blue-900 italic">"{observaciones}"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mensaje de advertencia */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
              <p className="text-sm text-red-800">
                <strong>⚠️ Atención:</strong> Si continúas, se descontarán{' '}
                <strong className="text-red-900">{Number(metersToRegister).toFixed(2)}m adicionales</strong> del programa.
                Esto puede causar un descuento duplicado si ya se registró este pedido.
              </p>
            </div>

            {/* Pregunta de confirmación */}
            <div className="mb-5">
              <p className="text-center text-lg font-semibold text-gray-800 mb-2">
                ¿Estás seguro de que deseas continuar?
              </p>
              <p className="text-center text-sm text-gray-600">
                Verifica que este registro sea correcto y no sea un duplicado
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDuplicate}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar (Recomendado)
              </button>
              <button
                onClick={handleConfirmDuplicate}
                className="flex-1 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sí, Registrar de Todas Formas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// export is handled by the function declaration at the top