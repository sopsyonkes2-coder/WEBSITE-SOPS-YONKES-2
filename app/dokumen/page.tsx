'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, FileText, ExternalLink, Filter } from 'lucide-react';
import { fetchSheetData, valuesToObjects } from '@/lib/googleSheets';

export default function DokumenPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');

  const { data: dokumen = [], isLoading } = useQuery({
    queryKey: ['dokumen'],
    queryFn: async () => {
      const values = await fetchSheetData('DOKUMEN');
      return valuesToObjects(values);
    },
  });

  const filteredData = dokumen.filter((item: any) => {
    const matchSearch =
      item.Judul?.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === 'Semua' ||
      item.Tipe?.toLowerCase() === filter.toLowerCase();

    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen military-gradient pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-6">

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black text-center mb-4 bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent"
        >
          DOKUMEN OPERASI
        </motion.h1>

        <p className="text-center text-slate-400 mb-12">
          Doktrin, Bujuk dan Protap Yonkes 2 / YBH / 2 Kostrad
        </p>

        <div className="glass p-6 rounded-3xl mb-10">

          <div className="grid md:grid-cols-2 gap-4">

            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" />

              <input
                type="text"
                placeholder="Cari dokumen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="
                  w-full
                  pl-12
                  pr-4
                  py-3
                  rounded-xl
                  bg-slate-800/50
                  border
                  border-slate-700
                  text-white
                "
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-3.5 text-slate-400" />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="
                  w-full
                  pl-12
                  pr-4
                  py-3
                  rounded-xl
                  bg-slate-800/50
                  border
                  border-slate-700
                  text-white
                "
              >
                <option value="Semua">Semua</option>
                <option value="Doktrin">Doktrin</option>
                <option value="Bujuk">Bujuk</option>
                <option value="Protap">Protap</option>
              </select>
            </div>

          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400">
            Memuat data dokumen...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {filteredData.map((item: any, index: number) => (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.05,
                }}
                whileHover={{
                  scale: 1.02,
                }}
                className="glass p-6 rounded-3xl"
              >
                <div className="flex justify-between mb-5">

                  <FileText className="text-emerald-400 w-8 h-8" />

                  <span
                    className="
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      bg-emerald-500/20
                      text-emerald-400
                    "
                  >
                    {item.Tipe}
                  </span>

                </div>

                <h3 className="font-bold text-xl mb-4 text-white">
                  {item.Judul}
                </h3>

                <div className="text-slate-400 text-sm mb-6">
                  No. {item.No}
                </div>

                <a
                  href={item.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2
                    rounded-xl
                    bg-emerald-500
                    hover:bg-emerald-600
                    transition
                    font-semibold
                  "
                >
                  <ExternalLink size={18} />
                  Buka Dokumen
                </a>
              </motion.div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}