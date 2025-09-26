import React from "react";

export default function CustomerCard({ customer, active }) {
  return (
    <div className={`bg-white border ${active ? "ring-2 ring-blue-200" : ""} rounded p-3 flex items-center justify-between`}>
      <div>
        <div className="font-medium">{customer.name}</div>
        <div className="text-xs text-gray-500">{customer.phone || "Sin teléfono"}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-400">{customer.email || ""}</div>
      </div>
    </div>
  );
}