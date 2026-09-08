// lib/googleSheets.ts

const SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY;

export async function fetchSheetData(sheetName: string) {
  if (!SHEET_ID || !API_KEY) {
    throw new Error('Konfigurasi Google Sheets tidak ditemukan.');
  }

  const encodedSheetName = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedSheetName}!A:Z?key=${API_KEY}`;
  
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Gagal membaca sheet ${sheetName} (${res.status}).`);
  }
  
  const data = await res.json();
  return data.values || [];
}

export function valuesToObjects<T>(values: any[][]): T[] {
  if (!values || values.length < 2) return [];

  // Membersihkan header agar tidak ada spasi tambahan yang merusak akses key
  const headers = values[0].map((h: any) => h?.toString().trim());

  return values.slice(1).map((row) => {
    const obj: any = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header] = row[i] ?? '';
      }
    });
    return obj as T;
  });
}

export function getSheetValue(
  row: Record<string, unknown>,
  ...names: string[]
): string {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [
      key.trim().toLowerCase(),
      value,
    ])
  );

  for (const name of names) {
    const value = normalized.get(name.trim().toLowerCase());
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
}