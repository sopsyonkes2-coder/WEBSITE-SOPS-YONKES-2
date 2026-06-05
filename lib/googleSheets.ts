// lib/googleSheets.ts
const SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID!;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY!;

export async function fetchSheetData(sheetName: string, range: string = 'A:Z') {
  if (!API_KEY) throw new Error("API Key belum diatur");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}!${range}?key=${API_KEY}`;
  
  console.log(`🔍 Fetching: ${sheetName}`);

  const res = await fetch(url, { 
    cache: 'no-store',
    next: { revalidate: 0 }
  });
  
  if (!res.ok) throw new Error(`Gagal fetch ${sheetName}: ${res.statusText}`);
  
  const data = await res.json();
  console.log(`✅ Sukses fetch ${sheetName} | Baris: ${data.values?.length || 0}`);
  return data.values || [];
}

export function valuesToObjects<T>(values: any[][]): T[] {
  if (!values || values.length < 2) return [];

  const headers = values[0].map((h: any) => 
    h?.toString().trim().replace(/\s+/g, ' ') || ''
  );

  return values.slice(1).map((row) => {
    const obj: any = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header] = row[i] || '';
      }
    });
    return obj as T;
  });
}