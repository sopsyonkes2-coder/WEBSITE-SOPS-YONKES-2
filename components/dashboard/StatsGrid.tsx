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
import { getAnggaranSummary } from '@/lib/anggaranSummary';

export default function StatsGrid() {

  const currentYear =
    new Date().getFullYear().toString();

  // ==========================================
  // DOKUMEN
  // ==========================================

  const { data: jumlahDokumen } =
    useQuery({
      queryKey: ['dokumen-count'],
      queryFn: async () =>
        (await fetchSheetData('DOKUMEN')).length - 1,
    });


  // ==========================================
  // KEGIATAN LATIHAN (dari sheet ANGGARAN, filter tahun aktif)
  // Sinkron dengan halaman Anggaran
  // ==========================================

  const { data: jumlahKegiatan } =
    useQuery({
      queryKey: ['kegiatan-count', currentYear],
      queryFn: async () => {
        const anggaranData =
          await fetchSheetData('ANGGARAN');

        const detail =
          valuesToObjects<any>(anggaranData);

        const filtered = detail.filter((item) => {
          const tahun =
            String(
              item.TAHUN || item.Tahun || ''
            ).trim();
          const kegiatan = (
            item['NAMA KEGIATAN'] ||
            item.KEGIATAN ||
            item.Kegiatan ||
            ''
          )
            .toString()
            .trim();
          return tahun === currentYear && !!kegiatan;
        });

        // Hitung unique nama kegiatan (sama seperti halaman Anggaran)
        return new Set(
          filtered.map(
            (item) =>
              (
                item['NAMA KEGIATAN'] ||
                item.KEGIATAN ||
                item.Kegiatan ||
                ''
              )
                .toString()
                .trim()
          )
        ).size;
      },
    });


  // ==========================================
  // ORGANISASI
  // ==========================================

  const { data: personel } =
    useQuery({
      queryKey: ['personel'],
      queryFn: async () => {

        const data =
          await fetchSheetData(
            'KET PERS'
          );

        const formatted =
          valuesToObjects<any>(
            data
          );

        return formatted.reduce(
          (totals, row) => ({
            TOP: totals.TOP + Number(String(row.TOP || 0).replace(/[^\d.-]/g, '')),
            NYATA: totals.NYATA + Number(String(row.NYATA || 0).replace(/[^\d.-]/g, '')),
            KURANG: totals.KURANG + Number(String(row.KURANG || 0).replace(/[^\d.-]/g, '')),
          }),
          { TOP: 0, NYATA: 0, KURANG: 0 }
        );
      },
    });


  // ==========================================
  // TOTAL PAGU
  // SUMBER:
  // SHEET "ANGGARAN"
  // KOLOM "Total Pagu"
  // ==========================================

  const { data: anggaranSummary = { totalPagu: 0, totalRealisasi: 0 } } =
    useQuery({
      queryKey: [
        'anggaran-summary',
        currentYear,
      ],

      queryFn: async () => {
        const [anggaranData, realisasiData] = await Promise.all([
          fetchSheetData('ANGGARAN'),
          fetchSheetData('REALISASI'),
        ]);

        return getAnggaranSummary(
          valuesToObjects<any>(anggaranData),
          valuesToObjects<any>(realisasiData),
          currentYear
        );
      },
    });

  const { totalPagu, totalRealisasi } = anggaranSummary;


  // ==========================================
  // SERAPAN
  // SAMA DENGAN HALAMAN ANGGARAN
  // ==========================================

  const serapan =
    totalPagu > 0
      ? (
          (totalRealisasi /
            totalPagu) *
          100
        ).toFixed(2)
      : '0.00';


  // ==========================================
  // TAMPILAN
  // ==========================================

  return (
    <section className="w-full max-w-full px-6 -mt-12 relative z-20 pb-20">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">


        {/* DOKUMEN */}

        <motion.div
          className="glass rounded-3xl p-8 text-center hover:border-emerald-500/50 transition-all"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
        >

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
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.1 }}
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
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >

          <Users className="w-10 h-10 mx-auto mb-4 text-emerald-400" />

          <div className="text-5xl font-bold text-white mb-1">

            {personel?.['NYATA'] || personel?.['Nyata'] || '0'}

          </div>

          <div className="text-slate-400">
            Personel Nyata
          </div>

        </motion.div>


        {/* SERAPAN ANGGARAN */}

        <motion.div
          className="glass rounded-3xl p-8 text-center hover:border-emerald-500/50 transition-all"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.3 }}
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