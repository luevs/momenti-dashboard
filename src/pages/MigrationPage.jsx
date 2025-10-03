import React, { useState } from 'react';
import { migrateLoyaltyData, verifyMigration, deactivateLoyaltyClients, runFullMigration } from '../utils/migrateLoyaltyData.js';

const MigrationPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [step, setStep] = useState(1);

  const handleMigration = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const result = await migrateLoyaltyData();
      setResults(result);
      if (result.success) {
        setStep(2);
      }
    } catch (error) {
      setResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    setIsLoading(true);
    
    try {
      const result = await verifyMigration();
      setResults(prev => ({ ...prev, verification: result }));
      if (result) {
        setStep(3);
      }
    } catch (error) {
      setResults(prev => ({ ...prev, verificationError: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivation = async () => {
    setIsLoading(true);
    
    try {
      const result = await deactivateLoyaltyClients();
      setResults(prev => ({ ...prev, deactivation: result }));
      if (result.success) {
        setStep(4);
      }
    } catch (error) {
      setResults(prev => ({ ...prev, deactivationError: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullMigration = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const result = await runFullMigration();
      setResults(result);
      if (result.success) {
        setStep(4);
      }
    } catch (error) {
      setResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🔄 Migración de Loyalty Clients a Loyalty Programs
          </h1>

          {/* Advertencia */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>⚠️ ADVERTENCIA:</strong> Esta página es para migrar datos de producción. 
                  Asegúrate de tener un backup antes de proceder.
                </p>
              </div>
            </div>
          </div>

          {/* Pasos */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    step >= num ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {num}
                  </div>
                  {num < 4 && <div className={`w-12 h-0.5 ${step > num ? 'bg-blue-500' : 'bg-gray-300'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Migrar</span>
              <span>Verificar</span>
              <span>Desactivar</span>
              <span>Completado</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-4">
            {step === 1 && (
              <div className="space-y-3">
                <button
                  onClick={handleMigration}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {isLoading ? 'Migrando...' : '1️⃣ Migrar Datos'}
                </button>
                
                <div className="text-sm text-gray-600">
                  <p>O ejecutar todo el proceso de una vez:</p>
                  <button
                    onClick={handleFullMigration}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mt-2"
                  >
                    {isLoading ? 'Ejecutando...' : '🚀 Migración Completa (Recomendado)'}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <button
                onClick={handleVerification}
                disabled={isLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {isLoading ? 'Verificando...' : '2️⃣ Verificar Migración'}
              </button>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <button
                  onClick={handleDeactivation}
                  disabled={isLoading}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {isLoading ? 'Desactivando...' : '3️⃣ Desactivar Loyalty Clients'}
                </button>
                <p className="text-sm text-gray-600">
                  Esto marcará los registros como inactivos (no los elimina por seguridad)
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-green-600">¡Migración Completada!</h2>
                <p className="text-gray-600 mt-2">
                  Todos los datos han sido migrados exitosamente a loyalty_programs
                </p>
              </div>
            )}
          </div>

          {/* Resultados */}
          {results && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">📊 Resultados:</h3>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}

          {/* Instrucciones */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold mb-2">📋 Instrucciones:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Ejecuta "Migración Completa" para migrar todos los datos automáticamente</li>
              <li>Verifica que los conteos coinciden entre las dos tablas</li>
              <li>Prueba la aplicación para asegurarte que todo funciona</li>
              <li>Solo después de estar 100% seguro, desactiva loyalty_clients</li>
              <li>Elimina esta página temporal después de la migración</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;