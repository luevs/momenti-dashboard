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
        { path: '/trabajo-ocr', label: 'Carga de Tirajes', icon: FileImage },
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
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="w-64 bg-white shadow-lg border-r border-slate-200">
        <Link to="/" className="block px-6 py-6 border-b border-slate-100">
          <img src="/momenti-logo.jpg" alt="Momenti" className="mx-auto h-10 object-contain" />
          <div className="text-center mt-2">
            <div className="text-sm font-semibold text-slate-700">Momenti</div>
            <div className="text-xs text-slate-500">Panel</div>
          </div>
        </Link>

        <nav className="px-4 py-6 space-y-1">
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
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.path, item)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {Icon && <Icon size={18} />}
                      <span>{item.label}</span>
                    </span>
                    <span className={`text-xs transition-transform duration-200 ${openSubmenu === item.path ? 'rotate-90' : ''} ${isActive(item.path, item) ? 'text-blue-500' : 'text-slate-400'}`}>▸</span>
                  </Link>
                  <div
                    className={`${openSubmenu === item.path ? 'block' : 'hidden'} absolute left-full top-0 ml-2 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-xl py-2 min-w-[200px] z-50`}
                  >
                    {item.children.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        onClick={() => setOpenSubmenu(null)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 ${location.pathname === sub.path ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-500' : 'text-slate-600'}`}
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path, item)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon size={18} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {(() => {
                  // Determinar el título basado en la ruta actual
                  const path = location.pathname;
                  if (path === '/') return 'Dashboard';
                  if (path === '/clientes-lealtad') return 'Clientes con Programa de Lealtad';
                  if (path === '/operacion') return 'Operación de Máquinas';
                  if (path === '/trabajo-ocr') return 'Carga de Tirajes OCR';
                  if (path === '/insumos') return 'Gestión de Insumos';
                  if (path === '/reportes') return 'Reportes y Análisis';
                  if (path === '/corte') return 'Corte de Caja';
                  if (path === '/configuracion') return 'Configuración del Sistema';
                  if (path === '/usuarios') return 'Gestión de Usuarios';
                  
                  // Fallback genérico
                  const menuItem = menuItems.find(item => {
                    if (item.path === path) return true;
                    if (item.children) {
                      return item.children.some(child => child.path === path);
                    }
                    return false;
                  });
                  
                  if (menuItem?.children) {
                    const childItem = menuItem.children.find(child => child.path === path);
                    if (childItem) return childItem.label;
                  }
                  
                  return menuItem?.label || 'Panel de Control';
                })()}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {currentUser?.name || currentUser?.username || currentUser?.email || 'Bienvenido al sistema'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">
                  {new Date().toLocaleDateString('es-MX', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date().toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              <div className="h-8 w-px bg-slate-200"></div>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-50">
          <div className="h-full max-w-7xl mx-auto px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}