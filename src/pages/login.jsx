import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuthWithLogging } from '../utils/useAuthWithLogging';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin, logAccess } = useAuthWithLogging();

  // Credenciales temporales de fallback (solo desarrollo)
  const VALID_USERNAME = 'admin';
  const VALID_PASSWORD = 'momenti2023';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1) Intentar autenticación con el sistema de logging
      const { user, error: authError } = await loginAdmin(username, password);
      
      if (!authError && user) {
        // Autenticación exitosa
        try {
          localStorage.setItem('currentUser', JSON.stringify({ 
            id: user.id, 
            email: user.email, 
            name: user.user_metadata?.name || user.email 
          }));
          localStorage.setItem('isAuthenticated', 'true');
        } catch(e) {
          console.warn('Error saving to localStorage:', e);
        }
        navigate('/');
        return;
      }

      // 2) Fallback: Intentamos autenticar con la función RPC 'check_user_password'
      try {
        const rpcRes = await supabase.rpc('check_user_password', { 
          p_identifier: username, 
          p_password: password 
        });
        
        if (!rpcRes.error && rpcRes.data) {
          const userRow = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
          if (userRow && (userRow.username || userRow.email)) {
            // Registrar el acceso manual para usuarios RPC
            await logAccess('admin', userRow.username || userRow.email, userRow.full_name || userRow.username);
            
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('currentUser', JSON.stringify({ 
              id: userRow.id, 
              username: userRow.username || userRow.email, 
              role: userRow.role, 
              name: userRow.full_name 
            }));
            navigate('/');
            return;
          }
        }
        if (rpcRes.error) {
          console.warn('RPC check_user_password error:', rpcRes.error);
          // proceed to fallback below
        }
      } catch (rpcErr) {
        console.warn('RPC check_user_password call failed:', rpcErr);
      }

      // 3) Fallback: credenciales de desarrollo local
      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        // Registrar acceso local
        await logAccess('admin', VALID_USERNAME, 'Local Admin');
        
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify({ 
          id: 'local-admin', 
          username: VALID_USERNAME, 
          role: 'admin', 
          name: 'Local Admin' 
        }));
        navigate('/');
        return;
      }

      setError('Usuario o contraseña incorrectos');
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error de conexión. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <img 
            src="/momenti-logo.jpg" 
            alt="Momenti Logo" 
            className="mx-auto h-16 mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900">
            Dashboard Momenti
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <LogIn size={18} />
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500">
        </div>
      </div>
    </div>
  );
}