import { supabase } from '../supabaseClient';

const buildRecordedAtIso = (productionDate) => {
  if (!productionDate) return new Date().toISOString();
  const base = new Date(productionDate);
  if (Number.isNaN(base.getTime())) return new Date().toISOString();
  base.setHours(12, 0, 0, 0);
  return base.toISOString();
};

const fetchTrackableSupplies = async (machineId) => {
  const { data, error } = await supabase
    .from('machine_supplies')
    .select('id, machine_id, supply_type_id, current_stock, consumption_ratio, auto_track, meters_accounted, supply_types(name, unit)')
    .eq('machine_id', machineId);

  if (error) throw error;
  const supplies = Array.isArray(data) ? data : [];
  const trackable = supplies.filter((supply) => supply.auto_track !== false);
  return trackable.length > 0 ? trackable : supplies;
};

const buildMovementPayload = ({
  supply,
  machineId,
  quantityChange,
  operator,
  productionRecordId,
  productionDate,
  metersAccountedAfter,
}) => {
  const recordedAt = buildRecordedAtIso(productionDate);
  const before = Number(supply.current_stock) || 0;
  const after = Number((before + quantityChange).toFixed(3));
  const movementType = quantityChange < 0 ? 'consumption' : 'adjustment';

  return {
    movement: {
      machine_id: machineId,
      supply_type_id: supply.supply_type_id,
      movement_type: movementType,
      quantity_before: before,
      quantity_after: after,
      quantity_changed: Number(quantityChange.toFixed(3)),
      recorded_by: operator || 'Sistema',
      notes: movementType === 'consumption'
        ? `Consumo automático por ${productionDate}`
        : `Ajuste automático por modificación del corte ${productionDate}`,
      production_record_id: productionRecordId || null,
      recorded_at: recordedAt,
    },
    stockUpdate: {
      current_stock: after,
      meters_accounted: metersAccountedAfter,
      last_updated: recordedAt,
      updated_by: operator || 'Sistema',
    },
  };
};

export const autoConsumeAfterProduction = async ({
  machineId,
  meters,
  operator,
  productionRecordId,
  productionDate,
}) => {
  const parsedMeters = Number(meters);
  if (!machineId || !Number.isFinite(parsedMeters) || parsedMeters === 0) return [];

  const supplies = await fetchTrackableSupplies(machineId);
  if (supplies.length === 0) return [];

  const consuming = parsedMeters > 0;
  const magnitude = Math.abs(parsedMeters);
  const summary = [];

  for (const supply of supplies) {
    const ratio = Number(supply.consumption_ratio) || 1;
    const quantity = Number((magnitude * ratio).toFixed(3));
    if (quantity === 0) continue;

    const change = consuming ? -quantity : quantity;
    const accountedBefore = Number(supply.meters_accounted) || 0;
    const accountedAfter = consuming
      ? Number((accountedBefore + magnitude).toFixed(3))
      : Math.max(0, Number((accountedBefore - magnitude).toFixed(3)));
    const { movement, stockUpdate } = buildMovementPayload({
      supply,
      machineId,
      quantityChange: change,
      operator,
      productionRecordId,
      productionDate,
      metersAccountedAfter: accountedAfter,
    });

    const { error: movementError } = await supabase.from('supply_movements').insert([movement]);
    if (movementError) throw movementError;

    const { error: updateError } = await supabase
      .from('machine_supplies')
      .update(stockUpdate)
      .eq('id', supply.id);
    if (updateError) throw updateError;

    summary.push({
      name: supply?.supply_types?.name || `Insumo ${supply.supply_type_id}`,
      amount: quantity,
      unit: supply?.supply_types?.unit || '',
      type: consuming ? 'consumption' : 'adjustment',
    });
  }

  return summary;
};
