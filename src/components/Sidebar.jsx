import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Printer, FileText, Settings, Users } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Maquinas", icon: Printer, path: "/maquinas" },
    { name: "Reportes", icon: FileText, path: "/reportes" },
    { name: "Clientes Lealtad", icon: Users, path: "/clientes-lealtad" },
    { name: "Configuración", icon: Settings, path: "/configuracion" },
    { name: "Monitoreo", icon: Settings, path: "/monitoreo" },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r p-4">
      <Link to="/" className="block mb-4">
        <img
          src="/momenti-logo.jpg"
          alt="Momenti"
          className="mx-auto h-16 object-contain"
        />
      </Link>

      <nav className="flex flex-col gap-2">
        {menuItems.map(({ name, icon: Icon, path }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={name}
              to={path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                active
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}