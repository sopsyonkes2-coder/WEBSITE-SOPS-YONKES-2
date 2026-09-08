'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Key,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  X,
  Lock,
  Loader2,
  Database,
  Settings,
  Shield,
  FileUp,
  ChevronDown,
  ReceiptText,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MANAGED_SHEETS } from '@/lib/managedSheets';
import {
  uploadToDrive,
  getUploadedFileUrl,
  getDrivePreviewUrl,
  deleteFromDrive,
  extractDriveFileId,
  type UploadJenis,
} from '@/lib/driveUpload';

// ─────────────────────────────────────────────────────────────────────────────
// KONSTANTA
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_STORAGE_KEY = 'yonkes-admin-authenticated';
const ADMIN_PASSWORD_KEY = 'yonkes-admin-password';

const BULAN_OPTIONS = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
];

const DOCUMENT_TYPE_OPTIONS = [
  'BUJUK',
  'DOKTRIN',
  'PROTAP',
  'Lain-lain',
];

const ORGANIZATION_TOTAL_HEADERS = new Set(['TOP', 'NYATA', 'KURANG']);

const DEFAULT_HEADERS: Record<string, string[]> = {
  ULASAN: ['NAMA', 'JABATAN', 'ULASAN'],

  DOKUMEN: ['No', 'Judul', 'Tipe', 'Link'],

  GALERI: ['URL FOTO', 'JUDUL', 'DESKRIPSI'],

  ANGGARAN: [
    'ID ANGGARAN',
    'TAHUN',
    'BIDANG',
    'JENIS',
    'NAMA KEGIATAN',
    'ANGGARAN/PELAKSANAAN',
    'JUMLAH PELAKSANAAN',
    'TOTAL PAGU',
  ],

  'DETAIL ANGGARAN': [
    'ID DETAIL',
    'ID ANGGARAN',
    'TAHUN',
    'BIDANG',
    'JENIS',
    'KEGIATAN',
    'PELAKSANAAN',
    'KOMPONEN',
    'PAGU KOMPONEN',
  ],

  REALISASI: [
    'ID REALISASI',
    'ID ANGGARAN',
    'ID DETAIL',
    'TAHUN',
    'BULAN',
    'BIDANG',
    'JENIS',
    'KEGIATAN',
    'PELAKSANAAN',
    'KOMPONEN',
    'NILAI REALISASI',
  ],

  'ANGGARAN PERBIDANG': [
    'BIDANG',
    'TOTAL PAGU',
    'TOTAL REALISASI',
    'TAHUN',
  ],

  'MASTER KOMPONEN': [
    'ID',
    'BIDANG',
    'JENIS',
    'KOMPONEN',
  ],

  PROFIL: ['Tugas Pokok'],

  'SEJARAH SATUAN': [
    'Dasar Pembentukan',
    'Isi Sejarah',
    'Pejabat Danyonkes',
    'Masa Jabatan',
  ],

  ORGANISASI: ['TOP', 'NYATA', 'KURANG'],

  'KET PERS': ['Kategori', 'TOP', 'NYATA', 'KURANG'],

  'JADWAL MINGGUAN': [
    'Hari',
    'Jam',
    'Kegiatan',
    'Tempat',
  ],

  'KALENDER LATIHAN': [
    'Tanggal Mulai',
    'Tanggal Selesai',
    'Kegiatan',
    'Tempat',
  ],

  'KALENDER LIBUR NASIONAL': [
    'Tanggal',
    'Kegiatan',
  ],

  KONTAK: [
    'Telepon',
    'Email',
    'WA',
    'Alamat',
    'Maps',
  ],

  SETTINGS: ['KEY', 'VALUE'],
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPE
// ─────────────────────────────────────────────────────────────────────────────

type SheetData = {
  headers: string[];
  rows: Record<string, string>[];
  years?: string[];
};

type AngForm = {
  tahun: string;
  bidang: string;
  jenis: string;
  namaKegiatan: string;
  anggaranPerPelaksanaan: string;
  jumlahPelaksanaan: string;
};

type RelForm = {
  tahun: string;
  bulan: string;
  idAnggaran: string;
  idDetail: string;
  nilaiRealisasi: string;
};

type DetailRow = {
  id?: string;
  'ID DETAIL': string;
  'ID ANGGARAN': string;
  TAHUN: string;
  BIDANG: string;
  JENIS: string;
  KEGIATAN: string;
  PELAKSANAAN: string;
  KOMPONEN: string;
  'PAGU KOMPONEN': string;
};

type RealisasiRow = {
  id?: string;
  'ID REALISASI'?: string;
  'ID ANGGARAN': string;
  'ID DETAIL': string;
  'NILAI REALISASI': string;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

function toNumber(value: string | number | undefined | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) return 0;

  const cleaned = String(value).replace(/[^\d]/g, '');

  return Number(cleaned) || 0;
}

function formatRupiah(value: string | number): string {
  const num = toNumber(value);

  if (!num) return '';

  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatRupiahZero(value: string | number): string {
  const num = toNumber(value);

  return 'Rp ' + num.toLocaleString('id-ID');
}

function getRealizationTotal(
  rows: RealisasiRow[],
  idAnggaran: string
): number {
  return rows
    .filter((r) => r['ID ANGGARAN'] === idAnggaran)
    .reduce(
      (total, r) => total + toNumber(r['NILAI REALISASI']),
      0
    );
}

function getDetailBudgetTotal(
  rows: DetailRow[],
  idAnggaran: string
): number {
  return rows
    .filter((r) => r['ID ANGGARAN'] === idAnggaran)
    .reduce(
      (total, r) => total + toNumber(r['PAGU KOMPONEN']),
      0
    );
}

function getDetailRealizationTotal(
  rows: RealisasiRow[],
  idDetail: string
): number {
  return rows
    .filter((r) => r['ID DETAIL'] === idDetail)
    .reduce(
      (total, r) => total + toNumber(r['NILAI REALISASI']),
      0
    );
}

  async function readApiResponse(response: Response): Promise<Record<string, any>> {
    const text = await response.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: text.slice(0, 300) };
    }
  }

// ─────────────────────────────────────────────────────────────────────────────
// SHEET TABS
// ─────────────────────────────────────────────────────────────────────────────

function SheetTabs({
  activeSheet,
  onSelect,
}: {
  activeSheet: string;
  onSelect: (id: string) => void;
}) {
  const groups: { label: string; ids: string[] }[] = [
    {
      label: 'Anggaran',
      ids: [
        'ANGGARAN',
        'DETAIL ANGGARAN',
        'REALISASI',
        'ANGGARAN PERBIDANG',
        'MASTER KOMPONEN',
      ],
    },
    {
      label: 'Konten',
      ids: [
        'ULASAN',
        'DOKUMEN',
        'GALERI',
        'PROFIL',
        'SEJARAH SATUAN',
        'KONTAK',
      ],
    },
    {
      label: 'Personel & Jadwal',
      ids: [
        'ORGANISASI',
        'KET PERS',
        'JADWAL MINGGUAN',
        'KALENDER LATIHAN',
        'KALENDER LIBUR NASIONAL',
      ],
    },
  ];

  return (
    <div className="space-y-3 mb-6">
      {groups.map((g) => {
        const sheets = MANAGED_SHEETS.filter(
          (s) =>
            g.ids.includes(s.id) &&
            s.id !== 'SETTINGS'
        );

        if (sheets.length === 0) return null;

        return (
          <div key={g.label}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-semibold mb-1.5 px-1">
              {g.label}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {sheets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    activeSheet === s.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────────

function ModalWrapper({
  title,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-950 z-10">
          <h3 className="font-bold text-white">
            {title}
          </h3>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  onCancel,
  onSave,
  saving,
  disabled,
  label,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10 sticky bottom-0 bg-slate-950">
      <Button
        variant="outline"
        onClick={onCancel}
        className="border-white/10 text-slate-300"
      >
        Batal
      </Button>

      <Button
        onClick={onSave}
        disabled={saving || disabled}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}

        {label}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-semibold mb-1.5 block">
        {label}
      </label>

      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}

        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM ANGGARAN
// ─────────────────────────────────────────────────────────────────────────────

function FormAnggaran({
  onClose,
  getHeaders,
  onSuccess,
}: {
  onClose: () => void;
  getHeaders: () => Record<string, string>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<AngForm>({
    tahun: String(new Date().getFullYear()),
    bidang: '',
    jenis: '',
    namaKegiatan: '',
    anggaranPerPelaksanaan: '',
    jumlahPelaksanaan: '',
  });

  const [komponen, setKomponen] = useState<string[]>([]);
  const [masterRows, setMasterRows] = useState<Record<string, string>[]>([]);
  const [loadingKomp, setLoadingKomp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin?sheet=MASTER%20KOMPONEN', { headers: getHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memuat data master');
        setMasterRows(data.rows || []);
      })
      .catch((error) => toast.error(error.message || 'Gagal memuat data master'));
  }, [getHeaders]);

  const bidangOptions = Array.from(
    new Set(masterRows.map((row) => row.BIDANG).filter(Boolean))
  );
  const jenisOptions = Array.from(
    new Set(
      masterRows
        .filter((row) => row.BIDANG === form.bidang)
        .map((row) => row.JENIS)
        .filter(Boolean)
    )
  );

  const totalPagu =
    toNumber(form.anggaranPerPelaksanaan) *
    Number(form.jumlahPelaksanaan || 0);

  const fetchKomponen = useCallback(
    async (bidang: string, jenis: string) => {
      if (!bidang || !jenis) {
        setKomponen([]);
        return;
      }

      setLoadingKomp(true);

      try {
        const res = await fetch(
          `/api/admin?action=komponen&bidang=${encodeURIComponent(
            bidang
          )}&jenis=${encodeURIComponent(jenis)}`,
          {
            headers: getHeaders(),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json.error || 'Gagal memuat komponen'
          );
        }

        setKomponen(json.komponen || []);
} catch (err) {
  setKomponen([]);

  console.error('Gagal memuat komponen:', err);

  toast.error(
    err instanceof Error
      ? err.message
      : 'Gagal memuat komponen'
  );
} finally {
        setLoadingKomp(false);
      }
    },
    [getHeaders]
  );

  const handleSave = async () => {
    if (komponen.length === 0) {
      toast.error(
        'Komponen belum tersedia. Pastikan MASTER KOMPONEN sudah diisi.'
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'append-anggaran',
          tahun: form.tahun,
          bidang: form.bidang,
          jenis: form.jenis,
          namaKegiatan: form.namaKegiatan,
          anggaranPerPelaksanaan: toNumber(
            form.anggaranPerPelaksanaan
          ),
          jumlahPelaksanaan: Number(
            form.jumlahPelaksanaan
          ),
          komponen,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error);
      }

      toast.success(json.message);

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        (err as Error).message ||
          'Gagal menyimpan anggaran'
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !!form.bidang &&
    !!form.jenis &&
    !!form.namaKegiatan &&
    !!form.anggaranPerPelaksanaan &&
    Number(form.jumlahPelaksanaan) > 0 &&
    komponen.length > 0;

  return (
    <ModalWrapper
      title="Tambah Anggaran"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4">
        <Field label="Tahun">
          <TextInput
            value={form.tahun}
            onChange={(v) =>
              setForm({ ...form, tahun: v })
            }
            placeholder="Masukkan tahun pada Sheet"
          />
        </Field>

        <Field label="Bidang">
          <SelectInput
            value={form.bidang}
            placeholder="— Pilih Bidang —"
            onChange={(v) => {
              setForm({
                ...form,
                bidang: v,
                jenis: '',
              });

              setKomponen([]);
            }}
            options={bidangOptions}
          />
        </Field>

        {form.bidang && (
          <Field label="Jenis">
            <SelectInput
              value={form.jenis}
              placeholder="— Pilih Jenis —"
              onChange={(v) => {
                setForm({
                  ...form,
                  jenis: v,
                });

                fetchKomponen(
                  form.bidang,
                  v
                );
              }}
              options={jenisOptions}
            />
          </Field>
        )}

        <Field label="Nama Kegiatan">
          <TextInput
            value={form.namaKegiatan}
            onChange={(v) =>
              setForm({
                ...form,
                namaKegiatan: v,
              })
            }
            placeholder="Contoh: BINSAT"
          />
        </Field>

        <Field label="Anggaran / Pelaksanaan (Rp)">
          <input
            type="text"
            inputMode="numeric"
            value={
              form.anggaranPerPelaksanaan
                ? formatRupiah(
                    form.anggaranPerPelaksanaan
                  )
                : ''
            }
            onChange={(e) => {
              const raw =
                e.target.value.replace(
                  /\D/g,
                  ''
                );

              setForm({
                ...form,
                anggaranPerPelaksanaan:
                  raw,
              });
            }}
            placeholder="Rp 12.000.000"
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </Field>

        <Field label="Jumlah Pelaksanaan">
          <input
            type="number"
            min={1}
            max={24}
            value={form.jumlahPelaksanaan}
            onChange={(e) =>
              setForm({
                ...form,
                jumlahPelaksanaan:
                  e.target.value,
              })
            }
            placeholder="4"
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </Field>

        {totalPagu > 0 && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-0.5">
              Total Pagu
            </p>

            <p className="text-2xl font-black text-emerald-300">
              {formatRupiah(totalPagu)}
            </p>

            <p className="text-xs text-emerald-500/70 mt-0.5">
              {formatRupiah(
                form.anggaranPerPelaksanaan
              )}{' '}
              × {form.jumlahPelaksanaan}{' '}
              pelaksanaan
            </p>
          </div>
        )}

        {form.jenis && (
          <Field
            label={
              <>
                Komponen{' '}
                {loadingKomp && (
                  <Loader2 className="inline w-3 h-3 animate-spin ml-1" />
                )}
              </>
            }
          >
            {komponen.length === 0 &&
            !loadingKomp ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <p className="text-xs text-amber-400">
                  Belum ada komponen untuk{' '}
                  <strong>
                    {form.bidang}/
                    {form.jenis}
                  </strong>
                  .
                  Tambahkan dulu di sheet{' '}
                  <strong>
                    MASTER KOMPONEN
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {komponen.map((k) => (
                  <div
                    key={k}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />

                    <span className="text-sm text-slate-200">
                      {k}
                    </span>
                  </div>
                ))}

                <p className="text-[11px] text-slate-600 pt-1">
                  {komponen.length} komponen ×{' '}
                  {form.jumlahPelaksanaan ||
                    '?'}{' '}
                  pelaksanaan akan dibuat
                  otomatis.
                </p>
              </div>
            )}
          </Field>
        )}
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
        saving={saving}
        disabled={!canSave}
        label="Simpan Anggaran"
      />
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM REALISASI
// ─────────────────────────────────────────────────────────────────────────────

function FormRealisasi({
  onClose,
  getHeaders,
  onSuccess,
}: {
  onClose: () => void;
  getHeaders: () => Record<string, string>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<RelForm>({
    tahun: String(new Date().getFullYear()),
    bulan: '',
    idAnggaran: '',
    idDetail: '',
    nilaiRealisasi: '',
  });

  const [anggaranList, setAnggaranList] =
    useState<Record<string, string>[]>([]);

  const [detailList, setDetailList] =
    useState<DetailRow[]>([]);

  const [realisasiList, setRealisasiList] =
    useState<RealisasiRow[]>([]);

  const [loadingAng, setLoadingAng] =
    useState(false);

  const [loadingDetail, setLoadingDetail] =
    useState(false);

  const [loadingRel, setLoadingRel] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const filteredDetail =
    detailList.filter(
      (d) =>
        d['ID ANGGARAN'] ===
        form.idAnggaran
    );

  const selectedDetail =
    detailList.find(
      (d) =>
        d['ID DETAIL'] ===
        form.idDetail
    );

  const selectedAnggaran =
    anggaranList.find(
      (a) =>
        a['ID ANGGARAN'] ===
        form.idAnggaran
    );

  const paguKomponen = selectedDetail
    ? toNumber(
        selectedDetail['PAGU KOMPONEN']
      )
    : 0;

  const realisasiSebelumnya =
    selectedDetail
      ? getDetailRealizationTotal(
          realisasiList,
          selectedDetail['ID DETAIL']
        )
      : 0;

  const sisaPagu = Math.max(
    0,
    paguKomponen - realisasiSebelumnya
  );

  const nilaiInput = toNumber(
    form.nilaiRealisasi
  );

  const melebihiPagu =
    !!selectedDetail &&
    nilaiInput > sisaPagu;

  useEffect(() => {
    if (!form.tahun) return;

    setLoadingAng(true);

    fetch('/api/admin?sheet=ANGGARAN', {
      headers: getHeaders(),
    })
      .then(async (r) => {
        const d = await r.json();

        if (!r.ok) {
          throw new Error(
            d.error ||
              'Gagal memuat anggaran'
          );
        }

        return d;
      })
      .then((d: SheetData) => {
        setAnggaranList(
          d.rows?.filter(
            (r) =>
              r.TAHUN === form.tahun
          ) || []
        );

        setForm((f) => ({
          ...f,
          idAnggaran: '',
          idDetail: '',
        }));
      })
      .catch((err) => {
        toast.error(
          err.message ||
            'Gagal memuat data anggaran'
        );
      })
      .finally(() =>
        setLoadingAng(false)
      );
  }, [form.tahun, getHeaders]);

  useEffect(() => {
    if (!form.idAnggaran) {
      setDetailList([]);
      setRealisasiList([]);
      return;
    }

    setLoadingDetail(true);
    setLoadingRel(true);

    Promise.all([
      fetch(
        `/api/admin?sheet=${encodeURIComponent(
          'DETAIL ANGGARAN'
        )}`,
        {
          headers: getHeaders(),
        }
      ).then(async (r) => {
        const d = await r.json();

        if (!r.ok) {
          throw new Error(
            d.error ||
              'Gagal memuat detail'
          );
        }

        return d;
      }),

      fetch('/api/admin?sheet=REALISASI', {
        headers: getHeaders(),
      }).then(async (r) => {
        const d = await r.json();

        if (!r.ok) {
          throw new Error(
            d.error ||
              'Gagal memuat realisasi'
          );
        }

        return d;
      }),
    ])
      .then(
        ([detailData, realisasiData]) => {
          setDetailList(
            (detailData.rows ||
              []) as DetailRow[]
          );

          setRealisasiList(
            (realisasiData.rows ||
              []) as RealisasiRow[]
          );

          setForm((f) => ({
            ...f,
            idDetail: '',
          }));
        }
      )
      .catch((err) => {
        toast.error(
          err.message ||
            'Gagal memuat detail/realisasi'
        );
      })
      .finally(() => {
        setLoadingDetail(false);
        setLoadingRel(false);
      });
  }, [form.idAnggaran, getHeaders]);

  const handleSave = async () => {
    if (!selectedDetail || !selectedAnggaran) {
      toast.error(
        'Pilih kegiatan dan detail terlebih dahulu.'
      );
      return;
    }

    if (paguKomponen <= 0) {
      toast.error(
        'Pagu komponen belum diatur. Isi PAGU KOMPONEN terlebih dahulu di DETAIL ANGGARAN.'
      );
      return;
    }

    if (nilaiInput <= 0) {
      toast.error(
        'Nilai realisasi harus lebih dari 0.'
      );
      return;
    }

    if (nilaiInput > sisaPagu) {
      toast.error(
        `Realisasi melebihi sisa pagu. Maksimal ${formatRupiah(
          sisaPagu
        )}.`
      );
      return;
    }

    setSaving(true);

try {
  const res = await fetch(
    '/api/admin',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'append-realisasi',
        tahun: form.tahun,
        bulan: form.bulan,
        idAnggaran: form.idAnggaran,
        idDetail: form.idDetail,
        nilaiRealisasi: String(nilaiInput),
      }),
    }
  );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error);
      }

      toast.success(
        'Realisasi berhasil disimpan'
      );

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        (err as Error).message ||
          'Gagal menyimpan realisasi'
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !!form.tahun &&
    !!form.bulan &&
    !!form.idAnggaran &&
    !!form.idDetail &&
    nilaiInput > 0 &&
    !!selectedDetail &&
    paguKomponen > 0 &&
    !melebihiPagu &&
    !loadingRel;

  return (
    <ModalWrapper
      title="Tambah Realisasi"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4">
        <Field label="Tahun">
          <TextInput
            value={form.tahun}
            onChange={(v) =>
              setForm({
                ...form,
                tahun: v,
              })
            }
            placeholder="Masukkan tahun anggaran"
          />
        </Field>

        <Field label="Bulan">
          <SelectInput
            value={form.bulan}
            placeholder="— Pilih Bulan —"
            onChange={(v) =>
              setForm({
                ...form,
                bulan: v,
              })
            }
            options={BULAN_OPTIONS}
          />
        </Field>

        <Field
          label={
            <>
              Kegiatan Anggaran{' '}
              {loadingAng && (
                <Loader2 className="inline w-3 h-3 animate-spin ml-1" />
              )}
            </>
          }
        >
          {anggaranList.length === 0 &&
          !loadingAng ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-xs text-amber-400">
                Belum ada anggaran tahun{' '}
                {form.tahun}.
              </p>
            </div>
          ) : (
            <div className="relative">
              <select
                value={form.idAnggaran}
                onChange={(e) =>
                  setForm({
                    ...form,
                    idAnggaran:
                      e.target.value,
                    idDetail: '',
                  })
                }
                className="w-full appearance-none rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">
                  — Pilih Kegiatan —
                </option>

                {anggaranList.map((a) => (
                  <option
                    key={
                      a['ID ANGGARAN']
                    }
                    value={
                      a['ID ANGGARAN']
                    }
                  >
                    {a['ID ANGGARAN']} —{' '}
                    {a['NAMA KEGIATAN']} (
                    {a.JENIS})
                  </option>
                ))}
              </select>

              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}
        </Field>

        {selectedAnggaran && (
          <div className="rounded-xl bg-slate-900/60 border border-white/5 px-4 py-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">
                Bidang/Jenis
              </span>

              <span className="text-slate-300 font-medium">
                {selectedAnggaran.BIDANG} /{' '}
                {selectedAnggaran.JENIS}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500">
                Total Pagu
              </span>

              <span className="text-emerald-400 font-bold">
                {formatRupiahZero(
                  selectedAnggaran[
                    'TOTAL PAGU'
                  ]
                )}
              </span>
            </div>
          </div>
        )}

        {form.idAnggaran && (
          <Field
            label={
              <>
                Pelaksanaan & Komponen{' '}
                {(loadingDetail ||
                  loadingRel) && (
                  <Loader2 className="inline w-3 h-3 animate-spin ml-1" />
                )}
              </>
            }
          >
            {filteredDetail.length ===
              0 && !loadingDetail ? (
              <p className="text-xs text-slate-500 italic">
                Detail anggaran belum
                tersedia.
              </p>
            ) : (
              <div className="relative">
                <select
                  value={form.idDetail}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      idDetail:
                        e.target.value,
                      nilaiRealisasi: '',
                    })
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">
                    — Pilih Pelaksanaan &
                    Komponen —
                  </option>

                  {filteredDetail.map(
                    (d) => {
                      const pagu =
                        toNumber(
                          d[
                            'PAGU KOMPONEN'
                          ]
                        );

                      const rel =
                        getDetailRealizationTotal(
                          realisasiList,
                          d['ID DETAIL']
                        );

                      const sisa =
                        Math.max(
                          0,
                          pagu - rel
                        );

                      return (
                        <option
                          key={
                            d['ID DETAIL']
                          }
                          value={
                            d['ID DETAIL']
                          }
                        >
                          {d.PELAKSANAAN} —{' '}
                          {d.KOMPONEN}
                          {pagu > 0
                            ? ` — Sisa ${formatRupiah(
                                sisa
                              )}`
                            : ' — PAGU BELUM DIATUR'}
                        </option>
                      );
                    }
                  )}
                </select>

                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            )}
          </Field>
        )}

        {selectedDetail && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Informasi Anggaran Komponen
              </p>

              <p className="text-sm font-semibold text-white mt-1">
                {selectedDetail.PELAKSANAAN}
              </p>

              <p className="text-xs text-slate-500">
                {selectedDetail.KOMPONEN}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
              <div className="px-4 py-3">
                <p className="text-[10px] text-slate-500 uppercase">
                  Pagu Komponen
                </p>

                <p className="text-sm font-bold text-emerald-400 mt-1">
                  {formatRupiahZero(
                    paguKomponen
                  )}
                </p>
              </div>

              <div className="px-4 py-3">
                <p className="text-[10px] text-slate-500 uppercase">
                  Realisasi Sebelumnya
                </p>

                <p className="text-sm font-bold text-blue-400 mt-1">
                  {formatRupiahZero(
                    realisasiSebelumnya
                  )}
                </p>
              </div>

              <div className="px-4 py-3">
                <p className="text-[10px] text-slate-500 uppercase">
                  Sisa Pagu
                </p>

                <p
                  className={`text-sm font-bold mt-1 ${
                    sisaPagu > 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {formatRupiahZero(
                    sisaPagu
                  )}
                </p>
              </div>
            </div>

            {paguKomponen <= 0 && (
              <div className="px-4 py-3 border-t border-amber-500/20 bg-amber-500/5 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />

                <p className="text-xs text-amber-400">
                  Pagu komponen belum
                  ditentukan. Silakan isi
                  PAGU KOMPONEN pada menu
                  DETAIL ANGGARAN.
                </p>
              </div>
            )}

            {paguKomponen > 0 &&
              sisaPagu <= 0 && (
                <div className="px-4 py-3 border-t border-red-500/20 bg-red-500/5 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />

                  <p className="text-xs text-red-400">
                    Pagu komponen sudah
                    habis. Tidak dapat
                    menambahkan realisasi
                    lagi.
                  </p>
                </div>
              )}
          </div>
        )}

        <Field label="Nilai Realisasi (Rp)">
          <input
            type="text"
            inputMode="numeric"
            value={
              form.nilaiRealisasi
                ? formatRupiah(
                    form.nilaiRealisasi
                  )
                : ''
            }
            onChange={(e) =>
              setForm({
                ...form,
                nilaiRealisasi:
                  e.target.value.replace(
                    /\D/g,
                    ''
                  ),
              })
            }
            placeholder="Rp 5.000.000"
            className={`w-full rounded-xl border bg-slate-900/80 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 ${
              melebihiPagu
                ? 'border-red-500/60 focus:ring-red-500/40'
                : 'border-white/10 focus:ring-emerald-500/40'
            }`}
          />

          {melebihiPagu && (
            <p className="text-xs text-red-400 mt-1.5">
              Nilai melebihi sisa pagu.
              Maksimal{' '}
              <strong>
                {formatRupiah(
                  sisaPagu
                )}
              </strong>
              .
            </p>
          )}
        </Field>
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
        saving={saving}
        disabled={!canSave}
        label="Simpan Realisasi"
      />
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL ANGGARAN EDITOR
// ─────────────────────────────────────────────────────────────────────────────

function DetailAnggaranEditor({
  detailRows,
  realisasiRows,
  anggaranRows,
  getHeaders,
  onClose,
  onSuccess,
}: {
  detailRows: DetailRow[];
  realisasiRows: RealisasiRow[];
  anggaranRows: Record<string, string>[];
  getHeaders: () => Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const grouped = detailRows.reduce<
    Record<string, DetailRow[]>
  >((acc, row) => {
    const id = row['ID ANGGARAN'];

    if (!acc[id]) {
      acc[id] = [];
    }

    acc[id].push(row);

    return acc;
  }, {});

  const [selectedAnggaran, setSelectedAnggaran] =
    useState('');

  const [values, setValues] = useState<
    Record<string, string>
  >({});

  const [saving, setSaving] = useState(false);

  const rows =
    grouped[selectedAnggaran] || [];

  const selectedAnggaranRows =
    rows.length > 0 ? rows : [];

  const totalPaguKomponen =
    selectedAnggaranRows.reduce(
      (sum, row) =>
        sum +
        toNumber(
          values[row['ID DETAIL']] ??
            row['PAGU KOMPONEN']
        ),
      0
    );

  const firstRow =
    selectedAnggaranRows[0];

  const totalRealisasi =
    selectedAnggaran
      ? getRealizationTotal(
          realisasiRows,
          selectedAnggaran
        )
      : 0;

  const totalPaguAnggaran = toNumber(
    anggaranRows.find(
      (row) => row['ID ANGGARAN'] === selectedAnggaran
    )?.['TOTAL PAGU']
  );

  const handleSelect = (
    idAnggaran: string
  ) => {
    setSelectedAnggaran(idAnggaran);

    const target =
      grouped[idAnggaran] || [];

    const initial: Record<
      string,
      string
    > = {};

    target.forEach((row) => {
      initial[row['ID DETAIL']] =
        row['PAGU KOMPONEN'] || '';
    });

    setValues(initial);
  };

  const handleSave = async () => {
    if (!selectedAnggaran) {
      toast.error(
        'Pilih ID Anggaran terlebih dahulu.'
      );
      return;
    }

    setSaving(true);

    try {
      for (const row of selectedAnggaranRows) {
        const value =
          values[row['ID DETAIL']] ?? '';

        const res = await fetch(
          '/api/admin',
          {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
              sheet: 'DETAIL ANGGARAN',
              id: row.id,
              data: {
                'PAGU KOMPONEN': String(
                  toNumber(value)
                ),
              },
            }),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json.error ||
              `Gagal menyimpan ${row['ID DETAIL']}`
          );
        }
      }

      toast.success(
        'Pagu komponen berhasil diperbarui.'
      );

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        (err as Error).message ||
          'Gagal menyimpan pagu komponen'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper
      title="Atur Pagu Komponen"
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="px-6 py-5 space-y-5">
        <Field label="ID Anggaran">
          <SelectInput
            value={selectedAnggaran}
            onChange={handleSelect}
            placeholder="— Pilih Anggaran —"
            options={Object.keys(grouped)}
          />
        </Field>

        {firstRow && (
          <div className="rounded-xl bg-slate-900/60 border border-white/5 px-4 py-3">
            <p className="text-sm font-bold text-white">
              {firstRow.KEGIATAN}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              {firstRow.BIDANG} /{' '}
              {firstRow.JENIS}
            </p>
          </div>
        )}

        {selectedAnggaran && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />

                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Total Pagu Komponen
                  </p>
                </div>

                <p className="text-xl font-black text-emerald-300 mt-1">
                  {formatRupiahZero(
                    totalPaguKomponen
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />

                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Total Realisasi
                  </p>
                </div>

                <p className="text-xl font-black text-blue-300 mt-1">
                  {formatRupiahZero(
                    totalRealisasi
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  {totalPaguAnggaran > 0 &&
                  totalPaguKomponen ===
                    totalPaguAnggaran ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}

                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Status
                  </p>
                </div>

                <p className="text-sm font-black text-amber-300 mt-2">
                  PAGU KOMPONEN
                  DITETAPKAN
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_180px] gap-0 bg-slate-900 border-b border-white/10">
                <div className="px-4 py-3 text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                  Pelaksanaan
                </div>

                <div className="px-4 py-3 text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                  Komponen
                </div>

                <div className="px-4 py-3 text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                  Pagu Komponen
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {selectedAnggaranRows.map(
                  (row) => (
                    <div
                      key={
                        row['ID DETAIL']
                      }
                      className="grid grid-cols-[1fr_1fr_180px] gap-0 items-center"
                    >
                      <div className="px-4 py-3 text-xs text-slate-300">
                        {row.PELAKSANAAN}
                      </div>

                      <div className="px-4 py-3 text-xs text-slate-300">
                        {row.KOMPONEN}
                      </div>

                      <div className="px-4 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            values[
                              row[
                                'ID DETAIL'
                              ]
                            ]
                              ? formatRupiah(
                                  values[
                                    row[
                                      'ID DETAIL'
                                    ]
                                  ]
                                )
                              : ''
                          }
                          onChange={(e) => {
                            const raw =
                              e.target.value.replace(
                                /\D/g,
                                ''
                              );

                            setValues(
                              (prev) => ({
                                ...prev,
                                [row[
                                  'ID DETAIL'
                                ]]: raw,
                              })
                            );
                          }}
                          placeholder="Rp 0"
                          className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <p className="text-xs text-blue-300">
                Isi PAGU KOMPONEN sesuai
                pembagian anggaran. Setelah
                seluruh pagu komponen selesai,
                totalnya harus sesuai dengan
                TOTAL PAGU kegiatan.
              </p>
            </div>
          </>
        )}
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
        saving={saving}
        disabled={
          !selectedAnggaran ||
          selectedAnggaranRows.length ===
            0
        }
        label="Simpan Pagu Komponen"
      />
    </ModalWrapper>
  );
}

function KekuatanPersonelEditor({
  rows,
  getHeaders,
  onClose,
  onSuccess,
}: {
  rows: Record<string, string>[];
  getHeaders: () => Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const categories = ['PA', 'BA', 'TA'];
  const getRowValue = (row: Record<string, string>, names: string[]) => {
    const entry = Object.entries(row).find(([key]) =>
      names.includes(key.trim().toUpperCase())
    );
    return entry?.[1] || '';
  };
  const [values, setValues] = useState<Record<string, { top: string; nyata: string }>>(() =>
    Object.fromEntries(categories.map((category) => {
      const row = rows.find((item) =>
        getRowValue(item, ['KATEGORI', 'PANGKAT', 'JENIS']).trim().toUpperCase() === category
      );
      return [category, {
        top: row ? getRowValue(row, ['TOP']) : '',
        nyata: row ? getRowValue(row, ['NYATA']) : '',
      }];
    }))
  );
  const [saving, setSaving] = useState(false);

  const numberValue = (value: string) => Number(String(value).replace(/[^\d-]/g, '')) || 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const category of categories) {
        const row = rows.find((item) =>
          getRowValue(item, ['KATEGORI', 'PANGKAT', 'JENIS']).trim().toUpperCase() === category
        );
        if (!row?.id) continue;
        const top = numberValue(values[category].top);
        const nyata = numberValue(values[category].nyata);
        const response = await fetch('/api/admin', {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            sheet: 'KET PERS',
            id: row.id,
            data: { TOP: String(top), NYATA: String(nyata), KURANG: String(top - nyata) },
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Gagal menyimpan ${category}`);
      }
      toast.success('Kekuatan personel berhasil diperbarui.');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || 'Gagal menyimpan kekuatan personel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Edit Kekuatan Personel" onClose={onClose} maxWidth="max-w-3xl">
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-[120px_1fr_1fr_1fr] gap-3 text-xs font-semibold text-emerald-400">
          <div>Pangkat</div><div>TOP</div><div>NYATA</div><div>KURANG</div>
        </div>
        {categories.map((category) => {
          const top = numberValue(values[category].top);
          const nyata = numberValue(values[category].nyata);
          return (
            <div key={category} className="grid grid-cols-[120px_1fr_1fr_1fr] gap-3 items-center">
              <div className="font-bold text-white">{category}</div>
              <TextInput value={values[category].top} onChange={(value) => setValues({ ...values, [category]: { ...values[category], top: value } })} placeholder="TOP" />
              <TextInput value={values[category].nyata} onChange={(value) => setValues({ ...values, [category]: { ...values[category], nyata: value } })} placeholder="NYATA" />
              <div className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5 text-white">{top - nyata}</div>
            </div>
          );
        })}
      </div>
      <ModalFooter onCancel={onClose} onSave={handleSave} saving={saving} label="Simpan" />
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PAGE
// ─────────────────────────────────────────────────────────────────────────────


// FORM UPDATE JADWAL MINGGUAN
// Struktur GSheet (JANGAN diubah):
// Baris 1 (header):
//   A1=JAM KE, B1=WAKTU,
//   C1–I1 = Hari 1–7,  J1 = pemisah,
//   K1–Q1 = Hari 8–14,
//   S1 = Nama Kegiatan, T1 = Detail/Keterangan
// Baris 2–11 (data jam):
//   A = jam ke, B = waktu baku,
//   C–I = kegiatan minggu 1, K–Q = kegiatan minggu 2
// S2… / T2… = kamus kegiatan (opsional, tak terbatas)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIME_SLOTS = [
  { jam: '1', waktu: '05.00-05.45' },
  { jam: '2', waktu: '05.45-06.30' },
  { jam: '3', waktu: '06.30-07.15' },
  { jam: '4', waktu: '07.15-08.00' },
  { jam: '5', waktu: '08.00-08.45' },
  { jam: '6', waktu: '08.45-09.30' },
  { jam: '7', waktu: '09.30-10.15' },
  { jam: '8', waktu: '10.15-11.00' },
  { jam: '9', waktu: '11.00-11.45' },
  { jam: '10', waktu: '11.45-12.30' },
];

// Index kolom 0-based sesuai A=0 … T=19
const COL_JAM = 0;       // A
const COL_WAKTU = 1;     // B
const COL_WEEK1 = [2, 3, 4, 5, 6, 7, 8];      // C–I  Hari 1–7
const COL_WEEK2 = [10, 11, 12, 13, 14, 15, 16]; // K–Q Hari 8–14
const COL_DAY = [...COL_WEEK1, ...COL_WEEK2]; // 14 hari
const COL_NAMA = 18;     // S
const COL_DETAIL = 19;   // T
const MAX_JAM_ROWS = 10; // baris 2–11

// Kolom index yg disembunyikan di tabel admin JADWAL MINGGUAN:
// J=9 (pemisah/MINGGU BERIKUTNYA), R=17 (pemisah), S=18 (DETAILNYA/Nama Kegiatan), T=19 (Detail/Keterangan)
const JADWAL_HIDDEN_COL_INDICES = new Set([9, 17, 18, 19]);

function addDaysISO(iso: string, days: number): string {
  const base = new Date(iso + 'T00:00:00');
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function JadwalMingguanEditor({
  getHeaders,
  onClose,
  onSuccess,
}: {
  getHeaders: () => Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  // Header baris 1 asli dari GSheet (panjang minimal 20)
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  // Tanggal label untuk 14 hari (ditulis ke C1–I1 dan K1–Q1 saat simpan)
  const [dayDates, setDayDates] = useState<string[]>(Array(14).fill(''));
  // 10 baris jam (baris sheet 2–11)
  const [slots, setSlots] = useState<
    { jam: string; waktu: string; activities: string[] }[]
  >([]);
  // Kamus S/T (baris 2 ke bawah, opsional)
  const [activityMap, setActivityMap] = useState<{ name: string; detail: string }[]>([
    { name: '', detail: '' },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          '/api/admin?sheet=' + encodeURIComponent('JADWAL MINGGUAN'),
          { headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memuat jadwal');

        // Ambil header baris 1 apa adanya
        const headers: string[] = Array.isArray(data.headers) ? [...data.headers] : [];
        while (headers.length < 20) headers.push('');
        // Pastikan nama kolom wajib tidak kosong
        if (!String(headers[COL_JAM] || '').trim()) headers[COL_JAM] = 'JAM KE';
        if (!String(headers[COL_WAKTU] || '').trim()) headers[COL_WAKTU] = 'WAKTU';
        if (!String(headers[COL_NAMA] || '').trim()) headers[COL_NAMA] = 'Nama Kegiatan';
        if (!String(headers[COL_DETAIL] || '').trim()) headers[COL_DETAIL] = 'Detail';
        setSheetHeaders(headers);

        // Tanggal dari header hari (C1–I1, K1–Q1) jika sudah ISO
        const dates = Array(14).fill('') as string[];
        COL_DAY.forEach((colIdx, di) => {
          const h = String(headers[colIdx] || '').trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(h)) dates[di] = h.slice(0, 10);
        });
        setDayDates(dates);

        const rows: Record<string, string>[] = data.rows || [];
        const jamKey = headers[COL_JAM];
        const waktuKey = headers[COL_WAKTU];
        const namaKey = headers[COL_NAMA];
        const detailKey = headers[COL_DETAIL];

        // Bangun 10 slot dari baris yang punya Jam/Waktu (maks baris 2–11)
        const dataRows = rows
          .filter((row) => {
            const jam = String(row[jamKey] ?? '').trim();
            const waktu = String(row[waktuKey] ?? '').trim();
            return !!(jam || waktu);
          })
          .slice(0, MAX_JAM_ROWS);

        let built =
          dataRows.length > 0
            ? dataRows.map((row) => ({
                jam: String(row[jamKey] ?? '').trim(),
                waktu: String(row[waktuKey] ?? '').trim(),
                activities: COL_DAY.map((colIdx) =>
                  String(row[headers[colIdx]] ?? '').trim()
                ),
              }))
            : DEFAULT_TIME_SLOTS.map((s) => ({
                jam: s.jam,
                waktu: s.waktu,
                activities: Array(14).fill('') as string[],
              }));

        // Pad sampai 10 baris dengan waktu baku
        while (built.length < MAX_JAM_ROWS) {
          const def = DEFAULT_TIME_SLOTS[built.length] || {
            jam: String(built.length + 1),
            waktu: '',
          };
          built.push({
            jam: def.jam,
            waktu: def.waktu,
            activities: Array(14).fill(''),
          });
        }
        setSlots(built.slice(0, MAX_JAM_ROWS));

        // Kamus S/T dari semua baris yang punya nama kegiatan
        const maps: { name: string; detail: string }[] = [];
        rows.forEach((row) => {
          const name = String(row[namaKey] ?? '').trim();
          const detail = String(row[detailKey] ?? '').trim();
          if (name) maps.push({ name, detail });
        });
        setActivityMap(maps.length ? maps : [{ name: '', detail: '' }]);
      } catch (err) {
        toast.error((err as Error).message || 'Gagal memuat jadwal');
        setSheetHeaders([
          'JAM KE',
          'WAKTU',
          'Hari 1',
          'Hari 2',
          'Hari 3',
          'Hari 4',
          'Hari 5',
          'Hari 6',
          'Hari 7',
          '',
          'Hari 8',
          'Hari 9',
          'Hari 10',
          'Hari 11',
          'Hari 12',
          'Hari 13',
          'Hari 14',
          '',
          'Nama Kegiatan',
          'Detail',
        ]);
        setSlots(
          DEFAULT_TIME_SLOTS.map((s) => ({
            jam: s.jam,
            waktu: s.waktu,
            activities: Array(14).fill(''),
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getHeaders]);

  const updateActivity = (slotIdx: number, dayIdx: number, value: string) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              activities: s.activities.map((a, di) => (di === dayIdx ? value : a)),
            }
          : s
      )
    );
  };

  // Isi tanggal hanya di Hari 1 (index 0) dan Hari 8 (index 7); sisanya +1 otomatis
  const handleDateChange = (dayIdx: number, value: string) => {
    setDayDates((prev) => {
      const next = [...prev];
      next[dayIdx] = value;
      if (value && dayIdx === 0) {
        for (let i = 0; i < 7; i++) next[i] = addDaysISO(value, i);
      }
      if (value && dayIdx === 7) {
        for (let i = 7; i < 14; i++) next[i] = addDaysISO(value, i - 7);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Header baris 1 — pertahankan struktur A–T
      const headers = [...sheetHeaders];
      while (headers.length < 20) headers.push('');
      if (!String(headers[COL_JAM] || '').trim()) headers[COL_JAM] = 'JAM KE';
      if (!String(headers[COL_WAKTU] || '').trim()) headers[COL_WAKTU] = 'WAKTU';
      if (!String(headers[COL_NAMA] || '').trim()) headers[COL_NAMA] = 'Nama Kegiatan';
      if (!String(headers[COL_DETAIL] || '').trim()) headers[COL_DETAIL] = 'Detail';

      // Label hari ke C1–I1 dan K1–Q1 jika user isi tanggal
      COL_DAY.forEach((colIdx, di) => {
        if (dayDates[di]) headers[colIdx] = dayDates[di];
      });

      // Matriks data per INDEX kolom (bukan nama header)
      // Baris sheet 2–11 = 10 slot jam
      const valuesByIndex: string[][] = slots.slice(0, MAX_JAM_ROWS).map((slot, si) => {
        const line = Array.from({ length: 20 }, () => '');
        line[COL_JAM] = slot.jam || '';
        line[COL_WAKTU] = slot.waktu || '';
        COL_DAY.forEach((colIdx, di) => {
          line[colIdx] = slot.activities[di] || '';
        });
        if (activityMap[si]?.name) line[COL_NAMA] = activityMap[si].name;
        if (activityMap[si]?.detail) line[COL_DETAIL] = activityMap[si].detail;
        return line;
      });

      // Kamus kegiatan tambahan (baris > 11) — hanya kolom S & T
      activityMap.slice(MAX_JAM_ROWS).forEach((am) => {
        if (!am.name.trim()) return;
        const line = Array.from({ length: 20 }, () => '');
        line[COL_NAMA] = am.name;
        line[COL_DETAIL] = am.detail;
        valuesByIndex.push(line);
      });

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'replace-sheet',
          sheet: 'JADWAL MINGGUAN',
          headers,
          rows: [],
          valuesByIndex,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan jadwal');
      toast.success(json.message || 'Jadwal berhasil disimpan');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Gagal menyimpan jadwal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Update Jadwal Mingguan (14 Hari)" onClose={onClose} maxWidth="max-w-6xl">
      <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 leading-relaxed">
              <strong>Struktur GSheet (tidak diubah):</strong>
              <br />
              A1=<b>JAM KE</b>, B1=<b>WAKTU</b>, C1–I1=Hari 1–7, K1–Q1=Hari 8–14, S1/T1=Nama &amp; Detail kegiatan.
              <br />
              Kegiatan mengikuti waktu di baris 2–11 (kolom C–I &amp; K–Q). Isi tanggal di <b>Hari 1</b> &amp; <b>Hari 8</b> saja.
            </div>

            <div>
              <p className="text-xs text-slate-500 font-semibold mb-2">Minggu 1 (C–I)</p>
              <div className="grid grid-cols-7 gap-2 mb-3">
                {Array.from({ length: 7 }, (_, di) => (
                  <button
                    key={di}
                    type="button"
                    onClick={() => setActiveDay(di)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                      activeDay === di
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'border-white/10 bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    Hari {di + 1}
                    <div className="text-[10px] font-normal opacity-70 truncate">
                      {dayDates[di] || '—'}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 font-semibold mb-2">Minggu 2 (K–Q)</p>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const di = i + 7;
                  return (
                    <button
                      key={di}
                      type="button"
                      onClick={() => setActiveDay(di)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                        activeDay === di
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'border-white/10 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      Hari {di + 1}
                      <div className="text-[10px] font-normal opacity-70 truncate">
                        {dayDates[di] || '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 space-y-3">
              <label className="text-xs text-slate-500 font-semibold block">
                Tanggal Hari {activeDay + 1}
                {(activeDay === 0 || activeDay === 7) && (
                  <span className="text-emerald-400 font-normal">
                    {' '}
                    — isi di sini, hari lain otomatis +1
                  </span>
                )}
              </label>
              <input
                type="date"
                value={dayDates[activeDay] || ''}
                onChange={(e) => handleDateChange(activeDay, e.target.value)}
                disabled={activeDay !== 0 && activeDay !== 7 && !dayDates[activeDay]}
                className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white text-sm disabled:opacity-50"
              />
              {(activeDay !== 0 && activeDay !== 7) && (
                <p className="text-[11px] text-slate-500">
                  Tanggal hari ini mengikuti Hari {activeDay < 7 ? '1' : '8'}. Ubah dari tombol Hari 1 / Hari 8.
                </p>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-emerald-400 text-xs uppercase">
                    <th className="px-2 py-2 w-16">Jam Ke</th>
                    <th className="px-2 py-2 w-32">Waktu</th>
                    <th className="px-2 py-2">Kegiatan (opsional)</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, si) => (
                    <tr key={si} className="border-t border-white/5">
                      <td className="px-2 py-2 text-slate-400 font-mono">{slot.jam}</td>
                      <td className="px-2 py-2 text-slate-400 font-mono text-xs">{slot.waktu}</td>
                      <td className="px-2 py-2">
                        <input
                          value={slot.activities[activeDay] || ''}
                          onChange={(e) => updateActivity(si, activeDay, e.target.value)}
                          placeholder="(kosongkan jika sama)"
                          className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-white text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-white/10 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-slate-200">
                  Kamus Kegiatan (S1 / T1 — opsional)
                </h4>
                <button
                  type="button"
                  onClick={() => setActivityMap((m) => [...m, { name: '', detail: '' }])}
                  className="text-xs text-emerald-400"
                >
                  + Tambah
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Header S1 = Nama Kegiatan, T1 = Detail/Keterangan. Isi dari baris 2 ke bawah.
              </p>
              {activityMap.map((am, i) => (
                <div key={i} className="grid sm:grid-cols-2 gap-2">
                  <input
                    value={am.name}
                    onChange={(e) =>
                      setActivityMap((prev) =>
                        prev.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x))
                      )
                    }
                    placeholder="Nama kegiatan"
                    className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white text-sm"
                  />
                  <input
                    value={am.detail}
                    onChange={(e) =>
                      setActivityMap((prev) =>
                        prev.map((x, xi) => (xi === i ? { ...x, detail: e.target.value } : x))
                      )
                    }
                    placeholder="Detail / keterangan"
                    className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ModalFooter onCancel={onClose} onSave={handleSave} saving={saving} label="Simpan Jadwal" />
    </ModalWrapper>
  );
}



export default function AdminPage() {
  const [password, setPassword] =
    useState('');

  const [authenticated, setAuthenticated] =
    useState(false);

  const [authError, setAuthError] =
    useState('');

  const [activeSheet, setActiveSheet] =
    useState('ANGGARAN');

  const [perbidangYear, setPerbidangYear] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [filterColumn, setFilterColumn] = useState('');

  const [editingRow, setEditingRow] =
    useState<Record<
      string,
      string
    > | null>(null);

  const [isNew, setIsNew] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [pendingFile, setPendingFile] =
    useState<File | null>(null);

  const [
    showPasswordForm,
    setShowPasswordForm,
  ] = useState(false);

  const [pwForm, setPwForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const [showAngForm, setShowAngForm] =
    useState(false);

  const [showJadwalEditor, setShowJadwalEditor] =
    useState(false);

  const [showRelForm, setShowRelForm] =
    useState(false);

  const [
    showDetailBudgetForm,
    setShowDetailBudgetForm,
  ] = useState(false);

  const [showKekuatanPersonelForm, setShowKekuatanPersonelForm] =
    useState(false);

  /** Multi-select hapus */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /** Progress hapus (single / bulk) */
  const [deleteProgress, setDeleteProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    label: string;
  }>({ active: false, current: 0, total: 0, label: '' });

  const queryClient =
    useQueryClient();

  // Ref for table scroll container
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Reset selection saat ganti sheet
  useEffect(() => {
    setSelectedIds([]);
  }, [activeSheet]);

  // ────────────────────────────────────────
  // AUTH
  // ────────────────────────────────────────

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    const savedAuth =
      localStorage.getItem(
        ADMIN_STORAGE_KEY
      );

    const savedPw =
      localStorage.getItem(
        ADMIN_PASSWORD_KEY
      );

    if (
      savedAuth === 'true' &&
      savedPw
    ) {
      fetch(
        '/api/admin?action=verify',
        {
          headers: {
            'x-admin-password':
              savedPw,
          },
        }
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.valid) {
            setAuthenticated(true);
            setPassword(savedPw);
          } else {
            localStorage.removeItem(
              ADMIN_STORAGE_KEY
            );

            localStorage.removeItem(
              ADMIN_PASSWORD_KEY
            );
          }
        })
        .catch(() => {});
    }
  }, []);



  const getHeaders = useCallback(
    (): Record<string, string> => ({
      'x-admin-password':
        password,
      'Content-Type':
        'application/json',
    }),
    [password]
  );

  // ────────────────────────────────────────
  // DATA SHEET AKTIF
  // ────────────────────────────────────────

  const {
    data: sheetData,
    isLoading: loadingSheet,
    isFetching,
    refetch,
  } = useQuery<SheetData>({
    queryKey: [
      'admin-sheet',
      activeSheet,
      perbidangYear,
    ],

    queryFn: async () => {
      const res = await fetch(
        `/api/admin?sheet=${encodeURIComponent(activeSheet)}${
          activeSheet === 'ANGGARAN PERBIDANG' && perbidangYear
            ? `&tahun=${encodeURIComponent(perbidangYear)}`
            : ''
        }`,
        {
          headers: getHeaders(),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error ||
            'Gagal memuat data'
        );
      }

      return json;
    },

    enabled:
      authenticated &&
      !!password &&
      activeSheet !== 'SETTINGS',
  });

  // ────────────────────────────────────────
  // DATA UNTUK PERHITUNGAN ANGGARAN
  // ────────────────────────────────────────

  const {
    data: detailData,
    refetch: refetchDetail,
  } = useQuery<SheetData>({
    queryKey: [
      'admin-sheet',
      'DETAIL ANGGARAN',
    ],

    queryFn: async () => {
      const res = await fetch(
        `/api/admin?sheet=${encodeURIComponent(
          'DETAIL ANGGARAN'
        )}`,
        {
          headers: getHeaders(),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error ||
            'Gagal memuat detail anggaran'
        );
      }

      return json;
    },

    enabled:
      authenticated &&
      !!password &&
      activeSheet === 'ANGGARAN',
  });

  const {
    data: realisasiData,
    refetch: refetchRealisasi,
  } = useQuery<SheetData>({
    queryKey: [
      'admin-sheet',
      'REALISASI',
    ],

    queryFn: async () => {
      const res = await fetch(
        '/api/admin?sheet=REALISASI',
        {
          headers: getHeaders(),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error ||
            'Gagal memuat realisasi'
        );
      }

      return json;
    },

    enabled:
      authenticated &&
      !!password &&
      activeSheet === 'ANGGARAN',
  });

  const anggaranRows =
    (sheetData?.rows ||
      []) as Record<string, string>[];

  const detailRows =
    (detailData?.rows ||
      []) as unknown as DetailRow[];

  const realisasiRows =
    (realisasiData?.rows ||
      []) as unknown as RealisasiRow[];

  // ────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setAuthError('');

    try {
      const res = await fetch(
        '/api/admin',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'login',
            password,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setAuthError(
          data.error ||
            'Password salah'
        );
        return;
      }

      localStorage.setItem(
        ADMIN_STORAGE_KEY,
        'true'
      );

      localStorage.setItem(
        ADMIN_PASSWORD_KEY,
        password
      );

      setAuthenticated(true);

      toast.success(
        'Berhasil masuk sebagai admin'
      );
    } catch {
      setAuthError(
        'Gagal terhubung ke server'
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      ADMIN_STORAGE_KEY
    );

    localStorage.removeItem(
      ADMIN_PASSWORD_KEY
    );

    setAuthenticated(false);
    setPassword('');
    setEditingRow(null);

    toast.success(
      'Logout berhasil'
    );
  };

  // ────────────────────────────────────────
  // PASSWORD
  // ────────────────────────────────────────

  const handleChangePassword = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (
      pwForm.next !==
      pwForm.confirm
    ) {
      toast.error(
        'Password baru tidak cocok'
      );
      return;
    }

    if (
      pwForm.next.length < 6
    ) {
      toast.error(
        'Password minimal 6 karakter'
      );
      return;
    }

    try {
      const res = await fetch(
        '/api/admin',
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            action:
              'change-password',
            currentPassword:
              pwForm.current,
            newPassword:
              pwForm.next,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        toast.error(
          data.error ||
            'Gagal mengubah password'
        );
        return;
      }

      localStorage.setItem(
        ADMIN_PASSWORD_KEY,
        pwForm.next
      );

      setPassword(
        pwForm.next
      );

      setPwForm({
        current: '',
        next: '',
        confirm: '',
      });

      setShowPasswordForm(false);

      toast.success(
        'Password berhasil diubah'
      );
    } catch {
      toast.error(
        'Gagal terhubung ke server'
      );
    }
  };

  // ────────────────────────────────────────
  // FORM GENERIC
  // ────────────────────────────────────────

  const getFormHeaders =
    useCallback(() => {
      if (
        sheetData?.headers?.length
      ) {
        return sheetData.headers;
      }

      return (
        DEFAULT_HEADERS[
          activeSheet
        ] || ['Kolom1', 'Kolom2']
      );
    }, [
      sheetData,
      activeSheet,
    ]);

  const openNew = () => {
    let headers = getFormHeaders();
    if (!headers.length) {
      headers = DEFAULT_HEADERS[activeSheet] || ['Kolom1'];
    }

    const empty: Record<string, string> = { id: '' };
    headers.forEach((h) => {
      empty[h] = '';
    });

    setEditingRow(empty);
    setPendingFile(null);
    setIsNew(true);
  };

  const openEdit = (
    row: Record<string, string>
  ) => {
    setEditingRow({
      ...row,
    });
    setPendingFile(null);

    setIsNew(false);
  };

  // ────────────────────────────────────────
  // UPLOAD
  // ────────────────────────────────────────

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file || !editingRow) {
      return;
    }

    if (activeSheet === 'DOKUMEN' || activeSheet === 'GALERI') {
      if (activeSheet === 'DOKUMEN' && file.type !== 'application/pdf') {
        toast.error('Dokumen harus berupa PDF.');
        e.target.value = '';
        return;
      }
      if (activeSheet === 'GALERI' && !file.type.startsWith('image/')) {
        toast.error('Galeri harus berupa file foto.');
        e.target.value = '';
        return;
      }
      setPendingFile(file);
      toast.success('File dipilih. Klik Simpan untuk mengupload ke Drive.');
      e.target.value = '';
      return;
    }

    const jenis: UploadJenis =
      activeSheet === 'GALERI'
        ? 'galeri'
        : 'dokumen';

    setUploading(true);

    toast.info(
      'Mengupload file ke Drive...'
    );

    try {
      const result =
        await uploadToDrive(
          file,
          jenis
        );

      if (!result.success) {
        throw new Error(
          result.error ||
            'Upload gagal'
        );
      }

      if (result.error) {
        toast.warning(`File sudah masuk Drive, tetapi izin berbagi belum otomatis: ${result.error}`);
      }

      if (
        activeSheet ===
        'GALERI'
      ) {
        const uploadedUrl = getUploadedFileUrl(result);
        if (!uploadedUrl) {
          throw new Error('File masuk Drive, tetapi Apps Script tidak mengembalikan link file.');
        }
        setEditingRow({
          ...editingRow,
          'URL FOTO':
            uploadedUrl,
          JUDUL:
            editingRow.JUDUL ||
            file.name.replace(
              /\.[^.]+$/,
              ''
            ),
        });
      } else if (
        activeSheet ===
        'DOKUMEN'
      ) {
        const uploadedUrl = getUploadedFileUrl(result);
        if (!uploadedUrl) {
          throw new Error('File masuk Drive, tetapi Apps Script tidak mengembalikan link file.');
        }
        const linkHeader = formHeaders.find((header) =>
          ['link', 'url', 'tautan'].includes(header.trim().toLowerCase())
        ) || 'Link';
        setEditingRow({
          ...editingRow,
          [linkHeader]: uploadedUrl,
          Judul:
            editingRow.Judul ||
            file.name.replace(
              /\.[^.]+$/,
              ''
            ),
        });
      }

      toast.success(
        'File berhasil diupload ke Drive'
      );
    } catch (err) {
      toast.error(
        (err as Error).message ||
          'Gagal upload file'
      );
    } finally {
      setUploading(false);

      e.target.value = '';
    }
  };

  // ────────────────────────────────────────
  // SAVE GENERIC
  // ────────────────────────────────────────

  const handleSave = async () => {
    if (!editingRow) return;

    setSaving(true);

    try {
      let dataToSave = { ...editingRow };
      if ((activeSheet === 'DOKUMEN' || activeSheet === 'GALERI') && isNew) {
        if (!pendingFile) {
          throw new Error('Pilih file PDF terlebih dahulu.');
        }

        setUploading(true);
        const uploadResult = await uploadToDrive(
          pendingFile,
          activeSheet === 'GALERI' ? 'galeri' : 'dokumen'
        );
        const uploadedUrl = getUploadedFileUrl(uploadResult);
        if (!uploadedUrl) {
          throw new Error(uploadResult.error || 'Link PDF dari Drive tidak tersedia.');
        }
        const linkHeader = activeSheet === 'GALERI'
          ? (formHeaders.find((header) => header.trim().toLowerCase() === 'url foto') || 'URL FOTO')
          : (formHeaders.find((header) => ['link', 'url', 'tautan'].includes(header.trim().toLowerCase())) || 'Link');
        dataToSave[linkHeader] = uploadedUrl;
        setUploading(false);
      }

      const {
        id,
        ...data
      } = dataToSave;
      if (activeSheet === 'ORGANISASI') {
        for (const header of ORGANIZATION_TOTAL_HEADERS) {
          delete data[header];
        }
      }

      if (isNew) {
        const res = await fetch(
          '/api/admin',
          {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              action: 'append',
              sheet: activeSheet,
              data,
            }),
          }
        );

        const json =
          await res.json();

        if (!res.ok) {
          throw new Error(
            json.error
          );
        }

        toast.success(
          'Data berhasil ditambahkan'
        );
      } else {
        const res = await fetch(
          '/api/admin',
          {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
              sheet: activeSheet,
              id,
              data,
            }),
          }
        );

        const json =
          await res.json();

        if (!res.ok) {
          throw new Error(
            json.error
          );
        }

        toast.success(
          'Data berhasil diperbarui'
        );
      }

      setEditingRow(null);
      setPendingFile(null);
      setIsNew(false);

      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          activeSheet,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'DETAIL ANGGARAN',
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'REALISASI',
        ],
      });
    } catch (err) {
      toast.error(
        (err as Error).message ||
          'Gagal menyimpan'
      );
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  // ────────────────────────────────────────
  // DELETE
  // ────────────────────────────────────────

  const deleteSheetRow = async (sheet: string, rowId: string) => {
    const res = await fetch(
      `/api/admin?sheet=${encodeURIComponent(sheet)}&id=${encodeURIComponent(rowId)}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `Gagal menghapus baris di ${sheet}`);
    }
  };

  /** Urutkan id baris dari terbesar → terkecil agar hapus di GSheet tidak geser index */
  const sortRowIdsDesc = <T extends { id?: string }>(rows: T[]): T[] =>
    [...rows].sort((a, b) => {
      const na = Number(a.id);
      const nb = Number(b.id);
      if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
      return String(b.id || '').localeCompare(String(a.id || ''), undefined, {
        numeric: true,
      });
    });

  /**
   * Hapus SEMUA baris DETAIL ANGGARAN + REALISASI yang ID ANGGARAN-nya sama,
   * lalu hapus baris ANGGARAN-nya.
   * - Selalu fetch data segar (bukan cache)
   * - Hapus dari id/index terbesar dulu (hindari geser baris GSheet)
   */
  const cascadeDeleteAnggaran = async (anggaranRowId: string) => {
    const row = sheetData?.rows?.find((r) => r.id === anggaranRowId);
    const idAnggaran = String(row?.['ID ANGGARAN'] || '').trim();

    if (!idAnggaran) {
      // Fallback: hapus baris anggaran saja
      await deleteSheetRow('ANGGARAN', anggaranRowId);
      return;
    }

    const matchAnggaran = (val: string | undefined) =>
      String(val || '').trim() === idAnggaran;

    // 1) REALISASI — fetch segar, hapus semua yang cocok (index besar → kecil)
    {
      const rRes = await fetch('/api/admin?sheet=REALISASI', {
        headers: getHeaders(),
      }).then((r) => r.json());
      const reals = sortRowIdsDesc(
        ((rRes.rows || []) as RealisasiRow[]).filter(
          (r) => matchAnggaran(r['ID ANGGARAN']) && r.id
        )
      );
      for (const r of reals) {
        await deleteSheetRow('REALISASI', String(r.id));
      }
    }

    // 2) DETAIL ANGGARAN — fetch segar lagi, hapus SEMUA pelaksanaan terkait
    {
      const dRes = await fetch(
        `/api/admin?sheet=${encodeURIComponent('DETAIL ANGGARAN')}`,
        { headers: getHeaders() }
      ).then((r) => r.json());
      const details = sortRowIdsDesc(
        ((dRes.rows || []) as DetailRow[]).filter(
          (d) => matchAnggaran(d['ID ANGGARAN']) && d.id
        )
      );
      for (const d of details) {
        await deleteSheetRow('DETAIL ANGGARAN', String(d.id));
      }
    }

    // 3) ANGGARAN — cari ulang baris by ID ANGGARAN (id baris bisa berubah setelah hapus lain)
    {
      const aRes = await fetch('/api/admin?sheet=ANGGARAN', {
        headers: getHeaders(),
      }).then((r) => r.json());
      const anggaranRows = (aRes.rows || []) as Record<string, string>[];
      const target =
        anggaranRows.find((r) => matchAnggaran(r['ID ANGGARAN'])) ||
        anggaranRows.find((r) => r.id === anggaranRowId);
      if (target?.id) {
        await deleteSheetRow('ANGGARAN', String(target.id));
      } else {
        // Coba hapus dengan id awal
        await deleteSheetRow('ANGGARAN', anggaranRowId);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteProgress.active) return;

    const isAnggaran = activeSheet === 'ANGGARAN';
    const msg = isAnggaran
      ? 'Hapus kegiatan ini? Data terkait di DETAIL ANGGARAN dan REALISASI juga akan dihapus.'
      : activeSheet === 'DOKUMEN' || activeSheet === 'GALERI'
        ? 'Hapus baris ini? Jika ada file di Drive, file tersebut juga akan dihapus.'
        : 'Hapus baris ini?';

    if (!confirm(msg)) {
      return;
    }

    setDeleteProgress({
      active: true,
      current: 0,
      total: 1,
      label: isAnggaran
        ? 'Menghapus anggaran + detail & realisasi terkait...'
        : 'Menghapus data...',
    });

    try {
      if (isAnggaran) {
        await cascadeDeleteAnggaran(id);
        setDeleteProgress((p) => ({ ...p, current: 1, label: 'Selesai menghapus...' }));
        toast.success('Anggaran beserta detail & realisasi terkait berhasil dihapus');
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'ANGGARAN'] });
        queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'DETAIL ANGGARAN'] });
        queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'REALISASI'] });
        return;
      }

      if (activeSheet === 'DOKUMEN' || activeSheet === 'GALERI') {
        const row = sheetData?.rows?.find((r) => r.id === id);
        if (row) {
          const linkHeader =
            activeSheet === 'GALERI'
              ? Object.keys(row).find((k) => k.trim().toLowerCase() === 'url foto') ||
                'URL FOTO'
              : Object.keys(row).find((k) =>
                  ['link', 'url', 'tautan'].includes(k.trim().toLowerCase())
                ) || 'Link';

          const fileUrl = row[linkHeader] || '';
          const fileId = extractDriveFileId(fileUrl);

          if (fileId) {
            setDeleteProgress((p) => ({
              ...p,
              label: 'Menghapus file di Google Drive...',
            }));
            const driveResult = await deleteFromDrive(fileId);
            if (!driveResult.success) {
              console.warn('Gagal hapus Drive:', driveResult.error);
              toast.warning(
                driveResult.error ||
                  'File Drive gagal dihapus, baris sheet tetap dihapus.'
              );
            }
          }
        }
      }

      setDeleteProgress((p) => ({
        ...p,
        label: 'Menghapus baris di Google Sheet...',
      }));
      await deleteSheetRow(activeSheet, id);
      setDeleteProgress((p) => ({ ...p, current: 1, label: 'Selesai menghapus...' }));

      toast.success('Data berhasil dihapus');

      queryClient.invalidateQueries({
        queryKey: ['admin-sheet', activeSheet],
      });
    } catch (err) {
      toast.error(
        (err as Error).message || 'Gagal menghapus'
      );
    } finally {
      setDeleteProgress({ active: false, current: 0, total: 0, label: '' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || deleteProgress.active) return;

    const isAnggaran = activeSheet === 'ANGGARAN';
    const total = selectedIds.length;
    const msg = isAnggaran
      ? `Hapus ${total} kegiatan terpilih? Data terkait di DETAIL ANGGARAN dan REALISASI juga akan dihapus.`
      : activeSheet === 'DOKUMEN' || activeSheet === 'GALERI'
        ? `Hapus ${total} baris terpilih? File di Drive (jika ada) juga akan dihapus.`
        : `Hapus ${total} baris terpilih?`;

    if (!confirm(msg)) {
      return;
    }

    setDeleteProgress({
      active: true,
      current: 0,
      total,
      label: `Menghapus 0 dari ${total}...`,
    });

    try {
      // Hapus dari id terbesar dulu (hindari geser index GSheet)
      const idsOrdered = sortRowIdsDesc(
        selectedIds.map((id) => ({ id }))
      ).map((x) => String(x.id));

      let done = 0;
      for (const id of idsOrdered) {
        setDeleteProgress({
          active: true,
          current: done,
          total,
          label: isAnggaran
            ? `Menghapus anggaran ${done + 1}/${total} (semua detail & realisasi)...`
            : `Menghapus baris ${done + 1} dari ${total}...`,
        });

        if (isAnggaran) {
          await cascadeDeleteAnggaran(id);
        } else {
          if (activeSheet === 'DOKUMEN' || activeSheet === 'GALERI') {
            const row = sheetData?.rows?.find((r) => r.id === id);
            if (row) {
              const linkHeader =
                activeSheet === 'GALERI'
                  ? Object.keys(row).find((k) => k.trim().toLowerCase() === 'url foto') ||
                    'URL FOTO'
                  : Object.keys(row).find((k) =>
                      ['link', 'url', 'tautan'].includes(k.trim().toLowerCase())
                    ) || 'Link';
              const fileUrl = row[linkHeader] || '';
              const fileId = extractDriveFileId(fileUrl);
              if (fileId) {
                await deleteFromDrive(fileId);
              }
            }
          }
          await deleteSheetRow(activeSheet, id);
        }

        done += 1;
        setDeleteProgress({
          active: true,
          current: done,
          total,
          label: `Terhapus ${done} dari ${total} (${Math.round((done / total) * 100)}%)`,
        });
      }

      toast.success(
        isAnggaran
          ? `${total} anggaran beserta detail & realisasi terkait berhasil dihapus`
          : `${total} baris berhasil dihapus`
      );
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-sheet', activeSheet] });
      if (isAnggaran) {
        queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'DETAIL ANGGARAN'] });
        queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'REALISASI'] });
      }
    } catch (err) {
      toast.error((err as Error).message || 'Gagal menghapus massal');
    } finally {
      setDeleteProgress({ active: false, current: 0, total: 0, label: '' });
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const ids = visibleRows.map((r) => r.id).filter(Boolean);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  };


  const handleSyncAnggaranPerbidang = async () => {
    try {
      const response = await fetch('/api/admin?action=sync-anggaran-perbidang', {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Gagal menyinkronkan anggaran per bidang');
      toast.success(`Anggaran Perbidang tersinkron: ${data.updated} diperbarui, ${data.added} ditambahkan.`);
      queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'ANGGARAN PERBIDANG'] });
    } catch (error) {
      toast.error((error as Error).message || 'Gagal menyinkronkan anggaran per bidang');
    }
  };

  // ────────────────────────────────────────
  // INVALIDATE
  // ────────────────────────────────────────

  const invalidateAnggaran =
    () => {
      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'ANGGARAN',
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'DETAIL ANGGARAN',
        ],
      });

      refetchDetail();
    };

  const invalidateRealisasi =
    () => {
      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'REALISASI',
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'ANGGARAN',
        ],
      });

      refetchRealisasi();
    };

  const invalidateDetail =
    () => {
      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'DETAIL ANGGARAN',
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          'admin-sheet',
          'ANGGARAN',
        ],
      });

      refetchDetail();
    };

  const showUpload =
    activeSheet === 'DOKUMEN' ||
    activeSheet === 'GALERI';

  const currentMeta =
    MANAGED_SHEETS.find(
      (s) =>
        s.id === activeSheet
    );

  const formHeaders = (() => {
    if (!editingRow) return [] as string[];
    const headers = getFormHeaders();
    // ORGANISASI: kolom TOP/NYATA/KURANG HARUS bisa diisi (jangan difilter)
    if (activeSheet === 'ORGANISASI') {
      return headers.length ? headers : ['TOP', 'NYATA', 'KURANG'];
    }
    return headers;
  })();

  const visibleRows = sheetData?.rows.filter((row) => {
    const term = searchTerm.trim().toLowerCase();
    const value = filterColumn ? row[filterColumn] || '' : Object.values(row).join(' ');
    return !term || value.toLowerCase().includes(term);
  }) || [];

  const visibleHeaders = sheetData?.headers?.length
    ? sheetData.headers
    : (DEFAULT_HEADERS[activeSheet] || []);

  // ────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────

  if (!authenticated) {
    return (
      <main className="min-h-screen military-gradient text-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/20 p-4 rounded-2xl">
              <Shield className="w-10 h-10 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-center text-white mb-2">
            Admin Portal
          </h1>

          <p className="text-center text-slate-400 mb-8 text-sm">
            Masuk untuk mengelola seluruh data portal
          </p>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-slate-500 font-semibold mb-2 block">
                Password Admin
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Masukkan password"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-red-400 text-sm">
                {authError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl"
            >
              <Key className="w-4 h-4 mr-2" />
              Masuk
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // ────────────────────────────────────────
  // ADMIN
  // ────────────────────────────────────────

  const deletePercent =
    deleteProgress.total > 0
      ? Math.min(
          100,
          Math.round((deleteProgress.current / deleteProgress.total) * 100)
        )
      : 0;

  return (
    <main className="min-h-screen military-gradient text-slate-100 pt-24 pb-16 px-4 sm:px-6">
      {/* Overlay progress hapus */}
      {deleteProgress.active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-red-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Sedang menghapus...</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jangan tutup halaman sampai selesai
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-3 min-h-[1.25rem]">
              {deleteProgress.label}
            </p>

            <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 ease-out"
                style={{ width: `${deletePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500">
                {deleteProgress.current} / {deleteProgress.total}
              </span>
              <span className="font-bold text-red-300 tabular-nums">
                {deletePercent}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-emerald-400 tracking-[0.3em] text-xs font-semibold mb-1 uppercase">
              Admin Panel
            </p>

            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Kelola Data Portal
            </h1>

            <p className="text-slate-400 text-sm mt-1">
              Tambah, edit, hapus data +
              upload file ke Drive
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setShowPasswordForm(true)
              }
              className="border-white/10 text-slate-300 hover:bg-white/5"
            >
              <Lock className="w-4 h-4 mr-2" />
              Ubah Password
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <SheetTabs
          activeSheet={activeSheet}
          onSelect={(id) => {
            setActiveSheet(id);
            setEditingRow(null);
          }}
        />

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-emerald-400" />

              <div>
                <h2 className="font-bold text-white">
                  {currentMeta?.label ||
                    activeSheet}
                </h2>

                <p className="text-xs text-slate-500">
                  {currentMeta?.description}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  refetch();

                  if (
                    activeSheet ===
                    'ANGGARAN'
                  ) {
                    refetchDetail();
                    refetchRealisasi();
                  }
                }}
                disabled={isFetching}
                className="border-white/10 text-slate-300"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isFetching
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </Button>

              {selectedIds.length > 0 &&
                activeSheet !== 'ANGGARAN PERBIDANG' &&
                activeSheet !== 'KET PERS' && (
                <Button
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={deleteProgress.active}
                  className="bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                >
                  {deleteProgress.active ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Hapus ({selectedIds.length})
                </Button>
              )}

              {activeSheet ===
              'ANGGARAN' ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setShowAngForm(true)
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Anggaran
                </Button>
              ) : activeSheet ===
                'ANGGARAN PERBIDANG' ? (
                <span className="text-xs text-emerald-400">Dihitung otomatis dari Anggaran</span>
              ) : activeSheet === 'ORGANISASI' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const organizationRow = sheetData?.rows[0];
                    if (organizationRow) openEdit(organizationRow);
                  }}
                  disabled={!sheetData?.rows.length}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : activeSheet === 'KET PERS' ? (
                <Button
                  size="sm"
                  onClick={() => setShowKekuatanPersonelForm(true)}
                  disabled={!sheetData?.rows.length}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : activeSheet ===
                'DETAIL ANGGARAN' ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setShowDetailBudgetForm(
                      true
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Wallet className="w-4 h-4 mr-1" />
                  Atur Pagu Komponen
                </Button>
              ) : activeSheet ===
                'REALISASI' ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setShowRelForm(true)
                  }
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <ReceiptText className="w-4 h-4 mr-1" />
                  Tambah Realisasi
                </Button>
              ) : activeSheet === 'JADWAL MINGGUAN' ? (
                <Button
                  size="sm"
                  onClick={() => setShowJadwalEditor(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Update Jadwal
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={openNew}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              )}
            </div>
          </div>

          {sheetData && sheetData.rows.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 px-6 py-3 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari data..."
                  className="w-full rounded-lg border border-white/10 bg-slate-900/80 pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <select
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
              >
                <option value="">Semua kolom</option>
                {sheetData.headers.map((header, hi) => (
                  <option key={`col-${hi}-${header}`} value={header}>{header || `(kolom ${hi + 1})`}</option>
                ))}
              </select>
              {activeSheet === 'ANGGARAN PERBIDANG' && (
                <select
                  value={perbidangYear}
                  onChange={(e) => setPerbidangYear(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                >
                  <option value="">Semua tahun</option>
                  {(sheetData.years || []).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div
            ref={tableScrollRef}
            className="admin-table-scroll"
            style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}
          >
            {loadingSheet ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Memuat data...
              </div>
            ) : !sheetData ||
              sheetData.rows.length ===
                0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="mb-1">
                  Belum ada data di
                  sheet ini.
                </p>

                <p className="text-xs text-slate-600 mb-4">
                  {activeSheet ===
                  'MASTER KOMPONEN'
                    ? 'Isi MASTER KOMPONEN dulu agar form Anggaran bisa menampilkan komponen otomatis.'
                    : activeSheet ===
                      'DETAIL ANGGARAN'
                    ? 'Tambahkan Anggaran terlebih dahulu agar DETAIL ANGGARAN terbentuk otomatis.'
                    : 'Gunakan tombol Tambah untuk menambah data pertama.'}
                </p>

                {activeSheet === 'JADWAL MINGGUAN' ? (
                    <Button
                      size="sm"
                      onClick={() => setShowJadwalEditor(true)}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Update Jadwal
                    </Button>
                  ) : activeSheet === 'ORGANISASI' ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const headers = DEFAULT_HEADERS['ORGANISASI'] || ['TOP', 'NYATA', 'KURANG'];
                        const empty: Record<string, string> = { id: '' };
                        headers.forEach((h) => { empty[h] = ''; });
                        setEditingRow(empty);
                        setIsNew(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Isi Data Organisasi
                    </Button>
                  ) : activeSheet === 'KET PERS' ? (
                    <Button
                      size="sm"
                      onClick={() => setShowKekuatanPersonelForm(true)}
                      className="bg-blue-600 hover:bg-blue-500"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit Kekuatan Personel
                    </Button>
                  ) : activeSheet !== 'REALISASI' &&
                    activeSheet !== 'ANGGARAN' &&
                    activeSheet !== 'DETAIL ANGGARAN' &&
                    activeSheet !== 'ANGGARAN PERBIDANG' ? (
                    <Button
                      size="sm"
                      onClick={openNew}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Tambah Data Pertama
                    </Button>
                  ) : null}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950">
                  <tr className="border-b border-white/10 text-left">
                    {activeSheet !== 'ANGGARAN PERBIDANG' && activeSheet !== 'KET PERS' && (
                      <th className="px-3 py-3 w-10 bg-slate-950">
                        <input
                          type="checkbox"
                          checked={
                            visibleRows.length > 0 &&
                            visibleRows.every((r) => selectedIds.includes(r.id))
                          }
                          onChange={toggleSelectAllVisible}
                          className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                          title="Pilih semua"
                        />
                      </th>
                    )}
                    {visibleHeaders
                      .filter((h, hi) => {
                        if (activeSheet === 'ORGANISASI')
                          return !ORGANIZATION_TOTAL_HEADERS.has(h.toUpperCase());
                        if (activeSheet === 'JADWAL MINGGUAN')
                          return !JADWAL_HIDDEN_COL_INDICES.has(hi);
                        return true;
                      })
                      .map(
                      (h, hi) => (
                        <th
                          key={`th-${hi}-${h}`}
                          className="px-4 py-3 text-emerald-400 font-semibold whitespace-nowrap bg-slate-950"
                        >
                          {h || `Kolom ${hi + 1}`}
                        </th>
                      )
                    )}

                    {activeSheet ===
                      'ANGGARAN' && (
                      <>
                        <th className="px-4 py-3 text-blue-400 font-semibold whitespace-nowrap bg-slate-950">
                          TOTAL REALISASI
                        </th>

                        <th className="px-4 py-3 text-amber-400 font-semibold whitespace-nowrap bg-slate-950">
                          SISA PAGU
                        </th>
                      </>
                    )}

                    {activeSheet !== 'ANGGARAN PERBIDANG' && activeSheet !== 'KET PERS' && (
                      <th className="px-4 py-3 text-emerald-400 font-semibold w-24 bg-slate-950">Aksi</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map(
                    (row) => {
                      const totalRealisasi =
                        activeSheet ===
                        'ANGGARAN'
                          ? getRealizationTotal(
                              realisasiRows,
                              row[
                                'ID ANGGARAN'
                              ]
                            )
                          : 0;

                      const totalPagu =
                        toNumber(
                          row[
                            'TOTAL PAGU'
                          ]
                        );

                      const sisaPagu =
                        Math.max(
                          0,
                          totalPagu -
                            totalRealisasi
                        );

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-white/5 hover:bg-white/[0.02]"
                        >
                          {activeSheet !== 'ANGGARAN PERBIDANG' && activeSheet !== 'KET PERS' && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(row.id)}
                                onChange={() => toggleSelectId(row.id)}
                                className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                              />
                            </td>
                          )}
                          {visibleHeaders
                            .filter((h, hi) => {
                              if (activeSheet === 'ORGANISASI')
                                return !ORGANIZATION_TOTAL_HEADERS.has(h.toUpperCase());
                              if (activeSheet === 'JADWAL MINGGUAN')
                                return !JADWAL_HIDDEN_COL_INDICES.has(hi);
                              return true;
                            })
                            .map(
                            (h, hi) => (
                              <td
                                key={`td-${hi}-${h}`}
                                className="px-4 py-3 text-slate-300 max-w-[220px] truncate"
                                title={
                                  row[h]
                                }
                              >
                                {['link', 'url', 'tautan'].includes(h.trim().toLowerCase()) && row[h] ? (
                                  <a
                                    href={getDrivePreviewUrl(row[h])}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-emerald-400 hover:text-emerald-300"
                                    title="Buka dokumen"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </a>
                                ) : ((h.includes('PAGU') || h.includes('REALISASI') || h === 'ANGGARAN/PELAKSANAAN' || h === 'TOTAL PAGU' || h === 'NILAI REALISASI') && row[h]
                                  ? formatRupiah(row[h])
                                  : row[h] || '—')}
                              </td>
                            )
                          )}

                          {activeSheet ===
                            'ANGGARAN' && (
                            <>
                              <td className="px-4 py-3 text-blue-300 font-semibold whitespace-nowrap">
                                {formatRupiahZero(
                                  totalRealisasi
                                )}
                              </td>

                              <td
                                className={`px-4 py-3 font-bold whitespace-nowrap ${
                                  sisaPagu >
                                  0
                                    ? 'text-amber-300'
                                    : 'text-red-400'
                                }`}
                              >
                                {formatRupiahZero(
                                  sisaPagu
                                )}
                              </td>
                            </>
                          )}

                          {activeSheet !== 'ANGGARAN PERBIDANG' && activeSheet !== 'KET PERS' && (
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openEdit(row)}
                                  className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            )}
          </div>

          {sheetData &&
            sheetData.rows.length >
              0 && (
              <div className="px-6 py-3 border-t border-white/10 text-xs text-slate-500">
                Menampilkan {visibleRows.length} dari {sheetData.rows.length} baris
              </div>
            )}
        </div>
      </div>

      {/* GENERIC MODAL */}

      {editingRow &&
        activeSheet !==
          'ANGGARAN PERBIDANG' &&
        activeSheet !==
          'KET PERS' &&
        activeSheet !==
          'JADWAL MINGGUAN' && (
          <ModalWrapper
            title={`${isNew ? 'Tambah' : 'Edit'} Data — ${
              currentMeta?.label
            }`}
            onClose={() =>
              setEditingRow(null)
            }
          >
            <div className="px-6 py-5 space-y-4">
              {formHeaders.length === 0 && (
                <p className="text-sm text-amber-300">
                  Header sheet kosong. Tutup modal, pastikan sheet ada di Google Sheet, lalu coba lagi.
                </p>
              )}
              {formHeaders.map(
                (h, hi) => (
                  ((activeSheet !== 'DOKUMEN' && activeSheet !== 'GALERI') ||
                    (activeSheet === 'DOKUMEN' && (h === 'Judul' || h === 'Tipe')) ||
                    (activeSheet === 'GALERI' && h !== 'URL FOTO')) && (
                  <div key={`fh-${hi}-${h}`}>
                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">
                      {h}
                    </label>

                    {activeSheet === 'DOKUMEN' && h === 'Tipe' ? (
                      <SelectInput
                        value={editingRow[h] || ''}
                        onChange={(value) => setEditingRow({ ...editingRow, [h]: value })}
                        options={DOCUMENT_TYPE_OPTIONS}
                        placeholder="-- Pilih Tipe --"
                      />
                    ) : (
                      <textarea
                        value={editingRow[h] || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, [h]: e.target.value })}
                        rows={['ulasan', 'deskripsi', 'sejarah', 'tugas', 'isi'].some((k) => h.toLowerCase().includes(k)) ? 3 : 1}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y"
                      />
                    )}
                  </div>)
                )
              )}

              {showUpload && (
                <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
                  <label className="text-xs text-emerald-400 font-semibold mb-2 block">Upload File ke Drive</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                      {uploading ? 'Mengupload...' : 'Pilih File'}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept={activeSheet === 'GALERI' ? 'image/*' : '.pdf'}
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <span className="text-xs text-slate-500">
                      {activeSheet === 'GALERI' ? 'Foto' : 'PDF'}
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-2">File masuk ke Drive dan link otomatis tersimpan saat disimpan.</p>
                  {pendingFile && (
                    <p className="text-xs text-emerald-300 mt-2 truncate">File dipilih: {pendingFile.name}</p>
                  )}
                </div>
              )}
            </div>

            <ModalFooter
              onCancel={() =>
                setEditingRow(null)
              }
              onSave={handleSave}
              saving={saving}
              label="Simpan"
            />
          </ModalWrapper>
        )}

      {/* FORM ANGGARAN */}

      {showKekuatanPersonelForm && activeSheet === 'KET PERS' && (
        <KekuatanPersonelEditor
          rows={sheetData?.rows || []}
          getHeaders={getHeaders}
          onClose={() => setShowKekuatanPersonelForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'KET PERS'] });
          }}
        />
      )}

      {showAngForm && (
        <FormAnggaran
          onClose={() =>
            setShowAngForm(false)
          }
          getHeaders={getHeaders}
          onSuccess={
            invalidateAnggaran
          }
        />
      )}

      {showJadwalEditor && (
        <JadwalMingguanEditor
          getHeaders={getHeaders}
          onClose={() => setShowJadwalEditor(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-sheet', 'JADWAL MINGGUAN'] });
          }}
        />
      )}

      {/* FORM ATUR PAGU KOMPONEN */}

      {showDetailBudgetForm &&
        detailRows.length > 0 && (
          <DetailAnggaranEditor
            detailRows={
              detailRows
            }
            realisasiRows={
              realisasiRows
            }
              anggaranRows={
                anggaranRows
              }
            getHeaders={
              getHeaders
            }
            onClose={() =>
              setShowDetailBudgetForm(
                false
              )
            }
            onSuccess={
              invalidateDetail
            }
          />
        )}

      {/* FORM REALISASI */}

      {showRelForm && (
        <FormRealisasi
          onClose={() =>
            setShowRelForm(false)
          }
          getHeaders={getHeaders}
          onSuccess={
            invalidateRealisasi
          }
        />
      )}

      {/* PASSWORD */}

      {showPasswordForm && (
        <ModalWrapper
          title="Ubah Password Admin"
          onClose={() =>
            setShowPasswordForm(
              false
            )
          }
        >
          <form
            onSubmit={
              handleChangePassword
            }
            className="px-6 py-5 space-y-4"
          >
            {[
              {
                label:
                  'Password Saat Ini',
                key: 'current' as const,
              },
              {
                label:
                  'Password Baru',
                key: 'next' as const,
              },
              {
                label:
                  'Konfirmasi Password Baru',
                key: 'confirm' as const,
              },
            ].map(
              ({
                label,
                key,
              }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 font-semibold mb-1.5 block">
                    {label}
                  </label>

                  <input
                    type="password"
                    value={
                      pwForm[
                        key
                      ]
                    }
                    onChange={(e) =>
                      setPwForm(
                        {
                          ...pwForm,
                          [key]:
                            e.target
                              .value,
                        }
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    required
                    minLength={
                      key !==
                      'current'
                        ? 6
                        : undefined
                    }
                  />
                </div>
              )
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setShowPasswordForm(
                    false
                  )
                }
                className="border-white/10"
              >
                Batal
              </Button>

              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Settings className="w-4 h-4 mr-2" />
                Simpan Password
              </Button>
            </div>
          </form>
        </ModalWrapper>
      )}
    </main>
  );
}