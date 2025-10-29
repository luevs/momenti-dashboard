// Utilities to provide a short 3-digit incremental customer ID
// Strategy:
// - Fetch recent ids from `customers_` and parse numeric ids
// - If a numeric max is found and >= fallbackBase, return max+1
// - Otherwise return fallbackBase
export async function getNextCustomerId(supabase, fallbackBase = 712) {
  try {
    // Fetch ids (limit to a reasonable number). We will parse numbers locally.
    const { data, error } = await supabase
      .from('customers_')
      .select('id')
      .limit(1000);

    if (error) {
      console.error('getNextCustomerId supabase error:', error);
      // fallback to base
      return { next: fallbackBase, nextStr: String(fallbackBase).padStart(3, '0') };
    }

    const ids = (data || []).map(d => String(d.id || '').trim()).filter(Boolean);
    // Extract numeric-only ids and parse
    const numericIds = ids
      .map(s => s.replace(/[^0-9]/g, ''))
      .filter(s => s.length > 0)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0);

    const maxNumeric = numericIds.length > 0 ? Math.max(...numericIds) : null;
    let next;
    if (maxNumeric !== null && maxNumeric >= fallbackBase) {
      next = maxNumeric + 1;
    } else {
      next = fallbackBase;
    }

    return { next, nextStr: String(next).padStart(3, '0') };
  } catch (err) {
    console.error('getNextCustomerId unexpected error:', err);
    return { next: fallbackBase, nextStr: String(fallbackBase).padStart(3, '0') };
  }
}
