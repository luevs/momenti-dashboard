import React from "react";
import { formatCurrency, formatDate } from "../utils/cashCutUtils";
import { X, Printer, Download, Clock, CheckCircle, FileText } from "lucide-react";

export default function CorteDetailModal({ cut, onClose }) {
  if (!cut) return null;

  const calculateTotal = () => {
    if (cut.total_amount) return cut.total_amount;
    if (cut.cash_cut_items) {
      return cut.cash_cut_items.reduce((sum, item) => {
        return sum + (item.subtotal || (item.quantity * item.denomination_value));
      }, 0);
    }
    return 0;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('corte-detail-print');
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
  };

  const handleExportPDF = () => {
    // Simple export to PDF (you could use jsPDF library for better results)
    window.print();
  };

  const total = calculateTotal();
  const isDraft = cut.draft;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Detalle del Corte
              </h2>
              <p className="text-sm text-gray-600">
                {formatDate(cut.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div id="corte-detail-print">
            {/* Status */}
            <div className="mb-6">
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                isDraft 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {isDraft ? <Clock size={16} /> : <CheckCircle size={16} />}
                <span>{isDraft ? 'Borrador' : 'Cerrado'}</span>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha</label>
                <p className="text-lg font-semibold text-gray-800">
                  {cut.cut_date || formatDate(cut.created_at).split(',')[0]}
                </p>
              </div>
              {cut.closed_by && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Cerrado por</label>
                  <p className="text-lg font-semibold text-gray-800">{cut.closed_by}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {cut.notes && (
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-500">Observaciones</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{cut.notes}</p>
                </div>
              </div>
            )}

            {/* Denominations Breakdown */}
            {cut.cash_cut_items && cut.cash_cut_items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Desglose de Denominaciones
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Denominación
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cut.cash_cut_items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                item.denomination_value >= 20 ? 'bg-green-500' : 'bg-amber-500'
                              }`}></div>
                              <span className="font-medium text-gray-700">
                                {item.denomination_label || `$${item.denomination_value}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">
                            {formatCurrency(item.subtotal || (item.quantity * item.denomination_value))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-gray-700">Total:</span>
                <span className="text-3xl font-bold text-green-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            ID: {cut.id}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}