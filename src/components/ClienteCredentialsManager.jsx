import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClienteCredentialsManager({ customer, onUpdate }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accessCredentials, setAccessCredentials] = useState(null);
  const [loadingCredentials, setLoadingCredentials] = useState(true);

  // Cargar credenciales de acceso del cliente
  useEffect(() => {
    const fetchAccessCredentials = async () => {
      if (!customer?.id) return;
      
      setLoadingCredentials(true);
      try {
        const { data, error } = await supabase
          .from('client_access_credentials')
          .select('access_id, password, is_active')
          .eq('customer_id', customer.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching access credentials:', error);
        } else {
          setAccessCredentials(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingCredentials(false);
      }
    };

    fetchAccessCredentials();
  }, [customer?.id]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGeneratePassword = () => {
    const generated = generateRandomPassword();
    setNewPassword(generated);
  };

  const handleCreateCredentials = async () => {
    setLoading(true);
    try {
      // Generar un nuevo access_id secuencial
      const { data: maxIdData } = await supabase
        .from('client_access_credentials')
        .select('access_id')
        .order('access_id', { ascending: false })
        .limit(1);
      
      let nextAccessId = '100'; // ID por defecto
      if (maxIdData && maxIdData.length > 0) {
        const maxId = parseInt(maxIdData[0].access_id) || 99;
        nextAccessId = (maxId + 1).toString();
      }

      // Generar contraseña automáticamente
      const autoPassword = generateRandomPassword();

      // Crear credenciales en client_access_credentials
      const { data, error } = await supabase
        .from('client_access_credentials')
        .insert({
          customer_id: customer.id,
          access_id: nextAccessId,
          password: autoPassword,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Actualizar también en customers_ por compatibilidad
      await supabase
        .from('customers_')
        .update({ client_password: autoPassword })
        .eq('id', customer.id);

      alert(`✅ Credenciales creadas exitosamente!\n\nID de Acceso: ${nextAccessId}\nContraseña: ${autoPassword}`);
      
      // Actualizar credenciales localmente
      setAccessCredentials({
        customer_id: customer.id,
        access_id: nextAccessId,
        password: autoPassword,
        is_active: true
      });
      
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error creating credentials:', error);
      alert('Error al crear credenciales: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      alert('Por favor ingresa una contraseña');
      return;
    }

    setLoading(true);
    try {
      // Actualizar en client_access_credentials
      const { error } = await supabase
        .from('client_access_credentials')
        .update({ password: newPassword.trim() })
        .eq('customer_id', customer.id);

      if (error) {
        throw error;
      }

      // Actualizar también en customers_ por compatibilidad
      await supabase
        .from('customers_')
        .update({ client_password: newPassword.trim() })
        .eq('id', customer.id);

      alert('Contraseña actualizada correctamente');
      
      // Actualizar credenciales localmente
      setAccessCredentials(prev => ({
        ...prev,
        password: newPassword.trim()
      }));
      
      onUpdate && onUpdate();
      setNewPassword('');
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      alert('Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    const id = accessCredentials?.access_id || customer.id;
    const password = accessCredentials?.password || 'No asignada';
    const credentials = `ID: ${id}\nContraseña: ${password}`;
    navigator.clipboard.writeText(credentials);
    alert('Credenciales copiadas al portapapeles');
  };

  const sendWhatsAppCredentials = () => {
    if (!customer?.celular) {
      alert('Este cliente no tiene número de teléfono registrado');
      return;
    }

    const id = accessCredentials?.access_id || customer.id;
    const password = accessCredentials?.password || 'No asignada';
    const customerName = customer?.razon_social || customer?.alias || 'estimado cliente';
    
    const message = `Hola ${customerName}!

Tu portal de cliente ya esta disponible!

Accede con estas credenciales:
- ID: ${id}
- Contrasena: ${password}

Enlace: https://momentipromo.com/clientes/login

En tu portal podras:
- Ver el estado de tus programas de lealtad
- Consultar metros restantes
- Revisar tu historial de compras

Necesitas ayuda? Contactanos!`;

    const phoneNumber = customer.celular.replace(/\D/g, ''); // Solo números
    const whatsappUrl = `https://wa.me/52${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Acceso Cliente</h3>
        <div className="flex gap-2">
          {accessCredentials ? (
            <>
              <button
                onClick={copyCredentials}
                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
              >
                📋 Copiar credenciales
              </button>
              {customer?.celular && accessCredentials?.access_id && (
                <button
                  onClick={sendWhatsAppCredentials}
                  className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded border border-green-200 hover:bg-green-50"
                >
                  💬 Enviar WhatsApp
                </button>
              )}
            </>
          ) : (
            !loadingCredentials && (
              <button
                onClick={handleCreateCredentials}
                disabled={loading}
                className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Creando...' : '🔑 Crear Credenciales'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Credenciales actuales */}
      {loadingCredentials ? (
        <div className="bg-white rounded p-3 border text-center text-gray-500">
          Cargando credenciales...
        </div>
      ) : (
        <div className="bg-white rounded p-3 border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ID de Acceso:</span>
              <div className="font-mono font-semibold text-blue-600">
                {accessCredentials?.access_id || 'No asignado'}
              </div>
              {accessCredentials?.access_id && (
                <div className="text-xs text-gray-400">
                  (ID original: {customer.id})
                </div>
              )}
            </div>
            <div>
              <span className="text-gray-500">Contraseña:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">
                  {accessCredentials?.password 
                    ? (showPassword ? accessCredentials.password : '••••••••')
                    : 'No asignada'
                  }
                </span>
                {accessCredentials?.password && (
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
              {accessCredentials?.is_active === false && (
                <div className="text-xs text-red-500">
                  ⚠️ Acceso desactivado
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actualizar contraseña */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value.toUpperCase())}
            placeholder="Nueva contraseña"
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            maxLength="20"
          />
          <button
            onClick={handleGeneratePassword}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            title="Generar contraseña aleatoria"
          >
            🎲
          </button>
        </div>
        
        <button
          onClick={handleUpdatePassword}
          disabled={loading || !newPassword.trim() || !accessCredentials}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
        
        {!accessCredentials && !loadingCredentials && (
          <div className="space-y-3">
            <div className="text-xs text-orange-600 bg-orange-50 rounded p-2">
              ⚠️ Este cliente no tiene credenciales de acceso configuradas
            </div>
            <button
              onClick={handleCreateCredentials}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creando credenciales...' : '🔑 Crear Credenciales de Acceso'}
            </button>
          </div>
        )}
      </div>

      {/* URL del dashboard */}
      <div className="text-xs text-gray-500 bg-gray-100 rounded p-2">
        <strong>URL para cliente:</strong><br/>
        <span className="font-mono">https://tu-dominio.com/cliente/login</span>
      </div>
    </div>
  );
}