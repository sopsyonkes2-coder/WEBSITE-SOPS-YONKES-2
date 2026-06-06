'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import {
  Users,
  FileText,
  Calendar,
  Target,
  Wallet,
  BadgeDollarSign,
  Coins,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';

import {
  fetchSheetData,
  valuesToObjects,
} from '@/lib/googleSheets';

import StatsGrid from '@/components/dashboard/StatsGrid';

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

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const { data: anggaran = [] } =
    useQuery({
      queryKey: ['home-anggaran'],
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

  const totalPagu = useMemo(() => {
    return anggaran.reduce(
      (
        acc: number,
        item: any
      ) =>
        acc +
        cleanCurrency(
          item['Total Pagu']
        ),
      0
    );
  }, [anggaran]);

  const totalRealisasi =
    useMemo(() => {
      return anggaran.reduce(
        (
          acc: number,
          item: any
        ) =>
          acc +
          cleanCurrency(
            item[
              'Total Realisasi'
            ]
          ),
        0
      );
    }, [anggaran]);

  const totalSisa =
    totalPagu - totalRealisasi;

  return (
    <div className="min-h-screen military-gradient overflow-hidden">

      {/* HERO */}

      <section className="relative h-screen flex items-center justify-center pt-20">

        <div className="absolute inset-0 bg-[radial-gradient(at_center,#166534_0%,transparent_70%)] opacity-40" />

        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">

          <motion.div
            initial={{
              opacity: 0,
              y: 40,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
          >

            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-emerald-500/30">

              <Target className="text-emerald-400" />

              <span className="text-emerald-400 font-semibold tracking-widest text-sm">
                YONKES 2 / YBH / 2 KOSTRAD
              </span>

            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-8">

              PORTAL STAF
              <br />

              <span className="bg-gradient-to-r from-emerald-400 via-white to-amber-400 bg-clip-text text-transparent">
                OPERASI
              </span>

            </h1>

            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
              Sistem Informasi Operasi,
              Latihan dan Anggaran
              <br />
              Yonkes 2 / YBH / 2 Kostrad
            </p>

          </motion.div>

        </div>

        <motion.div
          animate={{
            y: [0, 10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-400"
        >
          ↓ Scroll untuk melihat
        </motion.div>

      </section>

      {/* STATS */}

      <StatsGrid />

      {/* RINGKASAN ANGGARAN */}

      <section className="max-w-7xl mx-auto px-6 py-16">

        <div className="text-center mb-12">

          <h2 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
            RINGKASAN ANGGARAN
          </h2>

          <p className="text-slate-400 mt-3">
            Monitoring Pelaksanaan Anggaran Yonkes 2 / YBH / 2 Kostrad
          </p>

        </div>

        <div className="grid md:grid-cols-3 gap-8">

          <div className="glass rounded-3xl p-8 text-center">

            <div className="flex justify-center mb-5">
              <Wallet className="w-14 h-14 text-emerald-400" />
            </div>

            <div className="text-slate-400 uppercase text-sm tracking-widest">
              Total Pagu
            </div>

            <div className="text-3xl font-black text-emerald-400 mt-4 break-words">
              {formatRupiah(totalPagu)}
            </div>

          </div>

          <div className="glass rounded-3xl p-8 text-center">

            <div className="flex justify-center mb-5">
              <BadgeDollarSign className="w-14 h-14 text-blue-400" />
            </div>

            <div className="text-slate-400 uppercase text-sm tracking-widest">
              Total Realisasi
            </div>

            <div className="text-3xl font-black text-blue-400 mt-4 break-words">
              {formatRupiah(
                totalRealisasi
              )}
            </div>

          </div>

          <div className="glass rounded-3xl p-8 text-center">

            <div className="flex justify-center mb-5">
              <Coins className="w-14 h-14 text-amber-400" />
            </div>

            <div className="text-slate-400 uppercase text-sm tracking-widest">
              Sisa Anggaran
            </div>

            <div className="text-3xl font-black text-amber-400 mt-4 break-words">
              {formatRupiah(totalSisa)}
            </div>

          </div>

        </div>

      </section>

      {/* QUICK ACCESS */}

      <section className="max-w-7xl mx-auto px-6 py-20">

        <h2 className="text-3xl font-bold mb-10 text-center">
          Quick Access
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

          {[
            {
              icon: FileText,
              label: 'Dokumen',
              href: '/dokumen',
            },
            {
              icon: Calendar,
              label: 'Kalender',
              href: '/kalender',
            },
            {
              icon: Wallet,
              label: 'Anggaran',
              href: '/anggaran',
            },
            {
              icon: Users,
              label: 'Profil',
              href: '/profil',
            },
          ].map(
            (item, i) => (
              <motion.div
                key={i}
                whileHover={{
                  scale: 1.05,
                }}
              >
                <Link
                  href={item.href}
                  className="glass p-8 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 transition-all group"
                >

                  <item.icon className="w-12 h-12 text-emerald-400 group-hover:scale-110 transition-transform" />

                  <span className="font-semibold text-lg">
                    {item.label}
                  </span>

                </Link>
              </motion.div>
            )
          )}

        </div>

      </section>

      {/* BAGAN ALARM */}

      <section className="max-w-7xl mx-auto px-6 py-12">

        <h2 className="text-2xl font-bold mb-4 text-center">
          Bagan Alarm
        </h2>

        <div className="glass rounded-3xl p-6 flex justify-center">

          <img
            src="/images/bagan alarm.jpg"
            alt="Bagan Alarm"
            className="max-w-full h-auto rounded-lg shadow-lg"
            style={{ maxWidth: '900px' }}
          />

        </div>

      </section>

    </div>
  );
}