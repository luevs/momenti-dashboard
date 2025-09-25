import { Link, useLocation } from "react-router-dom";
import { Package2 } from "lucide-react";
import { LayoutDashboard, Printer, FileText, Settings, Users, BarChart2, Package, ClipboardList, Wrench } from "lucide-react";
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/maquinas", label: "Maquinas", icon: Printer },
    { path: "/reportes", label: "Reportes", icon: BarChart2 },
    { path: "/clientes", label: "Clientes", icon: ClipboardList },         // <-- NUEVO
    { path: "/clientes-lealtad", label: "Clientes Lealtad", icon: Users },
    { path: "/configuracion", label: "Configuración", icon: Settings },
    { path: "/insumos", label: "Insumos", icon: Package2 },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6">
        {/* Logo en vez de texto */}
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
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100"
                }`}
              >
                {Icon && <Icon size={20} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Panel de Control</h1>
        </header>

        {/* Dynamic content */}
        <div className="flex-1 relative">
          {/* Agregar botón de logout en el header o donde prefieras */}
          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}