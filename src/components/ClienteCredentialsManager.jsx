import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ClienteCredentialsManager({ customer, onUpdate }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      alert('Por favor ingresa una contraseña');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers_')
        .update({ client_password: newPassword.trim() })
        .eq('id', customer.id);

      if (error) {
        throw error;
      }

      alert('Contraseña actualizada correctamente');
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
    const credentials = `ID: ${customer.id}\nContraseña: ${customer.client_password || 'No asignada'}`;
    navigator.clipboard.writeText(credentials);
    alert('Credenciales copiadas al portapapeles');
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Acceso Cliente</h3>
        <button
          onClick={copyCredentials}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          📋 Copiar credenciales
        </button>
      </div>

      {/* Credenciales actuales */}
      <div className="bg-white rounded p-3 border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">ID Cliente:</span>
            <div className="font-mono font-semibold text-blue-600">{customer.id}</div>
          </div>
          <div>
            <span className="text-gray-500">Contraseña:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">
                {customer.client_password 
                  ? (showPassword ? customer.client_password : '••••••••')
                  : 'No asignada'
                }
              </span>
              {customer.client_password && (
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
          disabled={loading || !newPassword.trim()}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </div>

      {/* URL del dashboard */}
      <div className="text-xs text-gray-500 bg-gray-100 rounded p-2">
        <strong>URL para cliente:</strong><br/>
        <span className="font-mono">https://tu-dominio.com/cliente/login</span>
      </div>
    </div>
  );
}