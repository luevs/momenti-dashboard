import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, Package, Ruler, DollarSign, Copy, RotateCw, AlertCircle, CheckCircle, Info, Home, LogIn, Menu, X, Plus, Trash2, ShoppingCart, Edit2, Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MATERIALS,
  getVinylPrice,
  getDTFTextilPrice,
  getDTFUVPrice,
  getPapelAdhesivoWithLayout
} from '../utils/pricingData';
import { usePricingSettings } from '../utils/usePricingSettings';
import {
  calculateLayout,
  calculateVinylM2,
  generateLayoutPreview,
  formatMeters,
  formatM2,
  formatPrice,
  generateQuotationText
} from '../utils/calculatorHelper';

// Función auxiliar para calcular layout en hoja tabloide
const calculateTabloideLayout = (stickerWidth, stickerHeight, sheetWidth, sheetHeight, spacing) => {
  const effectiveWidth = stickerWidth + spacing;
  const effectiveHeight = stickerHeight + spacing;

  // Cuántos caben por fila (ancho de la hoja)
  const perRow = Math.floor((sheetWidth + spacing) / effectiveWidth);
  
  if (perRow === 0) {
    return { perSheet: 0, perRow: 0, rows: 0, orientation: 'horizontal' };
  }

  // Cuántas filas caben en la hoja
  const rows = Math.floor((sheetHeight + spacing) / effectiveHeight);
  
  if (rows === 0) {
    return { perSheet: 0, perRow: 0, rows: 0, orientation: 'horizontal' };
  }

  // Total de stickers por hoja
  const perSheet = perRow * rows;

  return {
    perSheet,
    perRow,
    rows,
    orientation: sheetWidth > sheetHeight ? 'horizontal' : 'vertical'
  };
};

// Componentes extraídos fuera para evitar re-renders
const ProductSelector = ({ productType, setProductType, vinylType, setVinylType }) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
      <Package className="text-cyan-500" size={24} />
      Selecciona el producto
    </h2>
    
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { id: 'dtf_textil', name: 'DTF Textil', desc: '58cm' },
        { id: 'dtf_uv', name: 'DTF UV', desc: '28cm' },
        { id: 'viniles', name: 'Viniles', desc: '1.4m' },
        { id: 'papel', name: 'Papel Adhesivo', desc: '31×46cm' }
      ].map(product => (
        <button
          key={product.id}
          onClick={() => setProductType(product.id)}
          className={`p-4 rounded-lg border-2 transition-all ${
            productType === product.id
              ? 'border-cyan-500 bg-cyan-50 shadow-md'
              : 'border-gray-200 hover:border-cyan-300 bg-white'
          }`}
        >
          <div className="font-semibold text-gray-800">{product.name}</div>
          <div className="text-sm text-gray-500">{product.desc}</div>
        </button>
      ))}
    </div>

    {/* Selector de tipo de vinil */}
    {productType === 'viniles' && (
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de vinil
        </label>
        <select
          value={vinylType}
          onChange={(e) => setVinylType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          {Object.entries(MATERIALS.VINILES.types).map(([key, vinyl]) => (
            <option key={key} value={key}>
              {vinyl.name}
            </option>
          ))}
        </select>
      </div>
    )}
  </div>
);

const StickerForm = ({ productType, calculationMode, setCalculationMode, formData, handleInputChange }) => {
  const isDTF = productType === 'dtf_textil' || productType === 'dtf_uv';
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Ruler className="text-cyan-500" size={24} />
        {productType === 'papel' ? 'Medidas del sticker/etiqueta' : 'Medidas del sticker/calcomanía'}
      </h2>

      {/* Selector de modo de cálculo para DTF */}
      {isDTF && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
          <span className="text-sm font-medium text-gray-700">Modo de cálculo:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCalculationMode('stickers')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                calculationMode === 'stickers'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-cyan-400'
              }`}
            >
              Por Stickers
            </button>
            <button
              onClick={() => setCalculationMode('meters')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                calculationMode === 'meters'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-cyan-400'
              }`}
            >
              Por Metros
            </button>
          </div>
          <span className="text-xs text-gray-500 ml-auto">
            {calculationMode === 'stickers' 
              ? 'Calcula automáticamente según medidas' 
              : 'Ingresa metros directamente'}
          </span>
        </div>
      )}

      {/* Formulario según modo */}
      {isDTF && calculationMode === 'meters' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metros lineales *
            </label>
            <input
              type="text"
              name="meters"
              value={formData.meters}
              onChange={handleInputChange}
              placeholder="5.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingresa directamente los metros que necesitas
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ancho (cm) *
            </label>
            <input
              type="text"
              name="width"
              value={formData.width}
              onChange={handleInputChange}
              placeholder="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alto (cm) *
            </label>
            <input
              type="text"
              name="height"
              value={formData.height}
              onChange={handleInputChange}
              placeholder="15"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad *
            </label>
            <input
              type="text"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              Espaciado (cm)
              <span className="text-xs text-gray-400" title="Espacio entre cortes">
                <Info size={14} />
              </span>
            </label>
            <input
              type="text"
              name="spacing"
              value={formData.spacing}
              onChange={handleInputChange}
              placeholder="0.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const LayoutPreview = ({ layout }) => {
  const [showDistribution, setShowDistribution] = useState(false);
  
  if (!layout || !layout.perRow || !layout.rows) return null;

  // Calcular aspect ratio real del sticker
  const aspectRatio = layout.width && layout.height ? layout.width / layout.height : 1;
  
  // Mostrar solo 2 filas para visualización compacta
  const maxRowsToShow = 2;
  const itemsToShow = Math.min(layout.totalFits, layout.perRow * maxRowsToShow);
  const showingPartial = layout.rows > maxRowsToShow;

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
      <button
        onClick={() => setShowDistribution(!showDistribution)}
        className="w-full flex items-center justify-between mb-3 hover:bg-gray-100 p-2 rounded transition-colors"
      >
        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <Package size={18} className="text-cyan-500" />
          Distribución
        </h3>
        <div className="flex items-center gap-2">
          {layout.width && layout.height && (
            <div className="text-xs text-gray-600 font-medium bg-white px-3 py-1 rounded border border-gray-300">
              {layout.width} × {layout.height} cm
            </div>
          )}
          <span className="text-sm text-gray-500">
            {showDistribution ? '▼' : '▶'}
          </span>
        </div>
      </button>
      
      {showDistribution && (
        <>
          <div 
            className="grid gap-0.5 mb-3"
            style={{
              gridTemplateColumns: `repeat(${layout.perRow}, minmax(0, 1fr))`,
              maxWidth: '200px'
            }}
          >
            {Array.from({ length: itemsToShow }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-sm bg-cyan-400"
                style={{
                  aspectRatio: `${aspectRatio}`
                }}
              />
            ))}
          </div>

          {showingPartial && (
            <p className="text-xs text-gray-500 mb-2 italic">
              Vista previa (2/{layout.rows} filas)
            </p>
          )}

          <div className="text-sm text-gray-700 space-y-1">
            <p className="font-semibold">• {layout.perRow} por fila × {layout.rows} filas = {layout.totalFits} stickers</p>
            {layout.extraStickers > 0 && (
              <p className="text-orange-600">• {layout.extraStickers} extras</p>
            )}
            <p>• Eficiencia: {layout.efficiency}%</p>
            {layout.isRotated && (
              <p className="text-blue-600 flex items-center gap-1">
                <RotateCw size={14} /> Rotado 90° para optimizar
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const LoyaltyComparison = ({ loyaltyOptions }) => {
  if (!loyaltyOptions || loyaltyOptions.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-5 border-2 border-yellow-300 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="text-yellow-600" size={20} />
        <h3 className="font-bold text-gray-800">Programa de Lealtad</h3>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">
        Compra anticipada y ahorra:
      </p>

      <div className="space-y-2">
        {loyaltyOptions.map((option, idx) => (
          <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-800">{option.meters} metros</span>
                <span className="text-sm text-gray-600 ml-2">
                  ({formatPrice(option.pricePerMeter)}/m)
                </span>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatPrice(option.total)}</div>
                <div className="text-xs text-green-600">
                  Ahorras {option.savingsPercent}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-3">
        * Precio pagando anticipado. Ideal si produces en volumen.
      </p>
    </div>
  );
};

// Componente para editar celdas de precio - movido fuera para evitar re-renders
const PriceCell = ({ value, onChange, color = "text-gray-800", editMode }) => {
  if (editMode) {
    return (
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 border border-cyan-300 rounded text-right font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
        step="0.01"
      />
    );
  }
  return <span className={`font-semibold ${color}`}>${value || '-'}</span>;
};

const PriceReferenceTable = ({ customPrices, onPricesChange, clientType }) => {
  const [showTable, setShowTable] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempPrices, setTempPrices] = useState(customPrices);

  const clientTypeLabels = {
    elite: '👑 Elite',
    pro: '🏢 Pro/Printer',
    cf: '💰 CF'
  };

  useEffect(() => {
    setTempPrices(customPrices);
  }, [customPrices]);

  const handlePriceEdit = (category, path, value) => {
    // path puede ser algo como 'elite.fraction' o 'impreso.pro.below05'
    const keys = path.split('.');
    
    setTempPrices(prev => {
      const newCategory = { ...prev[category] };
      let current = newCategory;
      
      // Navegar hasta el penúltimo nivel
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      // Actualizar el último nivel
      current[keys[keys.length - 1]] = parseFloat(value) || 0;
      
      return {
        ...prev,
        [category]: newCategory
      };
    });
  };

  const handleSave = () => {
    onPricesChange(tempPrices);
    setEditMode(false);
  };

  const handleCancel = () => {
    setTempPrices(customPrices);
    setEditMode(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <button
        onClick={() => setShowTable(!showTable)}
        className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 p-2 rounded transition-colors"
      >
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <Table className="text-cyan-500" size={20} />
          Tabla de Precios - {clientTypeLabels[clientType]} {editMode ? '(Editando)' : '(Click para ver/editar)'}
        </h3>
        <div className="flex items-center gap-2">
          {showTable && (
            <div className="flex gap-2 mr-2">
              {editMode ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSave(); }}
                    className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                    className="px-3 py-1 text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditMode(true); }}
                  className="px-3 py-1 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  Editar Precios
                </button>
              )}
            </div>
          )}
          <span className="text-sm text-gray-500">
            {showTable ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {showTable && (
        <div className="space-y-6 mt-4">
          {/* DTF Textil */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              📏 DTF Textil (58cm)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left">Cantidad</th>
                    <th className="py-2 px-3 text-right">Precio/Metro</th>
                    <th className="py-2 px-3 text-right">Total (Paq.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3">Menos de 0.5m</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfTextil[clientType].fraction}
                        onChange={(val) => handlePriceEdit('dtfTextil', `${clientType}.fraction`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">0.5m - 9.99m</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfTextil[clientType].fullMeter}
                        onChange={(val) => handlePriceEdit('dtfTextil', `${clientType}.fullMeter`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">-</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-2 px-3 font-semibold">10m (Lealtad)</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfTextil[clientType].loyalty10}
                        onChange={(val) => handlePriceEdit('dtfTextil', `${clientType}.loyalty10`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${(tempPrices.dtfTextil[clientType].loyalty10 * 10).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-2 px-3 font-semibold">20m (Lealtad)</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfTextil[clientType].loyalty20}
                        onChange={(val) => handlePriceEdit('dtfTextil', `${clientType}.loyalty20`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${(tempPrices.dtfTextil[clientType].loyalty20 * 20).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-2 px-3 font-semibold">50m (Lealtad)</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfTextil[clientType].loyalty50}
                        onChange={(val) => handlePriceEdit('dtfTextil', `${clientType}.loyalty50`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${(tempPrices.dtfTextil[clientType].loyalty50 * 50).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DTF UV */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              🌞 DTF UV (28cm)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left">Cantidad</th>
                    <th className="py-2 px-3 text-right">Precio/Metro</th>
                    <th className="py-2 px-3 text-right">Total (Paq.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3">Regular</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfUV[clientType].regular}
                        onChange={(val) => handlePriceEdit('dtfUV', `${clientType}.regular`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">-</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-2 px-3 font-semibold">10m (Lealtad)</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfUV[clientType].loyalty10}
                        onChange={(val) => handlePriceEdit('dtfUV', `${clientType}.loyalty10`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${(tempPrices.dtfUV[clientType].loyalty10 * 10).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-2 px-3 font-semibold">20m (Lealtad)</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfUV[clientType].loyalty20}
                        onChange={(val) => handlePriceEdit('dtfUV', `${clientType}.loyalty20`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${(tempPrices.dtfUV[clientType].loyalty20 * 20).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-2 px-3 font-semibold">50m (Lealtad)</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.dtfUV[clientType].loyalty50}
                        onChange={(val) => handlePriceEdit('dtfUV', `${clientType}.loyalty50`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${(tempPrices.dtfUV[clientType].loyalty50 * 50).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Viniles */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              🎨 Viniles (1.4m ancho)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left">Tipo</th>
                    <th className="py-2 px-3 text-right">&lt;0.5m²</th>
                    <th className="py-2 px-3 text-right">Regular</th>
                    <th className="py-2 px-3 text-right">+8m²</th>
                    <th className="py-2 px-3 text-right">Mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3 font-semibold">Impreso</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.impreso[clientType].below05}
                        onChange={(val) => handlePriceEdit('viniles', `impreso.${clientType}.below05`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.impreso[clientType].regular}
                        onChange={(val) => handlePriceEdit('viniles', `impreso.${clientType}.regular`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.impreso[clientType].above8}
                        onChange={(val) => handlePriceEdit('viniles', `impreso.${clientType}.above8`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.impreso[clientType].minimum}
                        onChange={(val) => handlePriceEdit('viniles', `impreso.${clientType}.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Suajado</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.suajado[clientType].below05}
                        onChange={(val) => handlePriceEdit('viniles', `suajado.${clientType}.below05`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.suajado[clientType].regular}
                        onChange={(val) => handlePriceEdit('viniles', `suajado.${clientType}.regular`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.suajado[clientType].above8}
                        onChange={(val) => handlePriceEdit('viniles', `suajado.${clientType}.above8`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.suajado[clientType].minimum}
                        onChange={(val) => handlePriceEdit('viniles', `suajado.${clientType}.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Microperforado</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.microperforado[clientType].below05}
                        onChange={(val) => handlePriceEdit('viniles', `microperforado.${clientType}.below05`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.microperforado[clientType].regular}
                        onChange={(val) => handlePriceEdit('viniles', `microperforado.${clientType}.regular`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.microperforado[clientType].above8}
                        onChange={(val) => handlePriceEdit('viniles', `microperforado.${clientType}.above8`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.microperforado[clientType].minimum}
                        onChange={(val) => handlePriceEdit('viniles', `microperforado.${clientType}.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Holográfico</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.holografico[clientType].below05}
                        onChange={(val) => handlePriceEdit('viniles', `holografico.${clientType}.below05`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.holografico[clientType].regular}
                        onChange={(val) => handlePriceEdit('viniles', `holografico.${clientType}.regular`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.holografico[clientType].above8}
                        onChange={(val) => handlePriceEdit('viniles', `holografico.${clientType}.above8`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.holografico[clientType].minimum}
                        onChange={(val) => handlePriceEdit('viniles', `holografico.${clientType}.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Lona</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.lona[clientType].regular}
                        onChange={(val) => handlePriceEdit('viniles', `lona.${clientType}.regular`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.viniles.lona[clientType].above8}
                        onChange={(val) => handlePriceEdit('viniles', `lona.${clientType}.above8`, val)}
                        color="text-green-600"
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Papel Adhesivo */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              📄 Papel Adhesivo Suajado (31×46cm)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left">Cortes por Hoja</th>
                    <th className="py-2 px-3 text-right">Precio/Hoja</th>
                    <th className="py-2 px-3 text-right">Mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3">0 - 40 cortes</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.papel[clientType].range1.price}
                        onChange={(val) => handlePriceEdit('papel', `${clientType}.range1.price`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.papel[clientType].range1.minimum}
                        onChange={(val) => handlePriceEdit('papel', `${clientType}.range1.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">41 - 70 cortes</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.papel[clientType].range2.price}
                        onChange={(val) => handlePriceEdit('papel', `${clientType}.range2.price`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.papel[clientType].range2.minimum}
                        onChange={(val) => handlePriceEdit('papel', `${clientType}.range2.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">71+ cortes</td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.papel[clientType].range3.price}
                        onChange={(val) => handlePriceEdit('papel', `${clientType}.range3.price`, val)}
                        editMode={editMode}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <PriceCell 
                        value={tempPrices.papel[clientType].range3.minimum}
                        onChange={(val) => handlePriceEdit('papel', `${clientType}.range3.minimum`, val)}
                        color="text-orange-600"
                        editMode={editMode}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">* Mínimo de 5 hojas por pedido</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultsPanel = ({ results, copied, handleCopyToClipboard, handleReset, onAddToList }) => {
  const [showPapelDistribution, setShowPapelDistribution] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  
  useEffect(() => {
    if (results && !results.error) {
      setCustomPrice((results.total || results.price || 0).toString());
      setIsEditingPrice(false);
    }
  }, [results]);
  
  if (!results) return null;

  if (results.error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle size={24} />
          <h3 className="font-bold">Error</h3>
        </div>
        <p className="text-red-600">{results.message}</p>
      </div>
    );
  }

  const handlePriceChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomPrice(value);
    }
  };

  const handleAddWithCustomPrice = () => {
    const price = parseFloat(customPrice) || (results.total || results.price || 0);
    const itemWithCustomPrice = {
      ...results,
      originalPrice: results.total || results.price,
      total: results.total ? price : undefined,
      price: results.price ? price : undefined,
      customPriceApplied: Math.abs(price - (results.total || results.price || 0)) > 0.01
    };
    onAddToList(itemWithCustomPrice);
  };

  const displayPrice = parseFloat(customPrice) || (results.total || results.price || 0);
  const originalPrice = results.total || results.price || 0;
  const priceChanged = Math.abs(displayPrice - originalPrice) > 0.01;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calculator className="text-cyan-500" size={28} />
          Resultados
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleAddWithCustomPrice}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Agregar a Lista
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCw size={18} />
            Nueva
          </button>
        </div>
      </div>

      {/* Resultados para stickers/DTF/viniles */}
      {results.type === 'sticker' && (
        <>
          <div className="bg-cyan-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{results.productName}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Medidas:</span>
                <p className="font-semibold">{results.width} × {results.height} cm</p>
              </div>
              <div>
                <span className="text-gray-600">Cantidad:</span>
                <p className="font-semibold">{results.quantity} unidades</p>
              </div>
              <div>
                <span className="text-gray-600">Material:</span>
                <p className="font-semibold">{results.materialWidth} cm ancho</p>
              </div>
            </div>
          </div>

          <LayoutPreview layout={results} />

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700 flex items-center gap-1 mb-1">
                  <Ruler size={16} />
                  Material necesario:
                </span>
                <p className="text-2xl font-bold text-gray-800">
                  {formatMeters(results.meters)}
                </p>
                {results.m2 && (
                  <p className="text-lg text-gray-600">
                    {formatM2(results.m2)}
                  </p>
                )}
              </div>
              
              <div>
                <span className="text-gray-700 flex items-center gap-1 mb-2">
                  <DollarSign size={16} />
                  Precio:
                </span>
                {isEditingPrice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">$</span>
                      <input
                        type="text"
                        value={customPrice}
                        onChange={handlePriceChange}
                        className="w-full px-3 py-2 border-2 border-cyan-500 rounded-lg text-2xl font-bold text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingPrice(false)}
                        className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => {
                          setCustomPrice(originalPrice.toString());
                          setIsEditingPrice(false);
                        }}
                        className="px-3 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-3xl font-bold ${priceChanged ? 'text-green-600' : 'text-cyan-600'}`}>
                        {formatPrice(displayPrice)}
                      </p>
                      <button
                        onClick={() => setIsEditingPrice(true)}
                        className="p-1 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                        title="Editar precio"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    {priceChanged && (
                      <p className="text-xs text-gray-500 mt-1">
                        Original: {formatPrice(originalPrice)}
                      </p>
                    )}
                  </div>
                )}
                {results.pricePerMeter && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPrice(results.pricePerMeter)} por metro
                  </p>
                )}
                {results.pricePerM2 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPrice(results.pricePerM2)} por m²
                  </p>
                )}
                {results.minimumApplied && (
                  <p className="text-xs text-orange-600 mt-1">
                    * Mínimo aplicado: {formatPrice(results.minimum)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <LoyaltyComparison loyaltyOptions={results.loyaltyOptions} />
        </>
      )}

      {/* Resultados para modo metros directo (DTF) */}
      {results.type === 'meters' && (
        <>
          <div className="bg-cyan-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{results.productName}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Material:</span>
                <p className="font-semibold">{results.materialWidth} cm ancho</p>
              </div>
              <div>
                <span className="text-gray-600">Unidad:</span>
                <p className="font-semibold">{results.unit}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700 flex items-center gap-1 mb-1">
                  <Ruler size={16} />
                  Material solicitado:
                </span>
                <p className="text-3xl font-bold text-gray-800">
                  {formatMeters(results.meters)}
                </p>
              </div>
              
              <div>
                <span className="text-gray-700 flex items-center gap-1 mb-2">
                  <DollarSign size={16} />
                  Precio:
                </span>
                {isEditingPrice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">$</span>
                      <input
                        type="text"
                        value={customPrice}
                        onChange={handlePriceChange}
                        className="w-full px-3 py-2 border-2 border-cyan-500 rounded-lg text-2xl font-bold text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingPrice(false)}
                        className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => {
                          setCustomPrice(originalPrice.toString());
                          setIsEditingPrice(false);
                        }}
                        className="px-3 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-3xl font-bold ${priceChanged ? 'text-green-600' : 'text-cyan-600'}`}>
                        {formatPrice(displayPrice)}
                      </p>
                      <button
                        onClick={() => setIsEditingPrice(true)}
                        className="p-1 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                        title="Editar precio"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    {priceChanged && (
                      <p className="text-xs text-gray-500 mt-1">
                        Original: {formatPrice(originalPrice)}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(results.pricePerMeter)} por metro
                </p>
              </div>
            </div>
          </div>

          <LoyaltyComparison loyaltyOptions={results.loyaltyOptions} />
        </>
      )}

      {/* Resultados para papel adhesivo */}
      {results.type === 'papel' && (
        <>
          <div className="bg-pink-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{results.productName}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Medidas sticker:</span>
                <p className="font-semibold">{results.width} × {results.height} cm</p>
              </div>
              <div>
                <span className="text-gray-600">Cantidad solicitada:</span>
                <p className="font-semibold">{results.quantity} unidades</p>
              </div>
              <div>
                <span className="text-gray-600">Hoja tabloide:</span>
                <p className="font-semibold">{results.sheetSize}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <button
              onClick={() => setShowPapelDistribution(!showPapelDistribution)}
              className="w-full flex items-center justify-between mb-3 hover:bg-gray-100 p-2 rounded transition-colors"
            >
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-pink-500" />
                Distribución por hoja
              </h3>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600 font-medium bg-white px-3 py-1 rounded border border-gray-300">
                  {results.width} × {results.height} cm
                </div>
                <span className="text-sm text-gray-500">
                  {showPapelDistribution ? '▼' : '▶'}
                </span>
              </div>
            </button>
            
            {showPapelDistribution && (
              <>
                <div 
                  className="grid gap-0.5 mb-3"
                  style={{
                    gridTemplateColumns: `repeat(${results.perRow}, minmax(0, 1fr))`,
                    maxWidth: '200px'
                  }}
                >
                  {(() => {
                    const maxRowsToShow = 2;
                    const itemsToShow = Math.min(results.perSheet, results.perRow * maxRowsToShow);
                    const aspectRatio = results.width / results.height;
                    const showingPartial = results.rows > maxRowsToShow;
                    
                    return (
                      <>
                        {Array.from({ length: itemsToShow }).map((_, idx) => (
                          <div
                            key={idx}
                            className="rounded-sm bg-pink-400"
                            style={{
                              aspectRatio: `${aspectRatio}`
                            }}
                          />
                        ))}
                        {showingPartial && (
                          <div className="col-span-full mt-2">
                            <p className="text-xs text-gray-500 italic">
                              Vista previa (2/{results.rows} filas)
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold">• {results.perRow} × {results.rows} = {results.perSheet} por hoja</p>
                  <p className="text-gray-600">• {results.sheetsNeeded} hojas necesarias</p>
                  <p className="text-gray-600">• Orientación: {results.sheetOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3">Resumen de hojas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Hojas necesarias:</span>
                <p className="text-2xl font-bold text-gray-800">{results.sheetsNeeded}</p>
              </div>
              <div>
                <span className="text-gray-600">Total stickers:</span>
                <p className="text-xl font-semibold text-gray-700">{results.totalCapacity}</p>
              </div>
              <div>
                <span className="text-gray-600">Stickers extras:</span>
                <p className="text-xl font-semibold text-orange-600">{results.extraStickers}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Rango de precio: {results.rangeInfo} → {formatPrice(results.pricePerSheet)}/hoja
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700">Precio por hoja:</span>
                <p className="text-2xl font-bold text-gray-800">
                  {formatPrice(results.pricePerSheet)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {results.sheetsNeeded} hojas × {formatPrice(results.pricePerSheet)}
                </p>
              </div>
              
              <div>
                <span className="text-gray-700 flex items-center gap-1 mb-2">
                  <DollarSign size={16} />
                  Precio total:
                </span>
                {isEditingPrice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">$</span>
                      <input
                        type="text"
                        value={customPrice}
                        onChange={handlePriceChange}
                        className="w-full px-3 py-2 border-2 border-pink-500 rounded-lg text-2xl font-bold text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingPrice(false)}
                        className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => {
                          setCustomPrice(originalPrice.toString());
                          setIsEditingPrice(false);
                        }}
                        className="px-3 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-3xl font-bold ${priceChanged ? 'text-green-600' : 'text-pink-600'}`}>
                        {formatPrice(displayPrice)}
                      </p>
                      <button
                        onClick={() => setIsEditingPrice(true)}
                        className="p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded transition-colors"
                        title="Editar precio"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    {priceChanged && (
                      <p className="text-xs text-gray-500 mt-1">
                        Original: {formatPrice(originalPrice)}
                      </p>
                    )}
                  </div>
                )}
                {results.minimumApplied && (
                  <p className="text-xs text-orange-600 mt-1">
                    * Mínimo aplicado: {formatPrice(results.minimum)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const QuotedItemsList = ({ items, onRemoveItem, onClearAll, onCopyAll }) => {
  const [copied, setCopied] = useState(false);
  
  if (!items || items.length === 0) return null;

  const total = items.reduce((sum, item) => {
    return sum + (item.total || item.price || 0);
  }, 0);

  const handleCopyAll = () => {
    onCopyAll();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearAll = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar toda la lista?')) {
      onClearAll();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="text-green-500" size={28} />
          Lista de Cotizaciones ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? 'Copiado' : 'Copiar Todo'}
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} />
            Limpiar Todo
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {items.map((item, index) => (
          <div key={item.id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                  <h3 className="font-bold text-gray-800">{item.productName}</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {item.type === 'papel' && (
                    <>
                      <div>
                        <span className="text-gray-600">Medidas:</span>
                        <p className="font-semibold">{item.width} × {item.height} cm</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Cantidad:</span>
                        <p className="font-semibold">{item.quantity} stickers</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Hojas:</span>
                        <p className="font-semibold">{item.sheetsNeeded} ({item.perSheet} c/u)</p>
                      </div>
                    </>
                  )}
                  
                  {item.type === 'meters' && (
                    <>
                      <div>
                        <span className="text-gray-600">Material:</span>
                        <p className="font-semibold">{item.materialWidth} cm</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Metros:</span>
                        <p className="font-semibold">{formatMeters(item.meters)}</p>
                      </div>
                    </>
                  )}
                  
                  {item.type === 'sticker' && (
                    <>
                      <div>
                        <span className="text-gray-600">Medidas:</span>
                        <p className="font-semibold">{item.width} × {item.height} cm</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Cantidad:</span>
                        <p className="font-semibold">{item.quantity} unidades</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Material:</span>
                        <p className="font-semibold">{item.meters ? formatMeters(item.meters) : formatM2(item.m2)}</p>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <span className="text-gray-600">Precio:</span>
                    <p className="font-bold text-green-600 text-lg">
                      {formatPrice(item.total || item.price)}
                    </p>
                    {item.customPriceApplied && item.originalPrice && (
                      <p className="text-xs text-gray-500">
                        Original: {formatPrice(item.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onRemoveItem(item.id)}
                className="ml-4 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                title="Eliminar item"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">TOTAL GENERAL:</span>
          <span className="text-3xl font-bold">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};

const Cotizador = () => {
  // Estado para el menú móvil
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Estado del producto seleccionado
  const [productType, setProductType] = useState('dtf_textil');
  const [vinylType, setVinylType] = useState('impreso');
  const [calculationMode, setCalculationMode] = useState('stickers');

  // Estados del formulario
  const [formData, setFormData] = useState({
    width: '',
    height: '',
    quantity: '',
    spacing: '0.5',
    meters: '',
    cuts: '',
    sheets: ''
  });

  // Estados de resultados
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Estado para lista de cotizaciones
  const [quotedItems, setQuotedItems] = useState([]);
  
  // Estado para tipo de cliente
  const [clientType, setClientType] = useState('pro'); // 'elite', 'pro', 'cf'
  
  // Hook para cargar y guardar precios personalizados en Supabase
  const { 
    customPrices, 
    setCustomPrices, 
    isLoading: pricesLoading, 
    error: pricesError,
    reloadPrices 
  } = usePricingSettings();

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  // Funciones de cálculo de precios con customPrices
  const getCustomDTFTextilPrice = useCallback((meters) => {
    const prices = customPrices.dtfTextil[clientType];
    
    if (meters < 0.5) {
      return {
        type: 'fraction',
        pricePerMeter: prices.fraction,
        total: prices.fraction * meters,
        meters
      };
    } else {
      // Determinar precio por nivel de metros
      let pricePerMeter = prices.fullMeter;
      let loyaltyTier = null;
      
      if (meters >= 50) {
        pricePerMeter = prices.loyalty50;
        loyaltyTier = 50;
      } else if (meters >= 20) {
        pricePerMeter = prices.loyalty20;
        loyaltyTier = 20;
      } else if (meters >= 10) {
        pricePerMeter = prices.loyalty10;
        loyaltyTier = 10;
      }
      
      return {
        type: loyaltyTier ? 'loyalty' : 'regular',
        pricePerMeter,
        total: pricePerMeter * meters,
        meters,
        loyaltyTier,
        loyaltyOptions: [
          { meters: 10, pricePerMeter: prices.loyalty10, total: prices.loyalty10 * 10 },
          { meters: 20, pricePerMeter: prices.loyalty20, total: prices.loyalty20 * 20 },
          { meters: 50, pricePerMeter: prices.loyalty50, total: prices.loyalty50 * 50 },
        ].filter(option => option.meters !== loyaltyTier)
      };
    }
  }, [customPrices, clientType]);

  const getCustomDTFUVPrice = useCallback((meters) => {
    const prices = customPrices.dtfUV[clientType];
    let pricePerMeter = prices.regular;
    let loyaltyTier = null;
    
    if (meters >= 50) {
      pricePerMeter = prices.loyalty50;
      loyaltyTier = 50;
    } else if (meters >= 20) {
      pricePerMeter = prices.loyalty20;
      loyaltyTier = 20;
    } else if (meters >= 10) {
      pricePerMeter = prices.loyalty10;
      loyaltyTier = 10;
    }
    
    return {
      type: loyaltyTier ? 'loyalty' : 'regular',
      pricePerMeter,
      total: pricePerMeter * meters,
      meters,
      loyaltyTier,
      loyaltyOptions: [
        { meters: 10, pricePerMeter: prices.loyalty10, total: prices.loyalty10 * 10 },
        { meters: 20, pricePerMeter: prices.loyalty20, total: prices.loyalty20 * 20 },
        { meters: 50, pricePerMeter: prices.loyalty50, total: prices.loyalty50 * 50 },
      ].filter(option => option.meters !== loyaltyTier)
    };
  }, [customPrices, clientType]);

  const getCustomVinylPrice = useCallback((type, m2) => {
    const vinyl = customPrices.viniles[type]?.[clientType];
    if (!vinyl) return null;

    let pricePerM2;
    
    if (m2 < 0.5 && vinyl.below05) {
      pricePerM2 = vinyl.below05;
    } else if (m2 >= 8 && vinyl.above8) {
      pricePerM2 = vinyl.above8;
    } else {
      pricePerM2 = vinyl.regular;
    }

    const subtotal = pricePerM2 * m2;
    const total = vinyl.minimum && subtotal < vinyl.minimum ? vinyl.minimum : subtotal;

    return {
      pricePerM2,
      subtotal,
      minimum: vinyl.minimum,
      total,
      minimumApplied: total > subtotal
    };
  }, [customPrices, clientType]);

  const getCustomPapelAdhesivoWithLayout = useCallback((cutsPerSheet, sheets) => {
    const material = MATERIALS.PAPEL_ADHESIVO;
    
    if (sheets < material.minimumSheets) {
      return {
        error: true,
        message: `Pedido mínimo de ${material.minimumSheets} plantillas`,
        minimumSheets: material.minimumSheets
      };
    }

    const prices = customPrices.papel[clientType];
    let pricePerSheet;
    let minimum;

    if (cutsPerSheet >= 0 && cutsPerSheet <= 40) {
      pricePerSheet = prices.range1.price;
      minimum = prices.range1.minimum;
    } else if (cutsPerSheet >= 41 && cutsPerSheet <= 70) {
      pricePerSheet = prices.range2.price;
      minimum = prices.range2.minimum;
    } else {
      pricePerSheet = prices.range3.price;
      minimum = prices.range3.minimum;
    }

    const subtotal = pricePerSheet * sheets;
    const total = subtotal < minimum ? minimum : subtotal;

    return {
      pricePerSheet,
      sheets,
      cutsPerSheet,
      totalCuts: cutsPerSheet * sheets,
      subtotal,
      minimum,
      total,
      minimumApplied: total > subtotal
    };
  }, [customPrices, clientType]);

  const calculateResults = useCallback(() => {
    try {
      if (productType === 'papel') {
        // Cálculo para papel adhesivo con layout automático
        const width = parseFloat(formData.width);
        const height = parseFloat(formData.height);
        const quantity = parseFloat(formData.quantity);
        const spacing = parseFloat(formData.spacing);
        
        if (!width || !height || !quantity) {
          setResults(null);
          return;
        }

        const material = MATERIALS.PAPEL_ADHESIVO;
        
        // Calcular cuántos stickers caben en una hoja tabloide
        // Intentar ambas orientaciones de la hoja
        const horizontal = calculateTabloideLayout(width, height, material.sheetWidth, material.sheetHeight, spacing);
        const vertical = calculateTabloideLayout(width, height, material.sheetHeight, material.sheetWidth, spacing);
        
        // Elegir la orientación que permita más stickers por hoja
        const bestLayout = horizontal.perSheet >= vertical.perSheet ? horizontal : vertical;
        
        if (bestLayout.perSheet === 0) {
          setResults({ 
            error: true, 
            message: `El sticker (${width}×${height}cm) es demasiado grande para una hoja tabloide (${material.sheetWidth}×${material.sheetHeight}cm)` 
          });
          return;
        }

        // Calcular cuántas hojas necesitamos
        const sheetsNeeded = Math.ceil(quantity / bestLayout.perSheet);
        
        // Validar mínimo de hojas
        if (sheetsNeeded < material.minimumSheets) {
          setResults({
            error: true,
            message: `Pedido mínimo de ${material.minimumSheets} plantillas (actualmente necesitas ${sheetsNeeded})`
          });
          return;
        }

        // Calcular precio
        const priceData = getCustomPapelAdhesivoWithLayout(bestLayout.perSheet, sheetsNeeded);
        
        if (priceData.error) {
          setResults({ error: true, message: priceData.message });
          return;
        }

        setResults({
          type: 'papel',
          productName: material.name,
          width,
          height,
          quantity,
          spacing,
          perSheet: bestLayout.perSheet,
          sheetsNeeded,
          totalCapacity: bestLayout.perSheet * sheetsNeeded,
          extraStickers: (bestLayout.perSheet * sheetsNeeded) - quantity,
          sheetOrientation: bestLayout.orientation,
          perRow: bestLayout.perRow,
          rows: bestLayout.rows,
          sheetSize: `${material.sheetWidth} × ${material.sheetHeight} cm`,
          pricePerSheet: priceData.pricePerSheet,
          subtotal: priceData.subtotal,
          total: priceData.total,
          minimumApplied: priceData.minimumApplied,
          minimum: priceData.minimum,
          rangeInfo: priceData.rangeInfo
        });
        return;
      }

      // Cálculo para stickers/DTF/viniles
      const width = parseFloat(formData.width);
      const height = parseFloat(formData.height);
      const quantity = parseFloat(formData.quantity);
      const spacing = parseFloat(formData.spacing);

      if (!width || !height || !quantity) {
        setResults(null);
        return;
      }

      let material, layout, priceData;

      if (productType === 'dtf_textil') {
        material = MATERIALS.DTF_TEXTIL;
        
        // Modo metros directo
        if (calculationMode === 'meters') {
          const meters = parseFloat(formData.meters);
          
          if (!meters) {
            setResults(null);
            return;
          }

          priceData = getCustomDTFTextilPrice(meters);
          
          setResults({
            type: 'meters',
            productName: material.name,
            meters,
            materialWidth: material.width,
            price: priceData.total,
            pricePerMeter: priceData.pricePerMeter,
            priceType: priceData.type,
            loyaltyOptions: priceData.loyaltyOptions,
            unit: 'metros lineales'
          });
          return;
        }
        
        // Modo stickers (cálculo automático)
        layout = calculateLayout(width, height, quantity, material.width, spacing);
        
        if (layout.error) {
          setResults({ error: true, message: layout.message });
          return;
        }

        priceData = getCustomDTFTextilPrice(layout.totalMeters);
        
        setResults({
          type: 'sticker',
          productName: material.name,
          width: layout.isRotated ? height : width,
          height: layout.isRotated ? width : height,
          quantity,
          ...layout,
          meters: layout.totalMeters,
          materialWidth: material.width,
          price: priceData.total,
          pricePerMeter: priceData.pricePerMeter,
          priceType: priceData.type,
          loyaltyOptions: priceData.loyaltyOptions,
          unit: 'metros lineales'
        });

      } else if (productType === 'dtf_uv') {
        material = MATERIALS.DTF_UV;
        
        // Modo metros directo
        if (calculationMode === 'meters') {
          const meters = parseFloat(formData.meters);
          
          if (!meters) {
            setResults(null);
            return;
          }

          priceData = getCustomDTFUVPrice(meters);
          
          setResults({
            type: 'meters',
            productName: material.name,
            meters,
            materialWidth: material.width,
            price: priceData.total,
            pricePerMeter: priceData.pricePerMeter,
            loyaltyOptions: priceData.loyaltyOptions,
            unit: 'metros lineales'
          });
          return;
        }
        
        // Modo stickers (cálculo automático)
        layout = calculateLayout(width, height, quantity, material.width, spacing);
        
        if (layout.error) {
          setResults({ error: true, message: layout.message });
          return;
        }

        priceData = getCustomDTFUVPrice(layout.totalMeters);
        
        setResults({
          type: 'sticker',
          productName: material.name,
          width: layout.isRotated ? height : width,
          height: layout.isRotated ? width : height,
          quantity,
          ...layout,
          meters: layout.totalMeters,
          materialWidth: material.width,
          price: priceData.total,
          pricePerMeter: priceData.pricePerMeter,
          loyaltyOptions: priceData.loyaltyOptions,
          unit: 'metros lineales'
        });

      } else if (productType === 'viniles') {
        material = MATERIALS.VINILES;
        // Usar ancho específico del tipo de vinil si está disponible, sino usar el ancho general
        const materialWidth = material.types[vinylType]?.width || material.width;
        const vinylCalc = calculateVinylM2(width, height, quantity, materialWidth, spacing);
        
        if (vinylCalc.error) {
          setResults({ error: true, message: vinylCalc.message });
          return;
        }

        priceData = getCustomVinylPrice(vinylType, vinylCalc.m2);
        
        setResults({
          type: 'sticker',
          productName: `${material.types[vinylType].name}`,
          width: vinylCalc.isRotated ? height : width,
          height: vinylCalc.isRotated ? width : height,
          quantity,
          ...vinylCalc,
          meters: vinylCalc.totalMeters,
          m2: vinylCalc.m2,
          materialWidth: materialWidth,
          price: priceData.total,
          pricePerM2: priceData.pricePerM2,
          subtotal: priceData.subtotal,
          minimumApplied: priceData.minimumApplied,
          minimum: priceData.minimum,
          unit: 'metros cuadrados'
        });
      }
    } catch (error) {
      console.error('Error en cálculo:', error);
      setResults({ error: true, message: 'Error en el cálculo' });
    }
  }, [formData, productType, vinylType, calculationMode]);

  // Calcular resultados cuando cambian los inputs
  useEffect(() => {
    calculateResults();
  }, [calculateResults]);

  // Manejar scroll para cambiar el fondo del navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleReset = () => {
    setFormData({
      width: '',
      height: '',
      quantity: '',
      spacing: '0.5',
      meters: '',
      cuts: '',
      sheets: ''
    });
    setResults(null);
  };

  const handleAddToList = (customItem = null) => {
    const itemToAdd = customItem || results;
    if (!itemToAdd || itemToAdd.error) return;
    
    const newItem = {
      id: Date.now(),
      ...itemToAdd
    };
    
    setQuotedItems(prev => [...prev, newItem]);
    handleReset();
  };

  const handleRemoveItem = (itemId) => {
    setQuotedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleClearList = () => {
    setQuotedItems([]);
  };

  const handleCopyAllItems = () => {
    if (quotedItems.length === 0) return;
    
    let text = '📋 COTIZACIÓN COMPLETA\n';
    text += '═'.repeat(50) + '\n\n';
    
    quotedItems.forEach((item, index) => {
      text += `${index + 1}. ${item.productName}\n`;
      
      if (item.type === 'papel') {
        text += `   • Medidas: ${item.width} × ${item.height} cm\n`;
        text += `   • Cantidad: ${item.quantity} stickers\n`;
        text += `   • Hojas: ${item.sheetsNeeded} (${item.perSheet} por hoja)\n`;
        text += `   • Precio: ${formatPrice(item.total)}\n`;
      } else if (item.type === 'meters') {
        text += `   • Material: ${item.materialWidth} cm ancho\n`;
        text += `   • Metros: ${formatMeters(item.meters)}\n`;
        text += `   • Precio: ${formatPrice(item.price)}\n`;
      } else if (item.type === 'sticker') {
        text += `   • Medidas: ${item.width} × ${item.height} cm\n`;
        text += `   • Cantidad: ${item.quantity} unidades\n`;
        if (item.meters) {
          text += `   • Material: ${formatMeters(item.meters)}\n`;
        } else if (item.m2) {
          text += `   • Material: ${formatM2(item.m2)}\n`;
        }
        text += `   • Precio: ${formatPrice(item.price)}\n`;
      }
      
      text += '\n';
    });
    
    const total = quotedItems.reduce((sum, item) => sum + (item.total || item.price || 0), 0);
    text += '═'.repeat(50) + '\n';
    text += `TOTAL GENERAL: ${formatPrice(total)}\n`;
    text += '═'.repeat(50) + '\n';
    
    navigator.clipboard.writeText(text);
  };

  const handleCopyToClipboard = () => {
    if (!results) return;
    
    const text = generateQuotationText(results);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Mostrar pantalla de carga mientras se cargan los precios desde Supabase
  if (pricesLoading || !customPrices) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando configuración de precios...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si hay problemas cargando precios
  if (pricesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-red-50 border-2 border-red-300 rounded-lg p-8 max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Error al cargar precios</h2>
          <p className="text-red-600 mb-4">{pricesError}</p>
          <button
            onClick={reloadPrices}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50">
      {/* Page Title Section */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-8 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Calculator size={36} />
            <div>
              <h1 className="text-3xl font-bold">
                Cotizador de Productos
              </h1>
              <p className="text-cyan-100 mt-1">
                Calcula precios y optimiza tus pedidos en tiempo real
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuotedItemsList 
          items={quotedItems}
          onRemoveItem={handleRemoveItem}
          onClearAll={handleClearList}
          onCopyAll={handleCopyAllItems}
        />
        
        <PriceReferenceTable 
          customPrices={customPrices}
          onPricesChange={setCustomPrices}
          clientType={clientType}
        />
        
        {/* Selector de Tipo de Cliente */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign size={20} />
            Tipo de Cliente
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setClientType('elite')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                clientType === 'elite'
                  ? 'bg-white text-purple-600 shadow-lg scale-105'
                  : 'bg-purple-400 hover:bg-purple-300 text-white'
              }`}
            >
              <div className="text-sm">👑</div>
              <div className="font-bold">Elite</div>
              <div className="text-xs opacity-75">-15%</div>
            </button>
            <button
              onClick={() => setClientType('pro')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                clientType === 'pro'
                  ? 'bg-white text-pink-600 shadow-lg scale-105'
                  : 'bg-pink-400 hover:bg-pink-300 text-white'
              }`}
            >
              <div className="text-sm">🏢</div>
              <div className="font-bold">Pro/Printer</div>
              <div className="text-xs opacity-75">Precio base</div>
            </button>
            <button
              onClick={() => setClientType('cf')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                clientType === 'cf'
                  ? 'bg-white text-purple-600 shadow-lg scale-105'
                  : 'bg-purple-400 hover:bg-purple-300 text-white'
              }`}
            >
              <div className="text-sm">💰</div>
              <div className="font-bold">CF</div>
              <div className="text-xs opacity-75">+15%</div>
            </button>
          </div>
          <p className="text-white text-xs mt-3 text-center opacity-90">
            Los precios se ajustan automáticamente según el tipo de cliente seleccionado
          </p>
        </div>
        
        <ProductSelector 
          productType={productType}
          setProductType={setProductType}
          vinylType={vinylType}
          setVinylType={setVinylType}
        />
        
        <StickerForm 
          productType={productType}
          calculationMode={calculationMode}
          setCalculationMode={setCalculationMode}
          formData={formData}
          handleInputChange={handleInputChange}
        />

        <ResultsPanel 
          results={results}
          copied={copied}
          handleCopyToClipboard={handleCopyToClipboard}
          handleReset={handleReset}
          onAddToList={handleAddToList}
        />
      </div>

      {/* Footer info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Info size={20} className="text-cyan-500" />
            Información importante
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Lista acumulativa:</strong> Usa "Agregar a Lista" para cotizar múltiples productos y obtener un total general</li>
            <li>• Los precios incluyen impresión, no incluye diseño</li>
            <li>• El espaciado por defecto (0.5cm) es recomendado para cortes limpios</li>
            <li>• El sistema optimiza automáticamente la orientación para aprovechar el material</li>
            <li>• DTF Textil: Programa de lealtad disponible para pedidos anticipados</li>
            <li>• Papel Adhesivo: Hoja de 31×46 cm (área imprimible: 28×43 cm con 1.5cm de margen para marcas)</li>
            <li>• Tiempos de entrega: 1-3 días dependiendo del producto</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Cotizador;
