'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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
} from 'recharts';

import {
  fetchSheetData,
  valuesToObjects,
} from '@/lib/googleSheets';

const COLORS = [
  '#16a34a',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
];

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

  const [tahun, setTahun] =
    useState(new Date().getFullYear().toString());

  const currentYear = new Date().getFullYear().toString();
  const previousYear = (new Date().getFullYear() - 1).toString();

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

      return valuesToObjects<any>(
        values
      );
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

      return valuesToObjects<any>(
        values
      );
    },
  });

  const {
    data: detail = [],
  } = useQuery({
    queryKey: ['detail-anggaran'],
    queryFn: async () => {
      const values =
        await fetchSheetData(
          'DETAIL ANGGARAN'
        );

      return valuesToObjects<any>(
        values
      );
    },
  });

/* ====================================
    OPTION FILTER
==================================== */

const tahunList = [
  'Semua',
  ...new Set(
    detail
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
        item.Bulan === bulan;

      const triwulanMatch =
        triwulan === 'Semua' ||
        item.Periode === triwulan;

      const semesterData =
        item.Periode === 'TW I' ||
        item.Periode === 'TW II'
          ? 'Semester I'
          : 'Semester II';

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
    DATA FILTERED PAGU (Master Kegiatan)
==================================== */

const kegiatanFiltered = kegiatan.filter((item: any) => {
  const bidangMatch =
    bidangFilter === 'Semua' ? true : item.Bidang === bidangFilter;
  const kegiatanMatch =
    kegiatanFilter === 'Semua' ? true : item.Kegiatan === kegiatanFilter;
  const tahunMatch = tahun === 'Semua' ? true : item.Tahun === tahun;

  return bidangMatch && kegiatanMatch && tahunMatch;
});

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

const totalSisaFiltered = totalPaguFiltered - totalRealisasi;

const persenFiltered =
  totalPaguFiltered > 0
    ? ((totalRealisasi / totalPaguFiltered) * 100).toFixed(2)
    : '0';

/* ====================================
    PIE CHART
==================================== */

const pieData = bidang
  .filter(
    (item: any) =>
      item.Bidang !== 'Total'
  )
  .map((item: any) => ({
    name: item.Bidang,
    value: cleanCurrency(
      item['Total Realisasi']
    ),
  }));

  /* ====================================
      TOP 10 PAGU
  ==================================== */

  const barData =
    [...kegiatan]
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
    bulanUrut.map((namaBulan) => ({

      bulan: namaBulan,

      realisasi:
        filteredDetail
          .filter(
            (item: any) =>
              item.Bulan ===
              namaBulan
          )
          .reduce(
            (
              sum: number,
              item: any
            ) =>
              sum +
              cleanCurrency(
                item[
                  'Total Realisasi'
                ]
              ),
            0
          ),

    }));

  /* ====================================
      REALISASI TRIWULAN
  ==================================== */

  const triwulanData = [
    'TW I',
    'TW II',
    'TW III',
    'TW IV',
  ].map((tw) => ({

    triwulan: tw,

    realisasi:
      filteredDetail
        .filter(
          (item: any) =>
            item.Periode === tw
        )
        .reduce(
          (
            sum: number,
            item: any
          ) =>
            sum +
            cleanCurrency(
              item[
                'Total Realisasi'
              ]
            ),
          0
        ),

  }));

  /* ====================================
      REALISASI SEMESTER
  ==================================== */

  const semesterData = [
    {
      semester:
        'Semester I',

      realisasi:
        filteredDetail
          .filter(
            (item: any) =>
              item.Periode ===
                'TW I' ||
              item.Periode ===
                'TW II'
          )
          .reduce(
            (
              sum: number,
              item: any
            ) =>
              sum +
              cleanCurrency(
                item[
                  'Total Realisasi'
                ]
              ),
            0
          ),
    },

    {
      semester:
        'Semester II',

      realisasi:
        filteredDetail
          .filter(
            (item: any) =>
              item.Periode ===
                'TW III' ||
              item.Periode ===
                'TW IV'
          )
          .reduce(
            (
              sum: number,
              item: any
            ) =>
              sum +
              cleanCurrency(
                item[
                  'Total Realisasi'
                ]
              ),
            0
          ),
    },
  ];

  /* ====================================
      TABEL DETAIL
  ==================================== */
  const detailTable = useMemo(() => {
    const targetYear = tahun === 'Semua' ? currentYear : tahun;

    // Data yang sudah terealisasi (berdasarkan filter detail)
    const realizedData = filteredDetail
      .filter((item: any) => item.Tahun === targetYear)
      .map((item: any) => ({
        kegiatan: item.Kegiatan,
        bidang: item.Bidang,
        periode: item.Periode,
        bulan: item.Bulan,
        tahun: item.Tahun,
        realisasi: cleanCurrency(item['Total Realisasi']),
      }));

    // Data kegiatan yang belum terealisasi di periode/filter tersebut
    // Kita saring dari master kegiatan agar sesuai dengan konteks filter yang aktif
    const unrealizedData = kegiatan
      .filter((keg: any) => {
        const matchYear = (keg.Tahun || targetYear) === targetYear;
        const matchBidang = bidangFilter === 'Semua' || keg.Bidang === bidangFilter;
        const matchKegiatan = kegiatanFilter === 'Semua' || keg.Kegiatan === kegiatanFilter;
        // Cek apakah kegiatan ini sudah punya realisasi APAPUN di tahun ini (lintas periode)
        const hasAnyRealizationInYear = detail.some((d: any) => d.Kegiatan === keg.Kegiatan && d.Tahun === targetYear);
        
        return matchYear && matchBidang && matchKegiatan && !hasAnyRealizationInYear;
      })
      .map((item: any) => ({
        kegiatan: item.Kegiatan,
        bidang: item.Bidang,
        periode: '-',
        bulan: '-',
        tahun: item.Tahun || targetYear,
        realisasi: 0,
      }));

    // Gabungkan dan urutkan agar yang sudah terealisasi muncul di atas
    return [...realizedData, ...unrealizedData].sort((a, b) => b.realisasi - a.realisasi);
  }, [filteredDetail, kegiatan, detail, tahun, currentYear, bidangFilter, kegiatanFilter]);

  /* ====================================
      CARD SUMMARY TAMBAHAN
  ==================================== */

  const jumlahKegiatan = useMemo(() => {
    return filteredDetail.filter((item: any) => item.Kegiatan?.trim()).length;
  }, [filteredDetail]);

  const jumlahBidang =
    new Set(
      filteredDetail.map(
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
        Kegiatan:
          item.kegiatan,

        Bidang:
          item.bidang,

        Periode:
          item.periode,

        Bulan:
          item.bulan,

        Tahun:
          item.tahun,

        Realisasi:
          item.realisasi,
      })
    );

  /* ====================================
      CHART HEIGHT
  ==================================== */

  const chartHeight = 350;
return (
  <div className="min-h-screen military-gradient pt-24 pb-20">

    <div className="max-w-7xl mx-auto px-6">

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
              setSemester(
                e.target.value
              )
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
              setTriwulan(
                e.target.value
              )
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
              setBulan(
                e.target.value
              )
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

        <div className="glass rounded-3xl p-6">
          <div className="text-slate-400">
            Total Pagu
          </div>

          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {formatRupiah(
              totalPaguFiltered
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="text-slate-400">
            Total Realisasi
          </div>

          <div className="text-2xl font-bold text-blue-400 mt-2">
            {formatRupiah(
              totalRealisasi
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="text-slate-400">
            Sisa Anggaran
          </div>

          <div className="text-2xl font-bold text-amber-400 mt-2">
            {formatRupiah(
              totalSisaFiltered
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="text-slate-400">
            Serapan
          </div>

          <div className="text-2xl font-bold text-red-400 mt-2">
            {persenFiltered}%
          </div>
        </div>

      </div>

      <div className="grid xl:grid-cols-3 md:grid-cols-3 gap-6 mb-10">

        <div className="glass rounded-3xl p-6">
          <div className="text-slate-400">
            Jumlah Kegiatan
          </div>

          <div className="text-2xl font-bold text-cyan-400 mt-2">
            {jumlahKegiatan}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="text-slate-400">
            Jumlah Bidang
          </div>

          <div className="text-2xl font-bold text-violet-400 mt-2">
            {jumlahBidang}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
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

        </div>

      </div>

      {/* PIE + TOP 10 */}

      <div className="grid lg:grid-cols-2 gap-8 mb-10">

        <div className="glass p-6 rounded-3xl">

          <h2 className="text-xl font-bold mb-6">
            Realisasi Per Bidang
          </h2>

          <ResponsiveContainer
            width="100%"
            height={chartHeight}
          >

            <PieChart>

              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >

                {pieData.map(
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

            </PieChart>

          </ResponsiveContainer>

        </div>

        <div className="glass p-6 rounded-3xl">

          <h2 className="text-xl font-bold mb-6">
            Top 10 Pagu Tertinggi
          </h2>

          <ResponsiveContainer
            width="100%"
            height={chartHeight}
          >

            <BarChart
              data={barData}
              margin={{ top: 10, right: 20, left: 40, bottom: 100 }}
              barCategoryGap="20%"
              barGap={1}
            >

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="kegiatan"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={100}
                tick={{ fontSize: 11 }}
              />

              <YAxis />

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

              <Bar
                dataKey="pagu"
                fill="#16a34a"
                radius={[
                  8,
                  8,
                  0,
                  0,
                ]}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* BULANAN */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-6">
          Realisasi Bulanan
        </h2>

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >

          <LineChart
            data={bulananData}
            margin={{ top: 24, right: 20, left: 80, bottom: 40 }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="bulan"
              tick={{ fontSize: 12 }}
            />

            <YAxis width={80} tick={{ fontSize: 12 }} domain={[0, 'dataMax * 1.15']} />

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

            <Legend />

            <Line
              type="monotone"
              dataKey="realisasi"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 3 }}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>
      {/* TRIWULAN */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-6">
          Realisasi Per Triwulan
        </h2>

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >

          <BarChart
            data={triwulanData}
            margin={{ top: 24, right: 20, left: 80, bottom: 40 }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="triwulan"
              tick={{ fontSize: 12 }}
            />

            <YAxis width={80} tick={{ fontSize: 12 }} />

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

            <Bar
              dataKey="realisasi"
              fill="#f59e0b"
              radius={[
                8,
                8,
                0,
                0,
              ]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

      {/* SEMESTER */}

      <div className="glass rounded-3xl p-6 mb-10">

        <h2 className="text-xl font-bold mb-6">
          Realisasi Per Semester
        </h2>

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >

          <BarChart
            data={semesterData}
            margin={{ top: 24, right: 20, left: 80, bottom: 40 }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="semester"
              tick={{ fontSize: 12 }}
            />

            <YAxis width={80} tick={{ fontSize: 12 }} />

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

            <Bar
              dataKey="realisasi"
              fill="#8b5cf6"
              radius={[
                8,
                8,
                0,
                0,
              ]}
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

          <table className="w-full min-w-[900px]">

            <thead>

              <tr className="border-b border-slate-700 bg-slate-900/50">

                <th className="p-3 text-left">Kegiatan</th>

                <th className="p-3 text-left">Bidang</th>

                <th className="p-3 text-left">Periode</th>

                <th className="p-3 text-left">Bulan</th>

                <th className="p-3 text-left">Tahun</th>

                <th className="p-3 text-right">Realisasi</th>

              </tr>

            </thead>

            <tbody>

              {detailTable.map((item, index) => (

                <tr
                  key={index}
                  className="border-b border-slate-800 hover:bg-slate-800/40"
                >

                  <td className="p-3">{item.kegiatan}</td>

                  <td className="p-3">{item.bidang}</td>

                  <td className="p-3">{item.periode}</td>

                  <td className="p-3">{item.bulan}</td>

                  <td className="p-3">{item.tahun}</td>

                  <td className={`p-3 text-right font-semibold ${item.realisasi > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {formatRupiah(item.realisasi)}
                  </td>

                </tr>

              ))}

              {detailTable.length === 0 && (

                <tr>

                  <td colSpan={6} className="p-6 text-center text-slate-400">

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