/** Daftar sheet yang dikelola admin — aman diimpor di client component */

export const MANAGED_SHEETS = [
  { id: 'ULASAN',                 label: 'Ulasan',              description: 'Testimoni / ulasan pengunjung' },
  { id: 'DOKUMEN',                label: 'Dokumen',             description: 'Doktrin, Bujuk, Protap' },
  { id: 'ANGGARAN',               label: 'Anggaran',            description: 'Data master kegiatan anggaran' },
  { id: 'DETAIL ANGGARAN',        label: 'Detail Anggaran',     description: 'Rincian komponen pagu per kegiatan' },
  { id: 'REALISASI',              label: 'Realisasi',           description: 'Transaksi realisasi bulanan' },
  { id: 'ANGGARAN PERBIDANG',     label: 'Anggaran Perbidang',  description: 'Rekap otomatis per bidang' },
  { id: 'MASTER KOMPONEN',        label: 'Master Komponen',     description: 'Daftar komponen per bidang/jenis' },
  { id: 'PROFIL',                 label: 'Profil',              description: 'Tugas pokok & profil satuan' },
  { id: 'SEJARAH SATUAN',         label: 'Sejarah Satuan',      description: 'Sejarah & pejabat danyonkes' },
  { id: 'ORGANISASI',             label: 'Organisasi',          description: 'Struktur & pejabat' },
  { id: 'KET PERS',               label: 'Kekuatan Personel',   description: 'PA / BA / TA' },
  { id: 'JADWAL MINGGUAN',        label: 'Jadwal Mingguan',     description: 'Jadwal kegiatan mingguan' },
  { id: 'KALENDER LATIHAN',       label: 'Kalender Latihan',    description: 'Kegiatan latihan' },
  { id: 'KALENDER LIBUR NASIONAL',label: 'Libur Nasional',      description: 'Tanggal libur' },
  { id: 'KONTAK',                 label: 'Kontak',              description: 'Telepon, email, WA, alamat' },
  { id: 'GALERI',                 label: 'Galeri',              description: 'Foto & video' },
  { id: 'SETTINGS',               label: 'Pengaturan',          description: 'Password admin & setting lain' },
] as const;

export type SheetId = (typeof MANAGED_SHEETS)[number]['id'];