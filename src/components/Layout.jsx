import { Link, useLocation } from "react-router-dom";
import { Package2 } from "lucide-react";
import { LayoutDashboard, Printer, FileText, Settings, Users, BarChart2, Package, ClipboardList, Wrench } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/maquinas", label: "Maquinas", icon: Printer },
    { path: "/reportes", label: "Reportes", icon: BarChart2 },
    { path: "/clientes-lealtad", label: "Clientes Lealtad", icon: Users },
    { path: "/configuracion", label: "Configuración", icon: Settings },
    { path: "/insumos", label: "Insumos", icon: Package2 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Momenti</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded ${
                location.pathname === item.path
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "hover:bg-gray-100"
              }`}
            >
              {/* Aquí el ícono */}
              {item.icon && <item.icon size={20} />}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Panel de Control</h1>
          <span className="text-sm text-gray-600">Usuario</span>
        </header>

        {/* Dynamic content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}