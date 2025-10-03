import React from "react";

export default function CustomerCard({ customer, active }) {
  return (
    <div className={`bg-white border ${active ? "ring-2 ring-blue-200" : ""} rounded p-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium">{customer.name}</div>
        <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          ID: {customer.id}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{customer.phone || "Sin teléfono"}</div>
        <div className="text-xs text-gray-400">{customer.email || ""}</div>
      </div>
    </div>
  );
}