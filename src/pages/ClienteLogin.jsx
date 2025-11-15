import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ClienteLogin() {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Buscar cliente por ID y verificar contraseña
      const { data: customer, error: fetchError } = await supabase
        .from('customers_')
        .select('id, razon_social, alias, celular, client_password')
        .eq('id', clientId)
        .single();

      if (fetchError || !customer) {
        setError('ID de cliente no encontrado');
        return;
      }

      // Verificar contraseña (en producción, usar hash)
      if (customer.client_password !== password) {
        setError('Contraseña incorrecta');
        return;
      }

      // Crear sesión
      localStorage.setItem('cliente_session', JSON.stringify({
        customer_id: customer.id,
        name: customer.razon_social || customer.alias,
        phone: customer.celular
      }));
      
      navigate('/cliente/dashboard');
      
    } catch (error) {
      setError('Error al iniciar sesión');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Mi Cuenta Momenti</h1>
          <p className="text-gray-600">Consulta tus metros de lealtad</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID de Cliente
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Ej: 12345"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña asignada"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !clientId || !password}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>¿No tienes acceso? Contacta con nosotros</p>
        </div>
      </div>
    </div>
  );
}