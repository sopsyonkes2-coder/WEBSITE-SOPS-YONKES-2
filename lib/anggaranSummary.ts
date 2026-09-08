function cleanCurrency(value: unknown) {
  if (value === undefined || value === null || value === '') return 0;
  const raw = String(value).trim().replace(/Rp\.?/gi, '').replace(/\s/g, '');
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/\./g, '').replace(',', '.');
  return Number(normalized.replace(/[^\d.-]/g, '')) || 0;
}

function value(row: Record<string, unknown>, ...keys: string[]) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const found = entries.find(([name]) => name.trim().toLowerCase() === key.toLowerCase());
    if (found && found[1] !== undefined && found[1] !== '') return found[1];
  }
  return '';
}

export function getAnggaranSummary(
  anggaran: Record<string, unknown>[],
  realisasi: Record<string, unknown>[],
  tahun: string
) {
  const totalPagu = anggaran
    .filter((item) => String(value(item, 'TAHUN', 'Tahun')).trim() === tahun)
    .reduce((total, item) => total + cleanCurrency(value(item, 'TOTAL PAGU', 'Total Pagu')), 0);

  const totalRealisasi = realisasi
    .filter((item) => String(value(item, 'TAHUN', 'Tahun')).trim() === tahun)
    .reduce((total, item) => total + cleanCurrency(value(item, 'NILAI REALISASI', 'Total Realisasi')), 0);

  return {
    totalPagu,
    totalRealisasi,
    totalSisa: totalPagu - totalRealisasi,
  };
}