'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';

import {
  fetchSheetData,
  valuesToObjects,
} from '@/lib/googleSheets';

function sheetField(row: Record<string, any>, ...names: string[]) {
  for (const name of names) {
    const entry = Object.entries(row).find(
      ([key]) => key.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (entry && entry[1] !== undefined && entry[1] !== '') return entry[1];
  }
  return '';
}

function getMonthName(month: string) {
  const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const normalized = month.trim().toLowerCase();
  const numericMonth = Number(normalized);
  const index = Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12
    ? numericMonth - 1
    : months.indexOf(normalized);
  return index < 0 ? '' : months[index].charAt(0).toUpperCase() + months[index].slice(1);
}

function getQuarter(month: string) {
  const normalizedMonth = getMonthName(month).toLowerCase();
  const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const romanQuarters = ['I', 'II', 'III', 'IV'];
  const index = months.indexOf(normalizedMonth);
  return index < 0 ? '' : `TW ${romanQuarters[Math.floor(index / 3)]}`;
}

function getMonthNumber(month: string) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months.indexOf(getMonthName(month)) + 1;
}

function normalizeQuarter(value: string, month: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = normalized.match(/^TW\s*(I{1,3}|IV|[1-4])$/);
  if (!match) return getQuarter(month);
  const quarterNumber = ['I', 'II', 'III', 'IV'].indexOf(match[1]) >= 0
    ? ['I', 'II', 'III', 'IV'].indexOf(match[1])
    : Number(match[1]) - 1;
  return quarterNumber >= 0 && quarterNumber < 4 ? `TW ${['I', 'II', 'III', 'IV'][quarterNumber]}` : getQuarter(month);
}

const COLORS = [
  '#34d399', // emerald
  '#fbbf24', // amber
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#fb7185', // rose
  '#2dd4bf', // teal
  '#f97316', // orange
  '#818cf8', // indigo
];

const CHART = {
  rpd: '#fbbf24',
  realisasi: '#34d399',
  sisa: '#fb7185',
  grid: '#1e293b',
  axis: '#94a3b8',
};

function cleanCurrency(value: string) {
  if (!value) return 0;

  return (
    Number(
      value
        .toString()
        .replace(/Rp\./g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/-/g, '0')
    ) || 0
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }
  ).format(value);
}

export default function AnggaranPage() {

  /* ====================================
      FILTER
  ==================================== */

  const currentYear = new Date().getFullYear().toString();
  const previousYear = (new Date().getFullYear() - 1).toString();

  // Default filter tahun = tahun sekarang (otomatis mengikuti pergantian tahun)
  const [tahun, setTahun] =
    useState(currentYear);

  const [semester, setSemester] =
    useState('Semua');

  const [triwulan, setTriwulan] =
    useState('Semua');

  const [bulan, setBulan] =
    useState('Semua');

  const [bidangFilter, setBidangFilter] =
    useState('Semua');

  const [kegiatanFilter, setKegiatanFilter] =
    useState('Semua');

  /* ====================================
      QUERY
  ==================================== */

  const {
    data: bidang = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['anggaran-bidang'],
    queryFn: async () => {
      const values =
        await fetchSheetData(
          'ANGGARAN PERBIDANG'
        );

      return valuesToObjects<any>(values).map((item) => ({
        ...item,
        Bidang: sheetField(item, 'BIDANG', 'Bidang'),
        'Total Realisasi': sheetField(item, 'TOTAL REALISASI', 'Total Realisasi'),
      }));
    },
  });

  const {
    data: kegiatan = [],
  } = useQuery({
    queryKey: ['anggaran'],
    queryFn: async () => {
      const values =
        await fetchSheetData(
          'ANGGARAN'
        );

      return valuesToObjects<any>(values).map((item) => ({
        ...item,
        Tahun: sheetField(item, 'TAHUN', 'Tahun'),
        Bidang: sheetField(item, 'BIDANG', 'Bidang'),
        Kegiatan: sheetField(item, 'NAMA KEGIATAN', 'KEGIATAN', 'Kegiatan'),
        'Total Pagu': sheetField(item, 'TOTAL PAGU', 'Total Pagu'),
      }));
    },
  });

  const {
    data: detailMaster = [],
  } = useQuery({
    queryKey: ['detail-anggaran-master'],
    queryFn: async () => {
      const detailValues = await fetchSheetData('DETAIL ANGGARAN');
      return valuesToObjects<any>(detailValues).map((item) => {
        const bulanRpd = sheetField(item, 'BULAN RPD', 'Bulan RPD');
        const komponen = sheetField(item, 'KOMPONEN', 'Komponen');
        const kegiatan = sheetField(item, 'KEGIATAN', 'Kegiatan');
        return {
          ...item,
          'ID DETAIL': sheetField(item, 'ID DETAIL'),
          'ID ANGGARAN': sheetField(item, 'ID ANGGARAN'),
          Tahun: sheetField(item, 'TAHUN', 'Tahun'),
          Bidang: sheetField(item, 'BIDANG', 'Bidang'),
          Kegiatan: kegiatan,
          Komponen: komponen,
          Pelaksanaan: sheetField(item, 'PELAKSANAAN', 'Pelaksanaan'),
          'Pagu Komponen': sheetField(item, 'PAGU KOMPONEN', 'Pagu Komponen'),
          BulanRpd: getMonthName(bulanRpd),
          BulanRpdKe: getMonthNumber(bulanRpd),
          PeriodeRpd: getQuarter(bulanRpd),
          LabelKegiatan: [komponen, kegiatan].filter(Boolean).join(' ').trim() || kegiatan || '-',
        };
      });
    },
  });

  const {
    data: detail = [],
  } = useQuery({
    queryKey: ['detail-anggaran'],
    queryFn: async () => {
      const [detailValues, realisasiValues] = await Promise.all([
        fetchSheetData('DETAIL ANGGARAN'),
        fetchSheetData('REALISASI'),
      ]);
      const details = valuesToObjects<any>(detailValues);
      const detailById = new Map(
        details.map((item) => [sheetField(item, 'ID DETAIL'), item])
      );
      return valuesToObjects<any>(realisasiValues).map((item) => {
        const detailRow = detailById.get(sheetField(item, 'ID DETAIL')) || {};
        const bulanValue = sheetField(item, 'BULAN', 'Bulan');
        const komponen =
          sheetField(item, 'KOMPONEN', 'Komponen') ||
          sheetField(detailRow, 'KOMPONEN', 'Komponen');
        const kegiatan =
          sheetField(item, 'KEGIATAN', 'Kegiatan') ||
          sheetField(detailRow, 'KEGIATAN', 'Kegiatan');
        const bulanRpd = sheetField(detailRow, 'BULAN RPD', 'Bulan RPD');
        return {
          ...item,
          Tahun: sheetField(item, 'TAHUN', 'Tahun'),
          Bidang:
            sheetField(item, 'BIDANG', 'Bidang') ||
            sheetField(detailRow, 'BIDANG', 'Bidang'),
          Kegiatan: kegiatan,
          Komponen: komponen,
          LabelKegiatan: [komponen, kegiatan].filter(Boolean).join(' ').trim() || kegiatan || '-',
          Bulan: getMonthName(bulanValue),
          Periode: normalizeQuarter(sheetField(item, 'PERIODE', 'Periode'), bulanValue),
          BulanKe: getMonthNumber(bulanValue),
          BulanRpd: getMonthName(bulanRpd),
          'Pagu Komponen': sheetField(detailRow, 'PAGU KOMPONEN', 'Pagu Komponen'),
          'Total Realisasi': sheetField(item, 'NILAI REALISASI', 'Total Realisasi'),
          'ID DETAIL': sheetField(item, 'ID DETAIL'),
          'ID ANGGARAN': sheetField(item, 'ID ANGGARAN'),
        };
      });
    },
  });

/* ====================================
    OPTION FILTER
==================================== */

const tahunList = [
  'Semua',
  ...new Set(
    kegiatan
      .map((item: any) => item.Tahun)
      .filter(Boolean)
  ),
];

const bidangList = [
  'Semua',
  ...new Set(
    kegiatan
      .map((item: any) => item.Bidang)
      .filter(Boolean)
  ),
];

const kegiatanList = [
  'Semua',
  ...new Set(
    kegiatan
      .map((item: any) => item.Kegiatan)
      .filter(Boolean)
  ),
];

const bulanList = [
  'Semua',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/* ====================================
    FILTER DATA DETAIL
==================================== */

const filteredDetail = useMemo(() => {
  return detail.filter(
    (item: any) => {

      const tahunMatch =
        tahun === 'Semua' ||
        item.Tahun === tahun;

      const bidangMatch =
        bidangFilter === 'Semua' ||
        item.Bidang === bidangFilter;

      const kegiatanMatch =
        kegiatanFilter === 'Semua' ||
        item.Kegiatan === kegiatanFilter;

      const bulanMatch =
        bulan === 'Semua' ||
        item.Bulan?.toLowerCase() === bulan.toLowerCase();

      const quarterNumber = item.BulanKe > 0 ? Math.ceil(item.BulanKe / 3) : 0;
      const triwulanMatch =
        triwulan === 'Semua' ||
        quarterNumber === ['TW I', 'TW II', 'TW III', 'TW IV'].indexOf(triwulan) + 1;

      const semesterData =
        item.BulanKe >= 1 && item.BulanKe <= 6
          ? 'Semester I'
          : item.BulanKe >= 7 && item.BulanKe <= 12
            ? 'Semester II'
            : '';

      const semesterMatch =
        semester === 'Semua' ||
        semesterData === semester;

      return (
        tahunMatch &&
        bidangMatch &&
        kegiatanMatch &&
        bulanMatch &&
        triwulanMatch &&
        semesterMatch
      );
    }
  );
}, [detail, tahun, bidangFilter, kegiatanFilter, bulan, triwulan, semester]);

/* ====================================
    FILTER DETAIL MASTER (RPD / PAGU RENCANA)
==================================== */

const filteredDetailMaster = useMemo(() => {
  return detailMaster.filter((item: any) => {
    const tahunMatch = tahun === 'Semua' || item.Tahun === tahun;
    const bidangMatch = bidangFilter === 'Semua' || item.Bidang === bidangFilter;
    const kegiatanMatch = kegiatanFilter === 'Semua' || item.Kegiatan === kegiatanFilter;

    const bulanMatch =
      bulan === 'Semua' ||
      item.BulanRpd?.toLowerCase() === bulan.toLowerCase();

    const quarterNumber = item.BulanRpdKe > 0 ? Math.ceil(item.BulanRpdKe / 3) : 0;
    const triwulanMatch =
      triwulan === 'Semua' ||
      quarterNumber === ['TW I', 'TW II', 'TW III', 'TW IV'].indexOf(triwulan) + 1;

    const semesterData =
      item.BulanRpdKe >= 1 && item.BulanRpdKe <= 6
        ? 'Semester I'
        : item.BulanRpdKe >= 7 && item.BulanRpdKe <= 12
          ? 'Semester II'
          : '';

    const semesterMatch = semester === 'Semua' || semesterData === semester;

    return (
      tahunMatch &&
      bidangMatch &&
      kegiatanMatch &&
      bulanMatch &&
      triwulanMatch &&
      semesterMatch
    );
  });
}, [detailMaster, tahun, bidangFilter, kegiatanFilter, bulan, triwulan, semester]);

const totalPaguRpd = useMemo(() => {
  return filteredDetailMaster.reduce(
    (acc: number, item: any) => acc + cleanCurrency(item['Pagu Komponen']),
    0
  );
}, [filteredDetailMaster]);

/* ====================================
    DATA FILTERED PAGU (Master Kegiatan)
==================================== */

const kegiatanFiltered = useMemo(() => {
  const periodFilterActive =
    bulan !== 'Semua' || triwulan !== 'Semua' || semester !== 'Semua';

  return kegiatan.filter((item: any) => {
    const baseMatch =
      (tahun === 'Semua' || item.Tahun === tahun) &&
      (bidangFilter === 'Semua' || item.Bidang === bidangFilter) &&
      (kegiatanFilter === 'Semua' || item.Kegiatan === kegiatanFilter);

    if (!baseMatch || !periodFilterActive) return baseMatch;

    return filteredDetail.some(
      (realization: any) => realization['ID ANGGARAN'] === item['ID ANGGARAN']
    );
  });
}, [kegiatan, filteredDetail, tahun, bidangFilter, kegiatanFilter, bulan, triwulan, semester]);

/* ====================================
    PAGU FILTERED
==================================== */

const totalPaguFiltered = kegiatanFiltered.reduce(
  (acc: number, item: any) => acc + cleanCurrency(item['Total Pagu']),
  0
);

/* ====================================
    SUMMARY
==================================== */

const totalRealisasi = useMemo(() => {
  return filteredDetail.reduce(
    (acc: number, item: any) => acc + cleanCurrency(item['Total Realisasi']),
    0
  );
}, [filteredDetail]);

// Total pagu kegiatan memakai agregasi PAGU KOMPONEN by Bulan RPD (bukan TOTAL PAGU master)
const totalSisaFiltered = totalPaguRpd - totalRealisasi;

const persenFiltered =
  totalPaguRpd > 0
    ? ((totalRealisasi / totalPaguRpd) * 100).toFixed(2)
    : '0';

/* ====================================
    PIE CHART
==================================== */

const pieData = useMemo(() => {
  const realizationByBudget = new Map<string, number>();
  for (const item of filteredDetail) {
    const id = item['ID ANGGARAN'];
    if (id) {
      realizationByBudget.set(
        id,
        (realizationByBudget.get(id) || 0) + cleanCurrency(item['Total Realisasi'])
      );
    }
  }

  const byField = new Map<string, number>();
  for (const item of kegiatanFiltered) {
    const name = item.Bidang;
    if (!name) continue;
    byField.set(
      name,
      (byField.get(name) || 0) + (realizationByBudget.get(item['ID ANGGARAN']) || 0)
    );
  }

  return Array.from(byField, ([name, value]) => ({ name, value }));
}, [filteredDetail, kegiatanFiltered]);

const displayedPieData = pieData;

  /* ====================================
      TOP 10 PAGU
  ==================================== */

  const barData =
    [...kegiatanFiltered]
      .sort(
        (
          a: any,
          b: any
        ) =>
          cleanCurrency(
            b['Total Pagu']
          ) -
          cleanCurrency(
            a['Total Pagu']
          )
      )
      .slice(0, 10)
      .map(
        (item: any) => ({
          kegiatan:
            item.Kegiatan,
          pagu:
            cleanCurrency(
              item[
                'Total Pagu'
              ]
            ),
        })
      );
  /* ====================================
      REALISASI BULANAN
  ==================================== */

  const bulanUrut = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const bulananData =
    bulanUrut.map((namaBulan) => {
      const realisasi = filteredDetail
        .filter((item: any) => item.Bulan === namaBulan)
        .reduce(
          (sum: number, item: any) =>
            sum + cleanCurrency(item['Total Realisasi']),
          0
        );
      const rpd = filteredDetailMaster
        .filter((item: any) => item.BulanRpd === namaBulan)
        .reduce(
          (sum: number, item: any) =>
            sum + cleanCurrency(item['Pagu Komponen']),
          0
        );
      return { bulan: namaBulan, realisasi, rpd };
    }).filter((item) => {
      if (bulan !== 'Semua') return item.bulan === bulan;
      const monthNumber = getMonthNumber(item.bulan);
      if (semester === 'Semester I') return monthNumber <= 6;
      if (semester === 'Semester II') return monthNumber >= 7;
      if (triwulan !== 'Semua') {
        const quarter = ['TW I', 'TW II', 'TW III', 'TW IV'].indexOf(triwulan) + 1;
        return Math.ceil(monthNumber / 3) === quarter;
      }
      return true;
    });

  /* ====================================
      REALISASI TRIWULAN
  ==================================== */

  const triwulanData = [
    'TW I',
    'TW II',
    'TW III',
    'TW IV',
  ].map((tw) => {
    const realisasi = filteredDetail
      .filter((item: any) => item.Periode === tw)
      .reduce(
        (sum: number, item: any) =>
          sum + cleanCurrency(item['Total Realisasi']),
        0
      );
    const rpd = filteredDetailMaster
      .filter((item: any) => item.PeriodeRpd === tw)
      .reduce(
        (sum: number, item: any) =>
          sum + cleanCurrency(item['Pagu Komponen']),
        0
      );
    return { triwulan: tw, realisasi, rpd };
  }).filter((item) => {
    if (triwulan !== 'Semua') return item.triwulan === triwulan;
    if (semester === 'Semester I') return ['TW I', 'TW II'].includes(item.triwulan);
    if (semester === 'Semester II') return ['TW III', 'TW IV'].includes(item.triwulan);
    return true;
  });

  /* ====================================
      REALISASI SEMESTER
  ==================================== */

  const semesterData = [
    {
      semester: 'Semester I',
      realisasi: filteredDetail
        .filter(
          (item: any) =>
            item.Periode === 'TW I' || item.Periode === 'TW II'
        )
        .reduce(
          (sum: number, item: any) =>
            sum + cleanCurrency(item['Total Realisasi']),
          0
        ),
      rpd: filteredDetailMaster
        .filter(
          (item: any) =>
            item.PeriodeRpd === 'TW I' || item.PeriodeRpd === 'TW II'
        )
        .reduce(
          (sum: number, item: any) =>
            sum + cleanCurrency(item['Pagu Komponen']),
          0
        ),
    },
    {
      semester: 'Semester II',
      realisasi: filteredDetail
        .filter(
          (item: any) =>
            item.Periode === 'TW III' || item.Periode === 'TW IV'
        )
        .reduce(
          (sum: number, item: any) =>
            sum + cleanCurrency(item['Total Realisasi']),
          0
        ),
      rpd: filteredDetailMaster
        .filter(
          (item: any) =>
            item.PeriodeRpd === 'TW III' || item.PeriodeRpd === 'TW IV'
        )
        .reduce(
          (sum: number, item: any) =>
            sum + cleanCurrency(item['Pagu Komponen']),
          0
        ),
    },
  ].filter((item) => {
    if (semester !== 'Semua') return item.semester === semester;
    if (triwulan === 'TW I' || triwulan === 'TW II') return item.semester === 'Semester I';
    if (triwulan === 'TW III' || triwulan === 'TW IV') return item.semester === 'Semester II';
    if (bulan !== 'Semua')
      return getMonthNumber(bulan) <= 6
        ? item.semester === 'Semester I'
        : item.semester === 'Semester II';
    return true;
  });

  /* ====================================
      TABEL DETAIL
  ==================================== */
  const detailTable = useMemo(() => {
    const targetYear = tahun === 'Semua' ? '' : tahun;

    // Realisasi aktual (per baris realisasi)
    const realizedData = filteredDetail
      .filter((item: any) => !targetYear || item.Tahun === targetYear)
      .map((item: any) => ({
        kegiatan: item.LabelKegiatan || item.Kegiatan,
        komponen: item.Komponen || '',
        bidang: item.Bidang,
        periode: item.Periode,
        bulanRpd: item.BulanRpd || '-',
        bulan: item.Bulan,
        tahun: item.Tahun,
        paguRencana: cleanCurrency(item['Pagu Komponen']),
        realisasi: cleanCurrency(item['Total Realisasi']),
      }));

    // Detail RPD yang belum ada realisasi di filter ini
    const realizedDetailIds = new Set(
      filteredDetail.map((item: any) => item['ID DETAIL']).filter(Boolean)
    );
    const unrealizedData = filteredDetailMaster
      .filter((item: any) => {
        if (targetYear && item.Tahun !== targetYear) return false;
        return !realizedDetailIds.has(item['ID DETAIL']);
      })
      .map((item: any) => ({
        kegiatan: item.LabelKegiatan || item.Kegiatan,
        komponen: item.Komponen || '',
        bidang: item.Bidang,
        periode: item.PeriodeRpd || '-',
        bulanRpd: item.BulanRpd || '-',
        bulan: '-',
        tahun: item.Tahun || currentYear,
        paguRencana: cleanCurrency(item['Pagu Komponen']),
        realisasi: 0,
      }));

    return [...realizedData, ...unrealizedData].sort(
      (a, b) => b.realisasi - a.realisasi || b.paguRencana - a.paguRencana
    );
  }, [filteredDetail, filteredDetailMaster, tahun, currentYear]);

  /* ====================================
      CARD SUMMARY TAMBAHAN
  ==================================== */

  const jumlahKegiatan = useMemo(() => {
    return new Set(
      kegiatanFiltered
        .map((item: any) => item.Kegiatan)
        .filter(Boolean)
    ).size;
  }, [kegiatanFiltered]);

  const jumlahBidang =
    new Set(
      kegiatanFiltered.map(
        (item: any) =>
          item.Bidang
      )
    ).size;

  const realisasiTertinggi =
    bulananData.reduce(
      (
        max: any,
        item: any
      ) =>
        item.realisasi >
        max.realisasi
          ? item
          : max,
      {
        bulan: '-',
        realisasi: 0,
      }
    );

  /* ====================================
      EXPORT DATA
  ==================================== */

  const exportRows =
    detailTable.map(
      (item) => ({
        Kegiatan: item.kegiatan,
        Bidang: item.bidang,
        Periode: item.periode,
        'Bulan RPD': item.bulanRpd,
        'Bulan Realisasi': item.bulan,
        Tahun: item.tahun,
        'Pagu Rencana': item.paguRencana,
        Realisasi: item.realisasi,
      })
    );

  /* ====================================
      CHART HEIGHT
  ==================================== */

  const chartHeight = 350;
return (
  <div className="min-h-screen military-gradient px-4 sm:px-6 pt-24 pb-20 w-full">

    <div className="w-full px-0">

      <h1 className="text-5xl font-black text-center mb-10 bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
        DASHBOARD ANGGARAN
      </h1>

      {/* FILTER */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-4 text-center">
          Filter Data
        </h2>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-4">

          <select
            className="bg-slate-900 border border-slate-700 rounded-xl p-3"
            value={tahun}
            onChange={(e) =>
              setTahun(
                e.target.value
              )
            }
          >
            <option value="Semua">Tahun</option>
            {tahunList
              .filter((item) => item !== 'Semua')
              .map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
          </select>

          <select
            className="bg-slate-900 border border-slate-700 rounded-xl p-3"
            value={semester}
            onChange={(e) =>
              (() => {
                setSemester(e.target.value);
                setTriwulan('Semua');
                setBulan('Semua');
              })()
            }
          >
            <option value="Semua">Semester</option>
            <option value="Semester I">Semester I</option>
            <option value="Semester II">Semester II</option>

          </select>

          <select
            className="bg-slate-900 border border-slate-700 rounded-xl p-3"
            value={triwulan}
            onChange={(e) =>
              (() => {
                setTriwulan(e.target.value);
                setSemester('Semua');
                setBulan('Semua');
              })()
            }
          >
            <option value="Semua">Triwulan</option>
            <option value="TW I">TW I</option>
            <option value="TW II">TW II</option>
            <option value="TW III">TW III</option>
            <option value="TW IV">TW IV</option>

          </select>

          <select
            className="bg-slate-900 border border-slate-700 rounded-xl p-3"
            value={bulan}
            onChange={(e) =>
              (() => {
                setBulan(e.target.value);
                setSemester('Semua');
                setTriwulan('Semua');
              })()
            }
          >
            <option value="Semua">Bulan</option>
            {bulanList
              .filter((item) => item !== 'Semua')
              .map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
          </select>

          <select
            className="bg-slate-900 border border-slate-700 rounded-xl p-3"
            value={
              bidangFilter
            }
            onChange={(e) =>
              setBidangFilter(
                e.target.value
              )
            }
          >
            <option value="Semua">Bidang</option>
            {bidangList
              .filter((item) => item !== 'Semua')
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>

          <select
            className="bg-slate-900 border border-slate-700 rounded-xl p-3"
            value={
              kegiatanFilter
            }
            onChange={(e) =>
              setKegiatanFilter(
                e.target.value
              )
            }
          >
            <option value="Semua">Kegiatan</option>
            {kegiatanList
              .filter((item) => item !== 'Semua')
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>

        </div>

      </div>

      {/* SUMMARY */}

      <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-6 mb-10">

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-slate-400">
            Total Pagu Kegiatan
          </div>

          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {formatRupiah(totalPaguRpd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Σ PAGU KOMPONEN by Bulan RPD
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="text-slate-400">
            Total Realisasi
          </div>

          <div className="text-2xl font-bold text-sky-400 mt-2">
            {formatRupiah(
              totalRealisasi
            )}
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="text-slate-400">
            Sisa Anggaran
          </div>

          <div className="text-2xl font-bold text-rose-400 mt-2">
            {formatRupiah(
              totalSisaFiltered
            )}
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="text-slate-400">
            Serapan
          </div>

          <div className="text-2xl font-bold text-violet-400 mt-2">
            {persenFiltered}%
          </div>
        </motion.div>

      </div>

      <div className="grid xl:grid-cols-3 md:grid-cols-3 gap-6 mb-10">

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-slate-400">
            Jumlah Kegiatan
          </div>

          <div className="text-2xl font-bold text-cyan-400 mt-2">
            {jumlahKegiatan}
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="text-slate-400">
            Jumlah Bidang
          </div>

          <div className="text-2xl font-bold text-violet-400 mt-2">
            {jumlahBidang}
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="text-slate-400">
            Bulan Tertinggi
          </div>

          <div className="text-xl font-bold text-green-400 mt-2">
            {
              realisasiTertinggi.bulan
            }
          </div>

          <div className="text-sm text-slate-300">
            {formatRupiah(
              realisasiTertinggi.realisasi
            )}
          </div>

        </motion.div>

      </div>

      {/* DONUT + TOP 10 */}

      <div className="grid lg:grid-cols-2 gap-8 mb-10">

        <div className="glass p-6 rounded-3xl">

          <h2 className="text-xl font-bold mb-2">
            Realisasi Per Bidang
          </h2>
          <p className="text-xs text-slate-500 mb-4">Distribusi serapan aktual per bidang</p>

          <ResponsiveContainer
            width="100%"
            height={chartHeight}
          >

            <PieChart>

              <Pie
                data={displayedPieData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                cornerRadius={6}
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >

                {displayedPieData.map(
                  (
                    _,
                    index
                  ) => (
                    <Cell
                      key={index}
                      fill={
                        COLORS[
                          index %
                            COLORS.length
                        ]
                      }
                      stroke="transparent"
                    />
                  )
                )}

              </Pie>

              <Tooltip
                formatter={(
                  value
                ) =>
                  formatRupiah(
                    Number(
                      value
                    )
                  )
                }
              />
              <Legend verticalAlign="bottom" height={36} />

            </PieChart>

          </ResponsiveContainer>

        </div>

        <div className="glass p-6 rounded-3xl">

          <h2 className="text-xl font-bold mb-2">
            Top 10 Pagu Tertinggi
          </h2>
          <p className="text-xs text-slate-500 mb-4">Kegiatan dengan alokasi pagu terbesar</p>

          <ResponsiveContainer
            width="100%"
            height={chartHeight}
          >

            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              barCategoryGap="18%"
            >

              <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} horizontal={false} />

              <XAxis type="number" tick={{ fontSize: 11, fill: CHART.axis }} />

              <YAxis
                type="category"
                dataKey="kegiatan"
                width={120}
                tick={{ fontSize: 11, fill: CHART.axis }}
              />

              <Tooltip
                formatter={(
                  value
                ) =>
                  formatRupiah(
                    Number(
                      value
                    )
                  )
                }
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
              />

              <Bar
                dataKey="pagu"
                fill="url(#paguGradient)"
                radius={[0, 10, 10, 0]}
              >
                {barData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* BULANAN — RPD vs Realisasi */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-2">
          RPD vs Realisasi Bulanan
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Area = rencana penarikan (Bulan RPD) · Garis = realisasi aktual
        </p>

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >

          <ComposedChart
            data={bulananData}
            margin={{ top: 24, right: 20, left: 80, bottom: 40 }}
          >

            <defs>
              <linearGradient id="rpdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.rpd} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART.rpd} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} />

            <XAxis
              dataKey="bulan"
              tick={{ fontSize: 12, fill: CHART.axis }}
            />

            <YAxis width={80} tick={{ fontSize: 12, fill: CHART.axis }} domain={[0, 'dataMax * 1.15']} />

            <Tooltip
              formatter={(value, name) => [
                formatRupiah(Number(value)),
                name === 'rpd' ? 'Pagu RPD' : 'Realisasi',
              ]}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
            />

            <Legend />

            <Area
              type="monotone"
              dataKey="rpd"
              name="Pagu RPD"
              stroke={CHART.rpd}
              fill="url(#rpdFill)"
              strokeWidth={2}
            />

            <Line
              type="monotone"
              dataKey="realisasi"
              name="Realisasi"
              stroke={CHART.realisasi}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART.realisasi }}
              activeDot={{ r: 6 }}
            />

          </ComposedChart>

        </ResponsiveContainer>

      </div>

      {/* TRIWULAN */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-2">
          RPD vs Realisasi Per Triwulan
        </h2>
        <p className="text-xs text-slate-500 mb-4">Perbandingan rencana penarikan dan penyerapan per TW</p>

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >

          <BarChart
            data={triwulanData}
            margin={{ top: 24, right: 20, left: 80, bottom: 40 }}
            barGap={6}
            barCategoryGap="28%"
          >

            <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} />

            <XAxis
              dataKey="triwulan"
              tick={{ fontSize: 12, fill: CHART.axis }}
            />

            <YAxis width={80} tick={{ fontSize: 12, fill: CHART.axis }} />

            <Tooltip
              formatter={(value, name) => [
                formatRupiah(Number(value)),
                name === 'rpd' ? 'Pagu RPD' : 'Realisasi',
              ]}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
            />

            <Legend />

            <Bar
              dataKey="rpd"
              name="Pagu RPD"
              fill={CHART.rpd}
              radius={[10, 10, 0, 0]}
            />

            <Bar
              dataKey="realisasi"
              name="Realisasi"
              fill={CHART.realisasi}
              radius={[10, 10, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

      {/* SEMESTER */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-2">
          RPD vs Realisasi Per Semester
        </h2>
        <p className="text-xs text-slate-500 mb-4">Agregasi rencana vs realisasi semester I &amp; II</p>

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >

          <BarChart
            data={semesterData}
            margin={{ top: 24, right: 20, left: 80, bottom: 40 }}
            barGap={8}
            barCategoryGap="35%"
          >

            <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} />

            <XAxis
              dataKey="semester"
              tick={{ fontSize: 12, fill: CHART.axis }}
            />

            <YAxis width={80} tick={{ fontSize: 12, fill: CHART.axis }} />

            <Tooltip
              formatter={(value, name) => [
                formatRupiah(Number(value)),
                name === 'rpd' ? 'Pagu RPD' : 'Realisasi',
              ]}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
            />

            <Legend />

            <Bar
              dataKey="rpd"
              name="Pagu RPD"
              fill={CHART.rpd}
              radius={[12, 12, 0, 0]}
            />

            <Bar
              dataKey="realisasi"
              name="Realisasi"
              fill={CHART.realisasi}
              radius={[12, 12, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

      {/* TABEL DETAIL */}

      <div className="glass rounded-3xl p-6">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold">
            Detail Realisasi Anggaran
          </h2>

          <div className="text-sm text-slate-400">
            Total Data : {detailTable.length}
          </div>

        </div>

        <div className="overflow-auto">

          <table className="w-full min-w-[1100px]">

            <thead>

              <tr className="border-b border-slate-700 bg-slate-900/50">

                <th className="p-3 text-left">Kegiatan (Komponen + Nama)</th>

                <th className="p-3 text-left">Bidang</th>

                <th className="p-3 text-left">Periode</th>

                <th className="p-3 text-left">Bulan RPD</th>

                <th className="p-3 text-left">Bulan Realisasi</th>

                <th className="p-3 text-left">Tahun</th>

                <th className="p-3 text-right">Pagu Rencana</th>

                <th className="p-3 text-right">Realisasi</th>

              </tr>

            </thead>

            <tbody>

              {detailTable.map((item, index) => (

                <tr
                  key={index}
                  className="border-b border-slate-800 hover:bg-slate-800/40"
                >

                  <td className="p-3 font-medium text-slate-100">{item.kegiatan}</td>

                  <td className="p-3">{item.bidang}</td>

                  <td className="p-3">{item.periode}</td>

                  <td className="p-3 text-amber-300">{item.bulanRpd}</td>

                  <td className="p-3">{item.bulan}</td>

                  <td className="p-3">{item.tahun}</td>

                  <td className="p-3 text-right text-amber-400/90">
                    {formatRupiah(item.paguRencana)}
                  </td>

                  <td className={`p-3 text-right font-semibold ${item.realisasi > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {formatRupiah(item.realisasi)}
                  </td>

                </tr>

              ))}

              {detailTable.length === 0 && (

                <tr>

                  <td colSpan={8} className="p-6 text-center text-slate-400">

                    Tidak ada data ditemukan

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  </div>
);
}