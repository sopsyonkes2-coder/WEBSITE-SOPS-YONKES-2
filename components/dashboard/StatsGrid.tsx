'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Calendar,
  Users,
  Wallet,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import {
  fetchSheetData,
  valuesToObjects,
} from '@/lib/googleSheets';

function cleanCurrency(value: string) {
  if (!value) return 0;

  return (
    Number(
      value
        .toString()
        .replace(/Rp/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
    ) || 0
  );
}

export default function StatsGrid() {
  // DOKUMEN
  const { data: jumlahDokumen } =
    useQuery({
      queryKey: ['dokumen-count'],
      queryFn: async () =>
        (await fetchSheetData(
          'DOKUMEN'
        )).length - 1,
    });

  // KALENDER LATIHAN
  const { data: jumlahKegiatan } =
    useQuery({
      queryKey: ['kegiatan-count'],
      queryFn: async () => {
        const detailData = await fetchSheetData('DETAIL ANGGARAN');
        const detail = valuesToObjects<any>(detailData);
        const currentYear = new Date().getFullYear().toString();

        return detail.filter(item => 
          item.Kegiatan?.trim() && 
          item.Tahun?.toString().trim() === currentYear
        ).length;
      },
    });

  // ORGANISASI
  const { data: personel } =
    useQuery({
      queryKey: ['personel'],
      queryFn: async () => {
        const data =
          await fetchSheetData(
            'ORGANISASI'
          );

        const formatted =
          valuesToObjects<any>(
            data
          );

        return (
          formatted[0] || {}
        );
      },
    });

  // ANGGARAN
  const { data: anggaran = [] } =
    useQuery({
      queryKey: ['stats-anggaran'],
      queryFn: async () => {
        const data =
          await fetchSheetData(
            'ANGGARAN'
          );

        return valuesToObjects<any>(
          data
        );
      },
    });

  const currentYear = new Date().getFullYear().toString();

  const totalPagu =
    anggaran.reduce(
      (
        acc: number,
        item: any
      ) =>
        item.Tahun?.toString().trim() !== currentYear ? acc :
        acc +
        cleanCurrency(
          item['Total Pagu']
        ),
      0
    );

  const totalRealisasi =
    anggaran.reduce(
      (
        acc: number,
        item: any
      ) =>
        item.Tahun?.toString().trim() !== currentYear ? acc :
        acc +
        cleanCurrency(
          item[
            'Total Realisasi'
          ]
        ),
      0
    );

  const serapan =
    totalPagu > 0
      ? (
          (totalRealisasi /
            totalPagu) *
          100
        ).toFixed(2)
      : '0.00';

  return (
    <section className="w-full max-w-full px-6 -mt-12 relative z-20 pb-20">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        {/* DOKUMEN */}

        <motion.div className="glass rounded-3xl p-8 text-center hover:border-emerald-500/50 transition-all">

          <FileText className="w-10 h-10 mx-auto mb-4 text-emerald-400" />

          <div className="text-5xl font-bold text-white mb-1">
            {jumlahDokumen || 0}
          </div>

          <div className="text-slate-400">
            Dokumen
          </div>

        </motion.div>

        {/* LATIHAN */}

        <motion.div
          className="glass rounded-3xl p-8 text-center hover:border-emerald-500/50 transition-all"
          transition={{
            delay: 0.1,
          }}
        >

          <Calendar className="w-10 h-10 mx-auto mb-4 text-emerald-400" />

          <div className="text-5xl font-bold text-white mb-1">
            {jumlahKegiatan || 0}
          </div>

          <div className="text-slate-400">
            Kegiatan Latihan
          </div>

        </motion.div>

        {/* PERSONEL */}

        <motion.div
          className="glass rounded-3xl p-8 text-center hover:border-emerald-500/50 transition-all"
          transition={{
            delay: 0.2,
          }}
        >

          <Users className="w-10 h-10 mx-auto mb-4 text-emerald-400" />

          <div className="text-5xl font-bold text-white mb-1">
            {personel?.[
              'Nyata'
            ] || '0'}
          </div>

          <div className="text-slate-400">
            Personel Nyata
          </div>

        </motion.div>

        {/* SERAPAN ANGGARAN */}

        <motion.div
          className="glass rounded-3xl p-8 text-center hover:border-emerald-500/50 transition-all"
          transition={{
            delay: 0.3,
          }}
        >

          <Wallet className="w-10 h-10 mx-auto mb-4 text-emerald-400" />

          <div className="text-5xl font-bold text-white mb-1">
            {serapan}%
          </div>

          <div className="text-slate-400">
            Serapan Anggaran
          </div>

        </motion.div>

      </div>

    </section>
  );
}