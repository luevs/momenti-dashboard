import { supabase } from '../supabaseClient.js';

/**
 * Script para migrar datos de loyalty_clients a loyalty_programs
 * EJECUTAR SOLO UNA VEZ EN PRODUCCIÓN
 */

export const migrateLoyaltyData = async () => {
  try {
    console.log('🔄 Iniciando migración de loyalty_clients a loyalty_programs...');

    // 1. Obtener todos los registros de loyalty_clients
    const { data: loyaltyClients, error: fetchError } = await supabase
      .from('loyalty_clients')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Error al obtener loyalty_clients:', fetchError);
      return { success: false, error: fetchError };
    }

    console.log(`📊 Encontrados ${loyaltyClients.length} registros en loyalty_clients`);

    if (loyaltyClients.length === 0) {
      console.log('✅ No hay registros para migrar');
      return { success: true, migrated: 0 };
    }

    // 2. Transformar los datos para loyalty_programs
    const loyaltyPrograms = loyaltyClients.map(client => ({
      customer_id: client.customer_id,
      program_number: client.program_number || `PROG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: client.type,
      total_meters: client.totalMeters,
      remaining_meters: client.remainingMeters,
      status: client.status,
      purchase_date: client.purchase_date || client.lastPurchase,
      completion_date: client.status === 'completado' ? client.updated_at : null,
      numero_wpp: client.numeroWpp,
      edit_reason: client.editReason,
      edit_authorized_by: client.editAuthorizedBy,
      created_at: client.created_at
    }));

    // 3. Insertar en loyalty_programs (en lotes para mejor performance)
    const batchSize = 100;
    let totalMigrated = 0;
    
    for (let i = 0; i < loyaltyPrograms.length; i += batchSize) {
      const batch = loyaltyPrograms.slice(i, i + batchSize);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('loyalty_programs')
        .insert(batch)
        .select('id');

      if (insertError) {
        console.error(`❌ Error al insertar lote ${Math.floor(i/batchSize) + 1}:`, insertError);
        return { success: false, error: insertError, migrated: totalMigrated };
      }

      totalMigrated += insertedData.length;
      console.log(`✅ Migrado lote ${Math.floor(i/batchSize) + 1}: ${insertedData.length} registros`);
    }

    console.log(`🎉 Migración completada exitosamente: ${totalMigrated} registros`);
    
    return { 
      success: true, 
      migrated: totalMigrated,
      originalCount: loyaltyClients.length 
    };

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    return { success: false, error };
  }
};

/**
 * Verificar que la migración fue exitosa comparando conteos
 */
export const verifyMigration = async () => {
  try {
    // Contar registros activos en loyalty_clients
    const { count: clientsCount, error: clientsError } = await supabase
      .from('loyalty_clients')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (clientsError) {
      console.error('❌ Error al contar loyalty_clients:', clientsError);
      return false;
    }

    // Contar registros en loyalty_programs
    const { count: programsCount, error: programsError } = await supabase
      .from('loyalty_programs')
      .select('*', { count: 'exact', head: true });

    if (programsError) {
      console.error('❌ Error al contar loyalty_programs:', programsError);
      return false;
    }

    console.log(`📊 Comparación de registros:`);
    console.log(`   loyalty_clients (activos): ${clientsCount}`);
    console.log(`   loyalty_programs: ${programsCount}`);

    if (clientsCount === programsCount) {
      console.log('✅ Verificación exitosa: Los conteos coinciden');
      return true;
    } else {
      console.log('⚠️ Advertencia: Los conteos no coinciden');
      return false;
    }

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
    return false;
  }
};

/**
 * SOLO DESPUÉS de verificar que todo está correcto
 * Marcar loyalty_clients como inactivos (no eliminar por seguridad)
 */
export const deactivateLoyaltyClients = async () => {
  try {
    console.log('🔄 Desactivando registros de loyalty_clients...');

    const { data, error } = await supabase
      .from('loyalty_clients')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .select('id');

    if (error) {
      console.error('❌ Error al desactivar loyalty_clients:', error);
      return { success: false, error };
    }

    console.log(`✅ Desactivados ${data.length} registros en loyalty_clients`);
    return { success: true, deactivated: data.length };

  } catch (error) {
    console.error('❌ Error durante la desactivación:', error);
    return { success: false, error };
  }
};

// Función principal que ejecuta todo el proceso
export const runFullMigration = async () => {
  console.log('🚀 Iniciando proceso completo de migración...');
  
  // Paso 1: Migrar datos
  const migrationResult = await migrateLoyaltyData();
  if (!migrationResult.success) {
    console.log('❌ Migración fallida. Abortando proceso.');
    return migrationResult;
  }

  // Paso 2: Verificar migración
  const verificationResult = await verifyMigration();
  if (!verificationResult) {
    console.log('⚠️ Verificación fallida. Revisa manualmente antes de continuar.');
    return { success: false, error: 'Verification failed' };
  }

  // Paso 3: Desactivar tabla antigua (opcional)
  console.log('¿Deseas desactivar loyalty_clients ahora? (Recomendado esperar y verificar en producción)');
  // const deactivationResult = await deactivateLoyaltyClients();

  return {
    success: true,
    migration: migrationResult,
    verification: verificationResult
  };
};