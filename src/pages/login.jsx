import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Credenciales temporales de fallback (solo desarrollo)
  const VALID_USERNAME = 'admin';
  const VALID_PASSWORD = 'momenti2023';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Intentamos autenticar con la función RPC 'check_user_password' que compara password_hash
      try {
        const rpcRes = await supabase.rpc('check_user_password', { p_identifier: username, p_password: password });
        if (!rpcRes.error && rpcRes.data) {
          const userRow = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
          if (userRow && (userRow.username || userRow.email)) {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('currentUser', JSON.stringify({ id: userRow.id, username: userRow.username || userRow.email, role: userRow.role, name: userRow.full_name }));
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
        // proceed to fallback
      }

      // Fallback: si no existe la tabla o el usuario en la tabla, usar credenciales de desarrollo
      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify({ id: 'local-admin', username: VALID_USERNAME, role: 'admin', name: 'Local Admin' }));
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
          Consejo: por ahora el login usa la tabla <span className="font-mono">users_admin</span> si existe. Si no existe, funciona el credencial local <span className="font-mono">admin / momenti2023</span> para desarrollo.
        </div>
      </div>
    </div>
  );
}