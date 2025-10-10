import React, { useState } from 'react';
import { Edit3, Save, X, User, Package, Ruler, Calendar, FileText, Hash, AlertTriangle } from 'lucide-react';

const JobResults = ({ jobData, onSave, onReprocess, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    client_name: jobData?.ocr_results?.client_name || '',
    job_description: jobData?.ocr_results?.job_description || '',
    quantity: jobData?.ocr_results?.quantity || 0,
    material: jobData?.ocr_results?.material || '',
    size: jobData?.ocr_results?.size || '',
    deadline: jobData?.ocr_results?.deadline || '',
    special_instructions: jobData?.ocr_results?.special_instructions || ''
  });

  const handleInputChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        job_id: jobData.job_id,
        ...editedData
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData({
      client_name: jobData?.ocr_results?.client_name || '',
      job_description: jobData?.ocr_results?.job_description || '',
      quantity: jobData?.ocr_results?.quantity || 0,
      material: jobData?.ocr_results?.material || '',
      size: jobData?.ocr_results?.size || '',
      deadline: jobData?.ocr_results?.deadline || '',
      special_instructions: jobData?.ocr_results?.special_instructions || ''
    });
    setIsEditing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 80) return '✓';
    if (confidence >= 60) return '⚠';
    return '✗';
  };

  if (!jobData) {
    return null;
  }

  const { ocr_results, job_id, processed_at } = jobData;
  const confidence = ocr_results?.confidence || 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Información Extraída del Trabajo
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              ID: {job_id} • Procesado: {new Date(processed_at).toLocaleString()}
            </p>
          </div>
          
          {/* Indicador de confianza */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(confidence)}`}>
            {getConfidenceIcon(confidence)} {confidence.toFixed(1)}% confianza
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Controles */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <Edit3 className="h-4 w-4" />
                <span>Editar</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>
              </>
            )}
          </div>
          
          {onReprocess && (
            <button
              onClick={() => onReprocess(jobData)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Reprocesar
            </button>
          )}
        </div>

        {/* Formulario de datos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4" />
              <span>Cliente</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del cliente"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                {editedData.client_name || 'No detectado'}
              </p>
            )}
          </div>

          {/* Cantidad */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Hash className="h-4 w-4" />
              <span>Cantidad</span>
            </label>
            {isEditing ? (
              <input
                type="number"
                value={editedData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                {editedData.quantity || 'No detectado'}
              </p>
            )}
          </div>

          {/* Material */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Package className="h-4 w-4" />
              <span>Material</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.material}
                onChange={(e) => handleInputChange('material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tipo de material"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                {editedData.material || 'No detectado'}
              </p>
            )}
          </div>

          {/* Tamaño */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Ruler className="h-4 w-4" />
              <span>Tamaño</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dimensiones"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                {editedData.size || 'No detectado'}
              </p>
            )}
          </div>

          {/* Fecha límite */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4" />
              <span>Fecha límite</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fecha de entrega"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                {editedData.deadline || 'No detectado'}
              </p>
            )}
          </div>
        </div>

        {/* Descripción del trabajo */}
        <div className="mt-6">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4" />
            <span>Descripción del trabajo</span>
          </label>
          {isEditing ? (
            <textarea
              value={editedData.job_description}
              onChange={(e) => handleInputChange('job_description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción detallada del trabajo"
            />
          ) : (
            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border min-h-[80px]">
              {editedData.job_description || 'No detectado'}
            </p>
          )}
        </div>

        {/* Instrucciones especiales */}
        <div className="mt-6">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Instrucciones especiales</span>
          </label>
          {isEditing ? (
            <textarea
              value={editedData.special_instructions}
              onChange={(e) => handleInputChange('special_instructions', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas e instrucciones especiales"
            />
          ) : (
            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
              {editedData.special_instructions || 'Ninguna'}
            </p>
          )}
        </div>

        {/* Texto detectado crudo */}
        {ocr_results?.detected_text && (
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Texto completo detectado
            </label>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {ocr_results.detected_text}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobResults;