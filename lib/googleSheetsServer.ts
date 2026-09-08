import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { MANAGED_SHEETS } from './managedSheets';
export { MANAGED_SHEETS };

const SHEET_ID = process.env.GOOGLE_SHEET_ID || process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

function parsePrivateKey(value: string | undefined) {
  if (!value) return undefined;

  let key = value.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, '\n');
}

const PRIVATE_KEY = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
const REVIEW_SHEET_TITLE = 'ULASAN';
const SETTINGS_SHEET_TITLE = 'SETTINGS';
function ensureServerCredentials() {
  if (!SHEET_ID) {
    throw new Error('Google Sheet ID is not configured. Set GOOGLE_SHEET_ID or NEXT_PUBLIC_GOOGLE_SHEET_ID.');
  }
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google service account credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }
}

async function getAuth() {
  ensureServerCredentials();
  return new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY as string,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

async function getDoc() {
  const auth = await getAuth();
  const doc = new GoogleSpreadsheet(SHEET_ID as string, auth);
  await doc.loadInfo();
  return doc;
}

async function getOrCreateSheet(
  title: string,
  headerValues?: string[]
): Promise<GoogleSpreadsheetWorksheet> {
  const doc = await getDoc();
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    throw new Error(`Sheet "${title}" tidak ditemukan di Google Sheet.`);
  }
  return sheet;
}

/* ========================= SETTINGS / PASSWORD ========================= */

async function loadSettingsSheet() {
  return getOrCreateSheet(SETTINGS_SHEET_TITLE, ['KEY', 'VALUE']);
}

export async function getAdminPassword(): Promise<string> {
  try {
    const sheet = await loadSettingsSheet();
    const rows = await sheet.getRows();
    const row = rows.find((r) => {
      const key = (r.get('KEY') || r.get('Key') || (r as any)._rawData?.[0] || '')
        .toString()
        .trim()
        .toUpperCase();
      return key === 'ADMIN_PASSWORD';
    });
    if (row) {
      const val = (row.get('VALUE') || row.get('Value') || (row as any)._rawData?.[1] || '')
        .toString()
        .trim();
      if (val) return val;
    }
    throw new Error(`Baris ADMIN_PASSWORD tidak ditemukan di sheet ${SETTINGS_SHEET_TITLE}.`);
  } catch (err) {
    console.error('getAdminPassword error:', err);
    return '';
  }
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }
  const sheet = await loadSettingsSheet();
  const rows = await sheet.getRows();
  const existing = rows.find((r) => {
    const key = (r.get('KEY') || r.get('Key') || (r as any)._rawData?.[0] || '')
      .toString()
      .trim()
      .toUpperCase();
    return key === 'ADMIN_PASSWORD';
  });
  if (existing) {
    existing.set('VALUE', newPassword);
    await existing.save();
  } else {
    await sheet.addRow({ KEY: 'ADMIN_PASSWORD', VALUE: newPassword });
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = await getAdminPassword();
  return password === stored;
}

/* ========================= GENERIC CRUD ========================= */

export type SheetRow = {
  id: string;
  [key: string]: string;
};

function getCellValue(row: any, header: string) {
  try {
    const value =
      row.get?.(header) ?? row[header] ?? row[header.toLowerCase()] ?? row[header.toUpperCase()];
    return value?.toString().trim() || '';
  } catch {
    return '';
  }
}

function getCellValueByIndex(row: any, index: number) {
  if (row._rawData && typeof row._rawData[index] !== 'undefined') {
    return row._rawData[index]?.toString().trim() || '';
  }
  if (row[index] !== undefined) {
    return row[index]?.toString().trim() || '';
  }
  return '';
}

function getSheetRowNumber(row: any, index: number) {
  return String(row._rowNumber ?? row.rowNumber ?? index + 2);
}

export async function getSheetRows(
  sheetName: string
): Promise<{ headers: string[]; rows: SheetRow[] }> {
  const sheet = await getOrCreateSheet(sheetName);
  try {
    await sheet.loadHeaderRow();
  } catch {
    // sheet mungkin kosong
  }
  const headerValues = sheet.headerValues || [];
  const rows = await sheet.getRows();

  const result: SheetRow[] = rows.map((row, index) => {
    const rowNumber = getSheetRowNumber(row, index);
    const obj: SheetRow = { id: rowNumber };
    headerValues.forEach((h, i) => {
      if (h) {
        const value = getCellValue(row, h) || getCellValueByIndex(row, i);
        const trimmedHeader = h.trim();
        obj[h] = value;
        if (trimmedHeader !== h) obj[trimmedHeader] = value;
        const uppercaseHeader = trimmedHeader.toUpperCase();
        if (uppercaseHeader !== trimmedHeader) obj[uppercaseHeader] = value;
      }
    });
    return obj;
  });

  return { headers: headerValues.filter(Boolean), rows: result };
}

export async function appendSheetRow(
  sheetName: string,
  data: Record<string, string>
): Promise<void> {
  const sheet = await getOrCreateSheet(sheetName, Object.keys(data));
  await sheet.loadHeaderRow();
  const existingHeaders = sheet.headerValues || [];
  const newHeaders = Object.keys(data).filter((k) => !existingHeaders.includes(k));
  if (newHeaders.length > 0) {
    throw new Error(`Kolom ${newHeaders.join(', ')} belum ada di sheet "${sheetName}".`);
  }
  await sheet.addRow(data);
}

export async function updateSheetRow(
  sheetName: string,
  rowId: string,
  data: Record<string, string>
): Promise<boolean> {
  const sheet = await getOrCreateSheet(sheetName);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const row = rows.find(
    (r, index) => getSheetRowNumber(r, index) === String(rowId)
  );
  if (!row) return false;

  Object.entries(data).forEach(([key, value]) => {
    try {
      row.set(key, value);
    } catch {
      // ignore
    }
  });
  await row.save();
  return true;
}

export async function deleteSheetRow(sheetName: string, rowId: string): Promise<boolean> {
  const sheet = await getOrCreateSheet(sheetName);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const row = rows.find(
    (r, index) => getSheetRowNumber(r, index) === String(rowId)
  );
  if (!row) return false;
  await row.delete();
  return true;
}

export async function replaceSheetData(
  sheetName: string,
  headers: string[],
  rows: Record<string, string>[],
  /** Tulis per index kolom (A=0,B=1,...) — tidak map nama header */
  valuesByIndex?: string[][]
): Promise<void> {
  const sheet = await getOrCreateSheet(sheetName);

  // Matriks: baris 0 = header, berikutnya = data
  let matrix: string[][];
  if (valuesByIndex && valuesByIndex.length > 0) {
    const width = Math.max(headers.length, ...valuesByIndex.map((r) => r.length), 20);
    const headerRow = Array.from({ length: width }, (_, i) => String(headers[i] ?? ''));
    matrix = [
      headerRow,
      ...valuesByIndex.map((r) =>
        Array.from({ length: width }, (_, i) => String(r[i] ?? ''))
      ),
    ];
  } else {
    const width = Math.max(headers.length, 1);
    const headerRow = Array.from({ length: width }, (_, i) => String(headers[i] ?? ''));
    matrix = [
      headerRow,
      ...rows.map((row) =>
        headerRow.map((h, i) => {
          if (h) return String(row[h] ?? '');
          return String((row as Record<string, string>)[`__col_${i}`] ?? '');
        })
      ),
    ];
  }

  const colCount = Math.max(matrix[0]?.length || 20, 20);
  const rowCount = Math.max(matrix.length + 5, 15);

  try {
    await sheet.resize({ rowCount, columnCount: colCount });
  } catch {
    // ignore
  }

  // Kosongkan sheet (pakai auth google-spreadsheet yang sudah valid)
  await sheet.clear();

  // Header row lewat library (auth OK)
  // Untuk header kosong, beri placeholder unik sementara agar addRows stabil,
  // lalu tulis ulang nilai asli per sel.
  const safeHeaders = matrix[0].map((h, i) =>
    h && String(h).trim() ? String(h) : `__COL_${i}`
  );

  // Tulis seluruh matriks via loadCells — index baris/kolom, auth dari JWT doc
  const a1Range = `A1:${columnToLetter(colCount - 1)}${matrix.length}`;
  await sheet.loadCells(a1Range);

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = sheet.getCell(r, c);
      // Baris header: pakai nilai asli (boleh kosong)
      cell.value = matrix[r][c] ?? '';
    }
  }
  await sheet.saveUpdatedCells();
}

function columnToLetter(colIndex: number): string {
  let n = colIndex + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || 'A';
}

/* ========================= REVIEW (legacy) ========================= */

async function loadReviewSheet() {
  const sheet = await getOrCreateSheet(REVIEW_SHEET_TITLE, ['NAMA', 'JABATAN', 'ULASAN']);
  await sheet.loadHeaderRow();
  return sheet;
}

export type SheetReviewItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

export async function getReviewsFromSheet() {
  const sheet = await loadReviewSheet();
  const rows = await sheet.getRows();

  return rows
    .map((row) => {
      const rowNumber = (row as any)._rowNumber ?? (row as any).rowNumber;
      const name =
        getCellValue(row, 'NAMA') || getCellValue(row, 'NAME') || getCellValueByIndex(row, 0);
      const role =
        getCellValue(row, 'JABATAN') || getCellValue(row, 'ROLE') || getCellValueByIndex(row, 1);
      const quote =
        getCellValue(row, 'ULASAN') ||
        getCellValue(row, 'REVIEW') ||
        getCellValue(row, 'QUOTE') ||
        getCellValueByIndex(row, 2);

      return {
        id: String(rowNumber),
        name,
        role,
        quote,
      } as SheetReviewItem;
    })
    .reverse();
}

export async function appendReviewToSheet(review: {
  name: string;
  role: string;
  quote: string;
}) {
  const sheet = await loadReviewSheet();
  await sheet.addRow({
    NAMA: review.name,
    JABATAN: review.role,
    ULASAN: review.quote,
  });
}

export async function deleteReviewFromSheet(id: string) {
  const sheet = await loadReviewSheet();
  const rows = await sheet.getRows();
  const row = rows.find(
    (row) => String((row as any)._rowNumber ?? (row as any).rowNumber) === String(id)
  );
  if (!row) return false;
  await row.delete();
  return true;
}