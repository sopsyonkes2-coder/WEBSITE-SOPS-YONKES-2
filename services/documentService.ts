export const getDocuments = async () => {
  const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY;
  const RANGE = 'Sheet1!A:Z'; // Sesuaikan nama sheet Anda

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.values) return [];

  // Mengubah array array menjadi array object (header di baris pertama)
  const [headers, ...rows] = data.values;
  return rows.map((row: any[]) => {
    let obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index];
    });
    return obj;
  });
};