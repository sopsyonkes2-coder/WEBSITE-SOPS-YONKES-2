import { NextResponse } from 'next/server';
import {
  verifyAdminPassword,
  setAdminPassword,
  getSheetRows,
  appendSheetRow,
  updateSheetRow,
  deleteSheetRow,
  replaceSheetData,
  MANAGED_SHEETS,
} from '@/lib/googleSheetsServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

function getPasswordFromRequest(req: Request): string | null {
  return req.headers.get('x-admin-password') ?? null;
}

async function requireAdmin(req: Request) {
  const password = getPasswordFromRequest(req);

  if (!password) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Password admin diperlukan.' },
        { status: 401 }
      ),
    };
  }

  const valid = await verifyAdminPassword(password);

  if (!valid) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Password admin salah.' },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER ANGKA
// ─────────────────────────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function formatNumber(value: number): string {
  return String(Math.round(value));
}

function findHeader(headers: string[], ...names: string[]) {
  return headers.find((header) =>
    names.some((name) => header.trim().toLowerCase() === name.toLowerCase())
  );
}

async function syncAnggaranPerbidang() {
  const [anggaranData, realisasiData, recapData] = await Promise.all([
    getSheetRows('ANGGARAN'),
    getSheetRows('REALISASI'),
    getSheetRows('ANGGARAN PERBIDANG'),
  ]);

  const headers = recapData.headers;
  const bidangHeader = findHeader(headers, 'BIDANG');
  const tahunHeader = findHeader(headers, 'TAHUN');
  const paguHeader = findHeader(headers, 'TOTAL PAGU', 'ANGGARAN', 'TOTAL ANGGARAN');
  const realisasiHeader = findHeader(headers, 'TOTAL REALISASI', 'REALISASI');

  if (!bidangHeader || !paguHeader) {
    throw new Error('Header ANGgaran Perbidang harus memiliki BIDANG dan ANGGARAN atau TOTAL PAGU.');
  }

  const anggaranById = new Map(
    anggaranData.rows.map((row) => [String(row['ID ANGGARAN'] || '').trim(), row])
  );
  const totals = new Map<string, { bidang: string; tahun: string; pagu: number; realisasi: number }>();

  for (const row of anggaranData.rows) {
    const bidang = String(row.BIDANG || '').trim();
    if (!['OPERASI', 'LATIHAN'].includes(bidang.toUpperCase())) continue;
    const tahun = String(row.TAHUN || '').trim();
    const key = `${bidang.toUpperCase()}|${tahun || 'SEMUA'}`;
    const current = totals.get(key) || { bidang, tahun, pagu: 0, realisasi: 0 };
    current.pagu += toNumber(row['TOTAL PAGU'] || row['TOTAL ANGGARAN'] || row.ANGGARAN);
    totals.set(key, current);
  }

  for (const row of realisasiData.rows) {
    const anggaran = anggaranById.get(String(row['ID ANGGARAN'] || '').trim());
    if (!anggaran) continue;
    const bidang = String(anggaran.BIDANG || '').trim();
    if (!['OPERASI', 'LATIHAN'].includes(bidang.toUpperCase())) continue;
    const tahun = String(anggaran.TAHUN || row.TAHUN || '').trim();
    const key = `${bidang.toUpperCase()}|${tahun || 'SEMUA'}`;
    const current = totals.get(key) || { bidang, tahun, pagu: 0, realisasi: 0 };
    current.realisasi += toNumber(row['NILAI REALISASI']);
    totals.set(key, current);
  }

  let updated = 0;
  let added = 0;
  for (const total of totals.values()) {
    const existing = recapData.rows.find((row) =>
      String(row[bidangHeader] || row.BIDANG || '').trim().toUpperCase() === total.bidang.toUpperCase() &&
      (!tahunHeader || String(row[tahunHeader] || row.TAHUN || '').trim() === total.tahun)
    );
    const data = {
      [bidangHeader]: total.bidang,
      [paguHeader]: formatNumber(total.pagu),
      ...(tahunHeader ? { [tahunHeader]: total.tahun } : {}),
      ...(realisasiHeader ? { [realisasiHeader]: formatNumber(total.realisasi) } : {}),
    };

    if (existing) {
      await updateSheetRow('ANGGARAN PERBIDANG', existing.id, data);
      updated++;
    } else {
      await appendSheetRow('ANGGARAN PERBIDANG', data);
      added++;
    }
  }

  return { updated, added, total: totals.size };
}

async function getComputedAnggaranPerbidang(tahunFilter?: string) {
  const [anggaranData, realisasiData, recapData] = await Promise.all([
    getSheetRows('ANGGARAN'),
    getSheetRows('REALISASI'),
    getSheetRows('ANGGARAN PERBIDANG'),
  ]);
  const totals = new Map<string, { bidang: string; tahun: string; anggaran: number; realisasi: number }>();
  const anggaranById = new Map(anggaranData.rows.map((row) => [String(row['ID ANGGARAN'] || '').trim(), row]));

  for (const row of anggaranData.rows) {
    const bidang = String(row.BIDANG || '').trim();
    const tahun = String(row.TAHUN || '').trim();
    if (!['OPERASI', 'LATIHAN'].includes(bidang.toUpperCase())) continue;
    if (tahunFilter && tahun !== tahunFilter) continue;
    const key = `${bidang.toUpperCase()}|${tahun}`;
    const current = totals.get(key) || { bidang, tahun, anggaran: 0, realisasi: 0 };
    current.anggaran += toNumber(row['TOTAL PAGU'] || row['TOTAL ANGGARAN'] || row.ANGGARAN);
    totals.set(key, current);
  }

  for (const row of realisasiData.rows) {
    const anggaran = anggaranById.get(String(row['ID ANGGARAN'] || '').trim());
    if (!anggaran) continue;
    const bidang = String(anggaran.BIDANG || '').trim();
    const tahun = String(anggaran.TAHUN || row.TAHUN || '').trim();
    if (!['OPERASI', 'LATIHAN'].includes(bidang.toUpperCase())) continue;
    if (tahunFilter && tahun !== tahunFilter) continue;
    const key = `${bidang.toUpperCase()}|${tahun}`;
    const current = totals.get(key) || { bidang, tahun, anggaran: 0, realisasi: 0 };
    current.realisasi += toNumber(row['NILAI REALISASI']);
    totals.set(key, current);
  }

  const headers = recapData.headers.length > 0 ? recapData.headers : ['ANGGARAN', 'BIDANG'];
  const bidangHeader = findHeader(headers, 'BIDANG') || 'BIDANG';
  const paguHeader = findHeader(headers, 'TOTAL PAGU', 'ANGGARAN', 'TOTAL ANGGARAN') || 'ANGGARAN';
  const realisasiHeader = findHeader(headers, 'TOTAL REALISASI', 'REALISASI');
  const tahunHeader = findHeader(headers, 'TAHUN');
  const rows = Array.from(totals.values()).map((total) => ({
    id: `computed-${total.bidang}-${total.tahun}`,
    [bidangHeader]: total.bidang,
    [paguHeader]: formatNumber(total.anggaran),
    ...(tahunHeader ? { [tahunHeader]: total.tahun } : {}),
    ...(realisasiHeader ? { [realisasiHeader]: formatNumber(total.realisasi) } : {}),
  }));
  const years = Array.from(new Set(anggaranData.rows.map((row) => String(row.TAHUN || '').trim()).filter(Boolean))).sort();
  return { headers, rows, years };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buat ID berurutan:
 *
 * ANG-2026-0001
 * DET-2026-0001
 * REL-2026-0001
 */
async function generateId(
  prefix: 'ANG' | 'DET' | 'REL',
  sheet: string,
  tahun: string
): Promise<string> {
  const result = await getSheetRows(sheet);

  const pattern = new RegExp(`^${prefix}-${tahun}-(\\d+)$`);

  let max = 0;

  for (const row of result.rows) {
    const id =
      row['ID ANGGARAN'] ||
      row['ID DETAIL'] ||
      row['ID REALISASI'] ||
      '';

    const match = String(id).match(pattern);

    if (match) {
      const number = parseInt(match[1], 10);

      if (number > max) {
        max = number;
      }
    }
  }

  return `${prefix}-${tahun}-${String(max + 1).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HITUNG TOTAL REALISASI
// ─────────────────────────────────────────────────────────────────────────────

function getTotalRealisasiForAnggaran(
  realisasiRows: Record<string, string>[],
  idAnggaran: string
): number {
  return realisasiRows
    .filter(
      (row) =>
        String(row['ID ANGGARAN'] || '').trim() ===
        String(idAnggaran).trim()
    )
    .reduce((total, row) => {
      return total + toNumber(row['NILAI REALISASI']);
    }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// HITUNG REALISASI DETAIL
// ─────────────────────────────────────────────────────────────────────────────

function getTotalRealisasiForDetail(
  realisasiRows: Record<string, string>[],
  idDetail: string
): number {
  return realisasiRows
    .filter(
      (row) =>
        String(row['ID DETAIL'] || '').trim() ===
        String(idDetail).trim()
    )
    .reduce((total, row) => {
      return total + toNumber(row['NILAI REALISASI']);
    }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ────────────────────────────────────────────────────────────────────────
    // DAFTAR SHEET
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'sheets') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      return NextResponse.json(MANAGED_SHEETS);
    }

    // ────────────────────────────────────────────────────────────────────────
    // VERIFY PASSWORD
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'verify') {
      const password =
        getPasswordFromRequest(req) ||
        url.searchParams.get('password') ||
        '';

      const valid = await verifyAdminPassword(password);

      return NextResponse.json({ valid });
    }

    // ────────────────────────────────────────────────────────────────────────
    // AMBIL KOMPONEN DARI MASTER KOMPONEN
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'komponen') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const bidang = url.searchParams.get('bidang') || '';
      const jenis = url.searchParams.get('jenis') || '';

      const master = await getSheetRows('MASTER KOMPONEN');

      const komponen = master.rows
        .filter(
          (row) =>
            String(row['BIDANG'] || '').toUpperCase() ===
              bidang.toUpperCase() &&
            String(row['JENIS'] || '').toUpperCase() ===
              jenis.toUpperCase()
        )
        .map((row) => row['KOMPONEN'])
        .filter(Boolean);

      return NextResponse.json({ komponen });
    }

    // ────────────────────────────────────────────────────────────────────────
    // SUMMARY ANGGARAN
    //
    // Menghasilkan:
    // TOTAL PAGU
    // TOTAL REALISASI
    // SISA PAGU
    // PERSENTASE REALISASI
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'anggaran-summary') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const idAnggaran = url.searchParams.get('idAnggaran');

      if (!idAnggaran) {
        return NextResponse.json(
          { error: 'Parameter idAnggaran wajib diisi.' },
          { status: 400 }
        );
      }

      const anggaranData = await getSheetRows('ANGGARAN');
      const realisasiData = await getSheetRows('REALISASI');

      const anggaran = anggaranData.rows.find(
        (row) =>
          String(row['ID ANGGARAN'] || '').trim() ===
          String(idAnggaran).trim()
      );

      if (!anggaran) {
        return NextResponse.json(
          { error: 'Anggaran tidak ditemukan.' },
          { status: 404 }
        );
      }

      const totalPagu = toNumber(anggaran['TOTAL PAGU']);

      const totalRealisasi = getTotalRealisasiForAnggaran(
        realisasiData.rows,
        idAnggaran
      );

      const sisaPagu = totalPagu - totalRealisasi;

      const persentase =
        totalPagu > 0
          ? (totalRealisasi / totalPagu) * 100
          : 0;

      return NextResponse.json({
        success: true,
        idAnggaran,
        totalPagu,
        totalRealisasi,
        sisaPagu,
        persentaseRealisasi: Number(persentase.toFixed(2)),
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // SUMMARY SEMUA ANGGARAN
    //
    // Dipakai dashboard / tabel ANGGARAN.
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'anggaran-summary-all') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const anggaranData = await getSheetRows('ANGGARAN');
      const realisasiData = await getSheetRows('REALISASI');

      const summary = anggaranData.rows.map((anggaran) => {
        const idAnggaran = String(
          anggaran['ID ANGGARAN'] || ''
        ).trim();

        const totalPagu = toNumber(
          anggaran['TOTAL PAGU']
        );

        const totalRealisasi =
          getTotalRealisasiForAnggaran(
            realisasiData.rows,
            idAnggaran
          );

        const sisaPagu = totalPagu - totalRealisasi;

        const persentase =
          totalPagu > 0
            ? (totalRealisasi / totalPagu) * 100
            : 0;

        return {
          'ID ANGGARAN': idAnggaran,
          'TOTAL PAGU': totalPagu,
          'TOTAL REALISASI': totalRealisasi,
          'SISA PAGU': sisaPagu,
          'PERSENTASE REALISASI': Number(
            persentase.toFixed(2)
          ),
        };
      });

      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    if (action === 'sync-anggaran-perbidang') {
      const check = await requireAdmin(req);
      if (!check.ok) return check.response;
      const result = await syncAnggaranPerbidang();
      return NextResponse.json({ success: true, ...result });
    }

    // ────────────────────────────────────────────────────────────────────────
    // DETAIL ANGGARAN + REALISASI
    //
    // Dipakai untuk melihat kondisi setiap komponen.
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'detail-summary') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const idAnggaran =
        url.searchParams.get('idAnggaran') || '';

      if (!idAnggaran) {
        return NextResponse.json(
          { error: 'Parameter idAnggaran wajib diisi.' },
          { status: 400 }
        );
      }

      const detailData =
        await getSheetRows('DETAIL ANGGARAN');

      const realisasiData =
        await getSheetRows('REALISASI');

      const details = detailData.rows
        .filter(
          (row) =>
            String(row['ID ANGGARAN'] || '').trim() ===
            idAnggaran.trim()
        )
        .map((row) => {
          const idDetail =
            String(row['ID DETAIL'] || '').trim();

          const paguKomponen = toNumber(
            row['PAGU KOMPONEN']
          );

          const totalRealisasi =
            getTotalRealisasiForDetail(
              realisasiData.rows,
              idDetail
            );

          const sisaPagu =
            paguKomponen - totalRealisasi;

          return {
            ...row,
            'PAGU KOMPONEN': paguKomponen,
            'TOTAL REALISASI': totalRealisasi,
            'SISA PAGU': sisaPagu,
          };
        });

      return NextResponse.json({
        success: true,
        data: details,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // DEFAULT GET SHEET
    // ────────────────────────────────────────────────────────────────────────

    const sheet = url.searchParams.get('sheet');

    if (!sheet) {
      return NextResponse.json(
        { error: 'Parameter sheet wajib diisi.' },
        { status: 400 }
      );
    }

    const check = await requireAdmin(req);

    if (!check.ok) return check.response;

    if (sheet === 'ANGGARAN PERBIDANG') {
      return NextResponse.json(
        await getComputedAnggaranPerbidang(url.searchParams.get('tahun') || undefined)
      );
    }

    const data = await getSheetRows(sheet);

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error('Admin GET error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { action } = body;

    // ────────────────────────────────────────────────────────────────────────
    // LOGIN
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'login') {
      const { password } = body;

      if (!password) {
        return NextResponse.json(
          { error: 'Password wajib diisi.' },
          { status: 400 }
        );
      }

      const valid =
        await verifyAdminPassword(password);

      if (!valid) {
        return NextResponse.json(
          { error: 'Password salah.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Login berhasil.',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // GANTI PASSWORD
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'change-password') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const {
        currentPassword,
        newPassword,
      } = body;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          {
            error:
              'Password lama dan baru wajib diisi.',
          },
          { status: 400 }
        );
      }

      const valid =
        await verifyAdminPassword(
          currentPassword
        );

      if (!valid) {
        return NextResponse.json(
          { error: 'Password lama salah.' },
          { status: 401 }
        );
      }

      await setAdminPassword(newPassword);

      return NextResponse.json({
        success: true,
        message: 'Password berhasil diubah.',
      });
    }

    if (action === 'sync-anggaran-perbidang') {
      const check = await requireAdmin(req);
      if (!check.ok) return check.response;
      const result = await syncAnggaranPerbidang();
      return NextResponse.json({ success: true, ...result });
    }

    // ────────────────────────────────────────────────────────────────────────
    // APPEND GENERIC
    //
    // Untuk sheet umum.
    //
    // REALISASI JANGAN menggunakan action ini.
    // Gunakan append-realisasi agar validasi pagu berjalan.
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'append') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const { sheet, data } = body;

      if (
        !sheet ||
        !data ||
        typeof data !== 'object'
      ) {
        return NextResponse.json(
          {
            error:
              'sheet dan data wajib diisi.',
          },
          { status: 400 }
        );
      }

      if (sheet === 'DOKUMEN') {
        const sheetData = await getSheetRows('DOKUMEN');
        const titleHeader = findHeader(sheetData.headers, 'Judul', 'JUDUL') || 'Judul';
        const typeHeader = findHeader(sheetData.headers, 'Tipe', 'TIPE') || 'Tipe';
        const linkHeader = findHeader(sheetData.headers, 'Link', 'LINK', 'URL') || 'Link';
        const numberHeader = findHeader(sheetData.headers, 'No', 'NOMOR', 'NO');
        if (!String(data[titleHeader] || '').trim() || !String(data[typeHeader] || '').trim()) {
          return NextResponse.json({ error: 'Judul dan tipe dokumen wajib diisi.' }, { status: 400 });
        }
        if (!String(data[linkHeader] || '').trim()) {
          return NextResponse.json({ error: 'Upload dokumen terlebih dahulu sebelum menyimpan.' }, { status: 400 });
        }
        const nextNumber = sheetData.rows.reduce((max, row) => {
          const value = Number(String(numberHeader ? row[numberHeader] : '').replace(/[^0-9]/g, ''));
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, 0) + 1;
        const documentData = {
          [titleHeader]: String(data[titleHeader]).trim(),
          [typeHeader]: String(data[typeHeader]).trim(),
          [linkHeader]: String(data[linkHeader]).trim(),
          ...(numberHeader ? { [numberHeader]: String(nextNumber) } : {}),
        };
        await appendSheetRow(sheet, documentData);
        return NextResponse.json({ success: true, message: 'Dokumen berhasil ditambahkan.', number: nextNumber });
      }

      await appendSheetRow(sheet, data);

      return NextResponse.json({
        success: true,
        message: 'Data berhasil ditambahkan.',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // APPEND ANGGARAN + DETAIL ANGGARAN
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'replace-sheet') {
      const check = await requireAdmin(req);
      if (!check.ok) return check.response;

      const sheetName = String(body.sheet || '').trim();
      const headers = body.headers as string[];
      const rows = body.rows as Record<string, string>[];
      const valuesByIndex = body.valuesByIndex as string[][] | undefined;

      if (!sheetName || !Array.isArray(headers) || headers.length === 0) {
        return NextResponse.json(
          { error: 'Parameter sheet dan headers wajib diisi.' },
          { status: 400 }
        );
      }

      await replaceSheetData(
        sheetName,
        headers,
        Array.isArray(rows) ? rows : [],
        Array.isArray(valuesByIndex) ? valuesByIndex : undefined
      );
      return NextResponse.json({
        success: true,
        message: `Sheet ${sheetName} diperbarui (${(valuesByIndex || rows || []).length} baris data) sesuai kolom A–T.`,
      });
    }

    if (action === 'append-anggaran') {

      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const {
        tahun,
        bidang,
        jenis,
        namaKegiatan,
        anggaranPerPelaksanaan,
        jumlahPelaksanaan,
        komponen,
      } = body;

      if (
        !tahun ||
        !bidang ||
        !jenis ||
        !namaKegiatan ||
        !anggaranPerPelaksanaan ||
        !jumlahPelaksanaan
      ) {
        return NextResponse.json(
          {
            error:
              'Semua field anggaran wajib diisi.',
          },
          { status: 400 }
        );
      }

      if (
        !Array.isArray(komponen) ||
        komponen.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              'Minimal satu komponen harus dipilih.',
          },
          { status: 400 }
        );
      }

      const anggaran =
        Number(anggaranPerPelaksanaan);

      const jumlah =
        Number(jumlahPelaksanaan);

      if (
        Number.isNaN(anggaran) ||
        Number.isNaN(jumlah) ||
        anggaran <= 0 ||
        jumlah <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'Anggaran dan jumlah pelaksanaan harus angka positif.',
          },
          { status: 400 }
        );
      }

      const totalPagu =
        anggaran * jumlah;

      // ────────────────────────────────────────────────────────────────────
      // 1. GENERATE ID ANGGARAN
      // ────────────────────────────────────────────────────────────────────

      const idAnggaran =
        await generateId(
          'ANG',
          'ANGGARAN',
          String(tahun)
        );

      // ────────────────────────────────────────────────────────────────────
      // 2. SIMPAN ANGGARAN
      // ────────────────────────────────────────────────────────────────────

      await appendSheetRow(
        'ANGGARAN',
        {
          'ID ANGGARAN': idAnggaran,
          TAHUN: String(tahun),
          BIDANG: bidang,
          JENIS: jenis,
          'NAMA KEGIATAN': namaKegiatan,
          'ANGGARAN/PELAKSANAAN':
            formatNumber(anggaran),
          'JUMLAH PELAKSANAAN':
            formatNumber(jumlah),
          'TOTAL PAGU':
            formatNumber(totalPagu),
        }
      );

      // ────────────────────────────────────────────────────────────────────
      // 3. BACA DETAIL SEKALI
      //
      // Jangan generateId berulang-ulang karena akan berkali-kali membaca
      // Google Sheet.
      // ────────────────────────────────────────────────────────────────────

      const existingDetail =
        await getSheetRows(
          'DETAIL ANGGARAN'
        );

      const pattern =
        new RegExp(
          `^DET-${String(tahun)}-(\\d+)$`
        );

      let maxDetail = 0;

      for (const row of existingDetail.rows) {
        const id = String(
          row['ID DETAIL'] || ''
        );

        const match =
          id.match(pattern);

        if (match) {
          const number =
            parseInt(match[1], 10);

          if (number > maxDetail) {
            maxDetail = number;
          }
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // 4. LOOP PELAKSANAAN × KOMPONEN
      // ────────────────────────────────────────────────────────────────────

      let detailCounter =
        maxDetail + 1;

      for (
        let p = 1;
        p <= jumlah;
        p++
      ) {
        for (
          const komp of komponen
        ) {
          const idDetail =
            `DET-${String(tahun)}-${String(
              detailCounter
            ).padStart(4, '0')}`;

          detailCounter++;

          await appendSheetRow(
            'DETAIL ANGGARAN',
            {
              'ID DETAIL': idDetail,
              'ID ANGGARAN':
                idAnggaran,
              TAHUN: String(tahun),
              BIDANG: bidang,
              JENIS: jenis,
              KEGIATAN:
                namaKegiatan,
              PELAKSANAAN:
                `${namaKegiatan} ${toRomawi(p)}`,
              KOMPONEN: komp,
              'PAGU KOMPONEN': '',
            }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message:
          `Anggaran ${idAnggaran} berhasil disimpan beserta ${
            jumlah * komponen.length
          } baris detail.`,
        idAnggaran,
        totalPagu,
        jumlahDetail:
          jumlah * komponen.length,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // UPDATE PAGU KOMPONEN
    //
    // Admin mengisi PAGU KOMPONEN pada DETAIL ANGGARAN.
    //
    // Validasi:
    // total seluruh PAGU KOMPONEN dalam ID ANGGARAN
    // tidak boleh melebihi TOTAL PAGU.
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'update-pagu-detail') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const {
        idDetail,
        paguKomponen,
      } = body;

      if (!idDetail) {
        return NextResponse.json(
          {
            error:
              'ID DETAIL wajib diisi.',
          },
          { status: 400 }
        );
      }

      const nilaiPagu =
        toNumber(paguKomponen);

      if (nilaiPagu < 0) {
        return NextResponse.json(
          {
            error:
              'Pagu komponen tidak boleh negatif.',
          },
          { status: 400 }
        );
      }

      // Ambil detail
      const detailData =
        await getSheetRows(
          'DETAIL ANGGARAN'
        );

      const detailIndex =
        detailData.rows.findIndex(
          (row) =>
            String(
              row['ID DETAIL'] || ''
            ).trim() ===
            String(idDetail).trim()
        );

      if (detailIndex === -1) {
        return NextResponse.json(
          {
            error:
              'Detail anggaran tidak ditemukan.',
          },
          { status: 404 }
        );
      }

      const detail =
        detailData.rows[detailIndex];

      const idAnggaran =
        String(
          detail['ID ANGGARAN'] || ''
        ).trim();

      if (!idAnggaran) {
        return NextResponse.json(
          {
            error:
              'ID ANGGARAN pada detail tidak ditemukan.',
          },
          { status: 400 }
        );
      }

      // Ambil anggaran induk
      const anggaranData =
        await getSheetRows(
          'ANGGARAN'
        );

      const anggaran =
        anggaranData.rows.find(
          (row) =>
            String(
              row['ID ANGGARAN'] || ''
            ).trim() ===
            idAnggaran
        );

      if (!anggaran) {
        return NextResponse.json(
          {
            error:
              'Anggaran induk tidak ditemukan.',
          },
          { status: 404 }
        );
      }

      const totalPagu =
        toNumber(
          anggaran['TOTAL PAGU']
        );

      // ────────────────────────────────────────────────────────────────────
      // HITUNG TOTAL PAGU KOMPONEN LAIN
      // ────────────────────────────────────────────────────────────────────

      let totalPaguDetailLain = 0;

      for (
        const row of detailData.rows
      ) {
        if (
          String(
            row['ID ANGGARAN'] || ''
          ).trim() !== idAnggaran
        ) {
          continue;
        }

        if (
          String(
            row['ID DETAIL'] || ''
          ).trim() ===
          String(idDetail).trim()
        ) {
          continue;
        }

        totalPaguDetailLain +=
          toNumber(
            row['PAGU KOMPONEN']
          );
      }

      const totalSetelahUpdate =
        totalPaguDetailLain +
        nilaiPagu;
      const paguSebelumnya = toNumber(detail['PAGU KOMPONEN']);

      // Tidak boleh lebih dari TOTAL PAGU
      if (
        totalSetelahUpdate > totalPagu &&
        nilaiPagu !== paguSebelumnya
      ) {
        const sisaUntukDetail =
          totalPagu -
          totalPaguDetailLain;

        return NextResponse.json(
          {
            error:
              'Pagu komponen melebihi total pagu anggaran.',
            totalPagu,
            totalPaguDetailLain,
            paguDiminta: nilaiPagu,
            maksimalPaguDetail:
              Math.max(
                0,
                sisaUntukDetail
              ),
          },
          { status: 400 }
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // UPDATE HANYA PAGU KOMPONEN
      // ────────────────────────────────────────────────────────────────────

      const ok =
        await updateSheetRow(
          'DETAIL ANGGARAN',
          String(detail.id),
          {
            'PAGU KOMPONEN':
              formatNumber(
                nilaiPagu
              ),
          }
        );

      if (!ok) {
        return NextResponse.json(
          {
            error:
              'Gagal memperbarui pagu komponen.',
          },
          { status: 500 }
        );
      }

      const totalPaguKomponen =
        totalSetelahUpdate;

      const sisaPaguKomponen =
        totalPagu -
        totalPaguKomponen;

      return NextResponse.json({
        success: true,
        message:
          'Pagu komponen berhasil diperbarui.',
        idDetail,
        idAnggaran,
        paguKomponen:
          nilaiPagu,
        totalPagu,
        totalPaguKomponen,
        sisaPaguKomponen,
        status:
          totalPaguKomponen ===
          totalPagu
            ? 'SESUAI'
            : 'BELUM SESUAI',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // APPEND REALISASI
    //
    // INI YANG MENGAMANKAN REALISASI.
    //
    // 1. Cari detail.
    // 2. Ambil PAGU KOMPONEN.
    // 3. Hitung realisasi sebelumnya.
    // 4. Hitung sisa.
    // 5. Tolak jika realisasi baru > sisa.
    // 6. Generate ID REALISASI.
    // 7. Simpan.
    // ────────────────────────────────────────────────────────────────────────

    if (action === 'append-realisasi') {
      const check = await requireAdmin(req);

      if (!check.ok) return check.response;

      const {
        tahun,
        bulan,
        idAnggaran,
        idDetail,
        nilaiRealisasi,
      } = body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDASI INPUT
      // ────────────────────────────────────────────────────────────────────

      if (
        !tahun ||
        !bulan ||
        !idAnggaran ||
        !idDetail ||
        nilaiRealisasi === undefined ||
        nilaiRealisasi === null ||
        nilaiRealisasi === ''
      ) {
        return NextResponse.json(
          {
            error:
              'Tahun, bulan, ID anggaran, ID detail, dan nilai realisasi wajib diisi.',
          },
          { status: 400 }
        );
      }

      const nilai =
        toNumber(nilaiRealisasi);

      if (
        !Number.isFinite(nilai) ||
        nilai <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'Nilai realisasi harus lebih besar dari 0.',
          },
          { status: 400 }
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // AMBIL DETAIL
      // ────────────────────────────────────────────────────────────────────

      const detailData =
        await getSheetRows(
          'DETAIL ANGGARAN'
        );

      const detail =
        detailData.rows.find(
          (row) =>
            String(
              row['ID DETAIL'] || ''
            ).trim() ===
              String(idDetail).trim() &&
            String(
              row['ID ANGGARAN'] || ''
            ).trim() ===
              String(idAnggaran).trim()
        );

      if (!detail) {
        return NextResponse.json(
          {
            error:
              'Detail anggaran tidak ditemukan atau tidak sesuai dengan anggaran.',
          },
          { status: 404 }
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // PAGU KOMPONEN
      // ────────────────────────────────────────────────────────────────────

      const paguKomponen =
        toNumber(
          detail['PAGU KOMPONEN']
        );

      if (paguKomponen <= 0) {
        return NextResponse.json(
          {
            error:
              'PAGU KOMPONEN untuk detail ini belum diisi. Isi pagu komponen terlebih dahulu.',
            idDetail,
          },
          { status: 400 }
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // AMBIL REALISASI LAMA
      // ────────────────────────────────────────────────────────────────────

      const realisasiData =
        await getSheetRows(
          'REALISASI'
        );

      const realisasiSebelumnya =
        getTotalRealisasiForDetail(
          realisasiData.rows,
          String(idDetail)
        );

      const sisaPagu =
        paguKomponen -
        realisasiSebelumnya;

      // ────────────────────────────────────────────────────────────────────
      // CEK REALISASI BARU
      // ────────────────────────────────────────────────────────────────────

      if (nilai > sisaPagu) {
        return NextResponse.json(
          {
            error:
              'Nilai realisasi melebihi sisa pagu komponen.',
            paguKomponen,
            realisasiSebelumnya,
            sisaPagu,
            realisasiDiminta:
              nilai,
            kekurangan:
              nilai - sisaPagu,
          },
          { status: 400 }
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // GENERATE ID REALISASI
      // ────────────────────────────────────────────────────────────────────

      const idRealisasi =
        await generateId(
          'REL',
          'REALISASI',
          String(tahun)
        );

      // ────────────────────────────────────────────────────────────────────
      // SIMPAN REALISASI
      // ────────────────────────────────────────────────────────────────────

      await appendSheetRow(
        'REALISASI',
        {
          'ID REALISASI':
            idRealisasi,
          'ID ANGGARAN':
            String(idAnggaran),
          'ID DETAIL':
            String(idDetail),
          TAHUN:
            String(tahun),
          BULAN:
            String(bulan),
          BIDANG:
            String(
              detail['BIDANG'] || ''
            ),
          JENIS:
            String(
              detail['JENIS'] || ''
            ),
          KEGIATAN:
            String(
              detail['KEGIATAN'] || ''
            ),
          PELAKSANAAN:
            String(
              detail['PELAKSANAAN'] ||
                ''
            ),
          KOMPONEN:
            String(
              detail['KOMPONEN'] || ''
            ),
          'NILAI REALISASI':
            formatNumber(nilai),
        }
      );

      const totalRealisasiBaru =
        realisasiSebelumnya +
        nilai;

      const sisaPaguBaru =
        paguKomponen -
        totalRealisasiBaru;

      return NextResponse.json({
        success: true,
        message:
          'Realisasi berhasil disimpan.',
        idRealisasi,
        idAnggaran,
        idDetail,
        paguKomponen,
        realisasiSebelumnya,
        realisasiBaru:
          nilai,
        totalRealisasi:
          totalRealisasiBaru,
        sisaPagu:
          sisaPaguBaru,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION TIDAK DIKENAL
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      {
        error:
          'Action tidak dikenal.',
      },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      'Admin POST error:',
      message
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(req: Request) {
  try {
    const check = await requireAdmin(req);

    if (!check.ok) return check.response;

    const body = await req.json();

    const {
      sheet,
      id,
      data,
    } = body;

    if (
      !sheet ||
      !id ||
      !data
    ) {
      return NextResponse.json(
        {
          error:
            'sheet, id, dan data wajib diisi.',
        },
        { status: 400 }
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // JIKA UPDATE DETAIL ANGGARAN DENGAN PAGU KOMPONEN
    //
    // Arahkan ke validasi khusus.
    // ────────────────────────────────────────────────────────────────────────

    if (
      sheet === 'DETAIL ANGGARAN' &&
      Object.prototype.hasOwnProperty.call(
        data,
        'PAGU KOMPONEN'
      )
    ) {
      const idDetail =
        String(id);

      const paguKomponen =
        data['PAGU KOMPONEN'];

      // Ambil detail
      const detailData =
        await getSheetRows(
          'DETAIL ANGGARAN'
        );

      const detail =
        detailData.rows.find(
          (row) =>
            String(row['ID DETAIL'] || '').trim() === idDetail.trim() ||
            String(row.id || '').trim() === idDetail.trim()
        );

      if (!detail) {
        return NextResponse.json(
          {
            error:
              'Detail anggaran tidak ditemukan.',
          },
          { status: 404 }
        );
      }

      const idAnggaran =
        String(
          detail['ID ANGGARAN'] || ''
        ).trim();

      const nilaiPagu =
        toNumber(
          paguKomponen
        );

      if (nilaiPagu < 0) {
        return NextResponse.json(
          {
            error:
              'Pagu komponen tidak boleh negatif.',
          },
          { status: 400 }
        );
      }

      // Ambil anggaran
      const anggaranData =
        await getSheetRows(
          'ANGGARAN'
        );

      const anggaran =
        anggaranData.rows.find(
          (row) =>
            String(
              row['ID ANGGARAN'] || ''
            ).trim() ===
            idAnggaran
        );

      if (!anggaran) {
        return NextResponse.json(
          {
            error:
              'Anggaran induk tidak ditemukan.',
          },
          { status: 404 }
        );
      }

      const totalPagu =
        toNumber(
          anggaran['TOTAL PAGU']
        );

      // Hitung detail lain
      let totalDetailLain = 0;

      for (
        const row of detailData.rows
      ) {
        if (
          String(
            row['ID ANGGARAN'] || ''
          ).trim() !==
          idAnggaran
        ) {
          continue;
        }

        if (
          String(
            row['ID DETAIL'] || ''
          ).trim() ===
          idDetail
        ) {
          continue;
        }

        totalDetailLain +=
          toNumber(
            row['PAGU KOMPONEN']
          );
      }

      const totalSetelahUpdate =
        totalDetailLain +
        nilaiPagu;
      const paguSebelumnya = toNumber(detail['PAGU KOMPONEN']);

      if (
        totalSetelahUpdate > totalPagu &&
        nilaiPagu !== paguSebelumnya
      ) {
        return NextResponse.json(
          {
            error:
              'Total PAGU KOMPONEN melebihi TOTAL PAGU anggaran.',
            totalPagu,
            totalPaguKomponen:
              totalSetelahUpdate,
            sisaYangTersedia:
              Math.max(
                0,
                totalPagu -
                  totalDetailLain
              ),
          },
          { status: 400 }
        );
      }

      const ok =
        await updateSheetRow(
          sheet,
          String(detail.id),
          {
            'PAGU KOMPONEN':
              formatNumber(
                nilaiPagu
              ),
          }
        );

      if (!ok) {
        return NextResponse.json(
          {
            error:
              'Baris tidak ditemukan.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          'Pagu komponen berhasil diperbarui.',
        totalPagu,
        totalPaguKomponen:
          totalSetelahUpdate,
        sisaPaguKomponen:
          totalPagu -
          totalSetelahUpdate,
        status:
          totalSetelahUpdate ===
          totalPagu
            ? 'SESUAI'
            : 'BELUM SESUAI',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // UPDATE GENERIC
    // ────────────────────────────────────────────────────────────────────────

    const ok =
      await updateSheetRow(
        sheet,
        String(id),
        data
      );

    if (!ok) {
      return NextResponse.json(
        {
          error:
            'Baris tidak ditemukan.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Data berhasil diperbarui.',
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      'Admin PUT error:',
      message
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    const check = await requireAdmin(req);

    if (!check.ok) return check.response;

    const url = new URL(req.url);

    const sheet =
      url.searchParams.get(
        'sheet'
      );

    const id =
      url.searchParams.get(
        'id'
      );

    if (!sheet || !id) {
      return NextResponse.json(
        {
          error:
            'Parameter sheet dan id wajib diisi.',
        },
        { status: 400 }
      );
    }

    const ok =
      await deleteSheetRow(
        sheet,
        id
      );

    if (!ok) {
      return NextResponse.json(
        {
          error:
            'Baris tidak ditemukan.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Data berhasil dihapus.',
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      'Admin DELETE error:',
      message
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROMAWI
// ─────────────────────────────────────────────────────────────────────────────

function toRomawi(
  n: number
): string {
  const map: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';

  for (
    const [value, numeral] of map
  ) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }

  return result;
}