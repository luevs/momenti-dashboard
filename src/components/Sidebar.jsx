import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Printer, BarChart2, ClipboardList, Users, Settings, DollarSign } from "lucide-react";
import { isAdmin } from '../utils/auth';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/maquinas", label: "Maquinas", icon: Printer },
   // { path: "/reportes", label: "Reportes", icon: BarChart2 },
    { path: "/clientes", label: "Clientes", icon: ClipboardList },
    { path: "/clientes-lealtad", label: "Clientes Lealtad", icon: Users },
    // Usuarios only visible to admins
    ...(isAdmin() ? [{ path: "/usuarios", label: "Usuarios", icon: Users }] : []),
    { path: "/corte", label: "Corte", icon: DollarSign },
    // Configuracion only for admins
    ...(isAdmin() ? [{ path: "/configuracion", label: "Configuración", icon: Settings }] : []),
  ];

  return (
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
  );
}