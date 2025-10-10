import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

const JobUploader = ({ onJobProcessed, className = '' }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Manejar drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  // Manejar selección de archivo
  const handleFileSelection = (file) => {
    setError(null);
    
    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Use PNG, JPG, GIF o BMP.');
      return;
    }
    
    // Validar tamaño (16MB max)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('El archivo es demasiado grande. Máximo 16MB.');
      return;
    }
    
    setUploadedFile(file);
    
    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Procesar archivo con OCR
  const processFile = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('preview', uploadedFile);
      
      const response = await fetch(`${API_BASE}/api/upload-preview`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error procesando imagen');
      }
      
      const result = await response.json();
      
      // Llamar callback con los resultados
      if (onJobProcessed) {
        onJobProcessed(result);
      }
      
      // Reset del componente
      resetUploader();
      
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message || 'Error procesando la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset del uploader
  const resetUploader = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Click en el input file
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Área de upload */}
      {!uploadedFile && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileInputClick}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Subir captura del trabajo
          </h3>
          <p className="text-gray-500 mb-4">
            Arrastra y suelta una imagen aquí, o haz clic para seleccionar
          </p>
          <p className="text-sm text-gray-400">
            PNG, JPG, GIF hasta 16MB
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preview y controles */}
      {uploadedFile && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {uploadedFile.name}
                </span>
                <span className="text-xs text-gray-500">
                  ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={resetUploader}
                className="p-1 hover:bg-gray-200 rounded"
                disabled={isProcessing}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Preview de imagen */}
          {previewUrl && (
            <div className="p-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full h-auto max-h-96 mx-auto rounded border"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Controles */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                La imagen será procesada con OCR para extraer información del trabajo
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={resetUploader}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={processFile}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Procesar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobUploader;