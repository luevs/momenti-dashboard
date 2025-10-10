import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Printer, BarChart2, ClipboardList, Users, Settings, DollarSign, Package2, LogOut, FileImage } from 'lucide-react';
import { isAdmin } from '../utils/auth';
import { supabase } from '../supabaseClient';
import useCurrentUser from '../utils/useCurrentUser';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentUser = useCurrentUser();
  // Keep any submenu open while moving the mouse to it; close with a slight delay
  const [openSubmenu, setOpenSubmenu] = React.useState(null); // stores parent path
  const hoverTimeoutRef = React.useRef(null);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    {
      path: '/maquinas', label: 'Maquinas', icon: Printer,
      children: [
        { path: '/operacion', label: 'Operación', icon: BarChart2 },
        { path: '/trabajo-ocr', label: 'Trabajos OCR', icon: FileImage },
        { path: '/insumos', label: 'Insumos', icon: Package2 },
      ]
    },
    { path: '/reportes', label: 'Reportes', icon: BarChart2 },
    {
      path: '/clientes', label: 'Clientes', icon: ClipboardList,
      children: [
        { path: '/clientes-lealtad', label: 'Clientes Lealtad', icon: Users },
      ]
    },
    { path: '/corte', label: 'Corte', icon: DollarSign },
    ...( (currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin')) || isAdmin() ? [
      { path: '/configuracion', label: 'Configuración', icon: Settings },
      { path: '/usuarios', label: 'Usuarios', icon: Users },
    ] : []),
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
            const isActive = (p, it) => location.pathname === p || (it.children && it.children.some(c => location.pathname.startsWith(c.path)));
            if (item.children && item.children.length) {
              return (
                <div
                  key={item.path}
                  className="relative"
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    setOpenSubmenu(item.path);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = setTimeout(() => {
                      setOpenSubmenu((curr) => (curr === item.path ? null : curr));
                    }, 200);
                  }}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center justify-between px-4 py-2 rounded ${
                      isActive(item.path, item)
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {Icon && <Icon size={20} />}
                      <span>{item.label}</span>
                    </span>
                    <span className="text-gray-400">▸</span>
                  </Link>
                  <div
                    className={`${openSubmenu === item.path ? 'block' : 'hidden'} absolute left-full top-0 ml-2 bg-white text-gray-800 border border-gray-200 rounded-md shadow-lg py-2 min-w-[180px] z-50`}
                  >
                    {item.children.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        onClick={() => setOpenSubmenu(null)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${location.pathname === sub.path ? 'bg-gray-100 font-medium' : ''}`}
                      >
                        {sub.icon && <sub.icon size={16} />}
                        <span>{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded ${
                  isActive(item.path, item)
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