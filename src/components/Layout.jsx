import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Printer, BarChart2, ClipboardList, Users, Settings, DollarSign, Package2, LogOut } from 'lucide-react';
import { isAdmin } from '../utils/auth';
import { supabase } from '../supabaseClient';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Prefer session user from Supabase; fallback to localStorage
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session && session.user) {
        // session.user has email and user metadata; prefer metadata.name if present
        const user = session.user;
        const meta = (user.user_metadata) || {};
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: meta.name || meta.full_name || user.email,
          role: (meta.role || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')).role : null))
        });
      } else {
        // fallback: read existing localStorage used previously
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
          setCurrentUser(raw ? JSON.parse(raw) : null);
        } catch (e) {
          setCurrentUser(null);
        }
      }
    }).catch(() => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
        setCurrentUser(raw ? JSON.parse(raw) : null);
      } catch (e) {
        setCurrentUser(null);
      }
    });

    return () => { mounted = false; };
  }, []);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/maquinas', label: 'Maquinas', icon: Printer },
    { path: '/reportes', label: 'Reportes', icon: BarChart2 },
    { path: '/clientes', label: 'Clientes', icon: ClipboardList },
    { path: '/clientes-lealtad', label: 'Clientes Lealtad', icon: Users },
    { path: '/corte', label: 'Corte', icon: DollarSign },
    ...(isAdmin() ? [
      { path: '/configuracion', label: 'Configuración', icon: Settings },
      { path: '/usuarios', label: 'Usuarios', icon: Users },
    ] : []),
    { path: '/insumos', label: 'Insumos', icon: Package2 },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      <aside className="w-64 bg-white shadow-md p-6">
        <Link to="/" className="block mb-6">
          <img src="/momenti-logo.jpg" alt="Momenti" className="mx-auto h-12 object-contain" />
        </Link>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100'
                }`}
              >
                {Icon && <Icon size={20} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">{currentUser?.name || currentUser?.username || currentUser?.email || 'Panel de Control'}</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}