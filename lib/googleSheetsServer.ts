import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

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

function ensureServerCredentials() {
  if (!SHEET_ID) {
    throw new Error('Google Sheet ID is not configured. Set GOOGLE_SHEET_ID or NEXT_PUBLIC_GOOGLE_SHEET_ID.');
  }
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google service account credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }
}

async function loadReviewSheet() {
  ensureServerCredentials();

  const auth = new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY as string,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID as string, auth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle[REVIEW_SHEET_TITLE];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: REVIEW_SHEET_TITLE,
      headerValues: ['NAMA', 'JABATAN', 'ULASAN'],
    });
  }

  return sheet;
}

export type SheetReviewItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

function getCellValue(row: any, header: string) {
  const value = row[header] ?? row[header.toLowerCase()] ?? row[header.toUpperCase()];
  return value?.toString().trim() || '';
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

export async function getReviewsFromSheet() {
  const sheet = await loadReviewSheet();
  const rows = await sheet.getRows();

  return rows
    .map((row) => {
      const rowNumber = (row as any)._rowNumber ?? (row as any).rowNumber;
      const name =
        getCellValue(row, 'NAMA') ||
        getCellValue(row, 'NAME') ||
        getCellValue(row, 'A') ||
        getCellValueByIndex(row, 0);
      const role =
        getCellValue(row, 'JABATAN') ||
        getCellValue(row, 'ROLE') ||
        getCellValue(row, 'B') ||
        getCellValueByIndex(row, 1);
      const quote =
        getCellValue(row, 'ULASAN') ||
        getCellValue(row, 'REVIEW') ||
        getCellValue(row, 'QUOTE') ||
        getCellValue(row, 'C') ||
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

export async function appendReviewToSheet(review: { name: string; role: string; quote: string }) {
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
  const row = rows.find((row) => String((row as any)._rowNumber ?? (row as any).rowNumber) === String(id));
  if (!row) return false;
  await row.delete();
  return true;
}
