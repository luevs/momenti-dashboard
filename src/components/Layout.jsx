import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Printer, BarChart2, ClipboardList, Users, Settings, DollarSign, Package2, LogOut } from 'lucide-react';
import { isAdmin } from '../utils/auth';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Leer usuario actual desde localStorage para mostrar su nombre en el header
  const rawCurrent = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
  let currentUser = null;
  try {
    currentUser = rawCurrent ? JSON.parse(rawCurrent) : null;
  } catch (e) {
    currentUser = null;
  }

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

  const handleLogout = () => {
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
          <h1 className="text-xl font-semibold">{currentUser?.name || currentUser?.username || 'Panel de Control'}</h1>
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