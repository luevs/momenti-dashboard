import React from "react";

export default function CustomerCard({ customer, active, metric = "phone" }) {
  const phone = customer.phone || customer.whatsapp || "";
  const sales = typeof customer.salesCount !== "undefined" ? customer.salesCount : null;

  return (
    <div className={`bg-white border ${active ? "ring-2 ring-blue-200" : ""} rounded p-3 flex items-center justify-between`}>
      <div>
        <div className="font-medium">{customer.name}</div>
        <div className="text-xs text-gray-500">{customer.type} · {customer.status}</div>
      </div>
      <div className="text-right">
        {metric === "phone" ? (
          <div className="text-sm font-semibold">{phone || "—"}</div>
        ) : (
          <div className="text-sm font-semibold">{sales !== null ? `${sales}` : "—"}</div>
        )}
        <div className="text-xs text-gray-400">{metric === "phone" ? "Contacto" : "Ventas"}</div>
      </div>
    </div>
  );
}