import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Printer, 
  BarChart2, 
  ClipboardList, 
  Users, 
  Settings, 
  DollarSign, 
  FileImage,
  ChevronDown,
  ChevronRight,
  Receipt,
  Calculator,
  PieChart,
  Tag,
  Shield,
  Activity
} from "lucide-react";
import { isAdmin } from '../utils/auth';

export default function Sidebar() {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Auto-expandir menú de Caja si estamos en rutas de caja
  useEffect(() => {
    if (location.pathname.startsWith('/caja')) {
      setExpandedMenus(prev => ({ ...prev, caja: true }));
    }
  }, [location.pathname]);

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isMenuItemActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/maquinas", label: "Maquinas", icon: Printer },
    { path: "/operacion", label: "Operación", icon: BarChart2 },
   // { path: "/reportes", label: "Reportes", icon: BarChart2 },
    { path: "/trabajo-ocr", label: "Trabajos OCR", icon: FileImage },
    { path: "/clientes", label: "Clientes", icon: ClipboardList },
    { path: "/clientes-lealtad", label: "Clientes Lealtad", icon: Users },
    // Monitoreo de seguridad solo para admins
    ...(isAdmin() ? [{ path: "/monitor", label: "Monitor Sesiones", icon: Activity }] : []),
    // Usuarios only visible to admins
    ...(isAdmin() ? [{ path: "/usuarios", label: "Usuarios", icon: Shield }] : []),
  ];

  // Menú expandible de Caja
  const cajaSubMenus = [
    { path: "/caja/movimientos", label: "Movimientos", icon: Receipt, description: "Registrar ingresos y gastos" },
    { path: "/caja/cortes", label: "Cortes de Caja", icon: Calculator, description: "Realizar cortes de caja" },
    { path: "/caja/reportes", label: "Reportes", icon: PieChart, description: "Análisis financieros" },
    { path: "/caja/categorias", label: "Categorías", icon: Tag, description: "Gestionar categorías" },
  ];

  const finalMenuItems = [
    ...menuItems,
    // Configuracion only for admins
    ...(isAdmin() ? [{ path: "/configuracion", label: "Configuración", icon: Settings }] : []),
  ];

  return (
    <aside className="w-64 bg-white shadow-md p-6">
      <Link to="/" className="block mb-6">
        <img src="/momenti-logo.jpg" alt="Momenti" className="mx-auto h-12 object-contain" />
      </Link>

      <nav className="space-y-2">
        {finalMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded ${
                isMenuItemActive(item.path)
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "hover:bg-gray-100"
              }`}
            >
              {Icon && <Icon size={20} />}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Menú expandible de Caja */}
        <div className="space-y-1">
          <button
            onClick={() => toggleMenu('caja')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded transition-colors ${
              isMenuItemActive('/caja')
                ? "bg-green-100 text-green-700 font-semibold"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <DollarSign size={20} />
              <span>Caja</span>
            </div>
            {expandedMenus.caja ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {/* Submenús de Caja */}
          {expandedMenus.caja && (
            <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
              {cajaSubMenus.map((subItem) => {
                const SubIcon = subItem.icon;
                return (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      isMenuItemActive(subItem.path)
                        ? "bg-green-50 text-green-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    title={subItem.description}
                  >
                    <SubIcon size={16} />
                    <span>{subItem.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}