// Utilities for generating and obtaining program folios (3-digit strings)
export async function getNextProgramFolio(supabase) {
  try {
    // Find the maximum numeric program_folio stored (non-null)
    const { data: maxFolioData, error } = await supabase
      .from('loyalty_programs')
      .select('program_folio')
      .not('program_folio', 'is', null)
      .order('program_folio', { ascending: false })
      .limit(1);

    if (error) {
      console.error('getNextProgramFolio supabase error:', error);
      return null;
    }

    let next = 1;
    if (maxFolioData && maxFolioData.length > 0) {
      const current = parseInt(maxFolioData[0].program_folio, 10);
      if (Number.isFinite(current)) next = Math.max(current + 1, 1);
    }

    return String(next).padStart(3, '0');
  } catch (err) {
    console.error('getNextProgramFolio unexpected error:', err);
    return null;
  }
}

export function generateRandomFolio3() {
  // 1..999 -> pad to 3 digits
  const n = Math.floor(Math.random() * 999) + 1;
  return String(n).padStart(3, '0');
}
