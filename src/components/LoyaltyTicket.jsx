
import React from 'react';
import { X, Printer } from 'lucide-react';
import { generateTicketHTML, formatDateTime } from '../utils/ticketUtils';

const LoyaltyTicket = ({ isOpen, onClose, ticketData }) => {
  // Función para imprimir el ticket
  const handlePrintTicket = () => {
    if (!ticketData) return;

    // Pasar null como firma para dejar el espacio en blanco
    const ticketHTML = generateTicketHTML(ticketData, null);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
        onClose();
      }, 1000);
    }, 500);
  };

  if (!isOpen || !ticketData) return null;

  const { client, order } = ticketData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 rounded-t-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black transition"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-xl font-bold text-center text-green-600">
            ¡Pedido Registrado!
          </h2>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Resumen del pedido */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-800">
                {client.name}
              </p>
              <p className="text-blue-600">
                <strong>{order.metersConsumed}m</strong> consumidos de <strong>{client.type}</strong>
              </p>
              <p className="text-sm text-blue-500">
                Quedan <strong>{client.remainingMeters.toFixed(1)}m</strong> en su programa
              </p>
            </div>
          </div>

          {/* Alertas de estado */}
          {client.remainingMeters <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-center text-red-800 font-bold">
                🎉 ¡PROGRAMA COMPLETADO!
              </p>
            </div>
          )}

          {client.remainingMeters > 0 && client.remainingMeters <= (client.totalMeters * 0.2) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-center text-yellow-800 font-bold">
                ⚠️ PRÓXIMO A EXPIRAR
              </p>
            </div>
          )}

          {/* Espacio para firma física */}
          <div className="mb-4">
            <h3 className="font-bold text-gray-700 mb-2 text-center">
              Firma de Autorización del Cliente
            </h3>
            <p className="text-sm text-gray-600 text-center mb-3">
              El cliente confirma el consumo de {order.metersConsumed.toFixed(1)} metros
            </p>
            <div className="border-2 border-dashed border-gray-400 rounded-lg bg-gray-50 p-8 flex items-center justify-center">
              <span className="text-gray-400">(Espacio para firma física)</span>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
            <p><strong>Folio:</strong> {order.folio}</p>
            <p><strong>Fecha:</strong> {formatDateTime(order.recordedAt)}</p>
            <p><strong>Registrado por:</strong> {order.registeredBy}</p>
            {order.observaciones && (
              <p><strong>Observaciones:</strong> {order.observaciones}</p>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrintTicket}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Printer size={20} />
              Imprimir Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyTicket;