'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ExternalLink, Filter, Loader2 } from 'lucide-react';
import { fetchSheetData, valuesToObjects } from '@/lib/googleSheets';

export default function DokumenPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: dokumen = [], isLoading } = useQuery({
    queryKey: ['dokumen'],
    queryFn: async () => {
      const values = await fetchSheetData('DOKUMEN');
      return valuesToObjects(values);
    },
  });

  // Filter logika
  const filteredData = useMemo(() => {
    return dokumen.filter((item: any) => {
      const matchSearch = item.Judul?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'Semua' || item.Tipe?.toLowerCase() === filter.toLowerCase();
      return matchSearch && matchFilter;
    });
  }, [dokumen, search, filter]);

  // Reset page jika filter berubah
  const handleFilterChange = (val: string) => {
    setFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

        {/* Filter Section */}
        <div className="glass p-6 rounded-3xl mb-10">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari dokumen..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-3.5 text-slate-400" />
              <select
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 outline-none appearance-none"
              >
                <option value="Semua">Semua</option>
                <option value="Doktrin">Doktrin</option>
                <option value="Bujuk">Bujuk</option>
                <option value="Protap">Protap</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="glass rounded-3xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400 w-10 h-10" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-emerald-400 font-semibold">No</th>
                      <th className="px-6 py-4 text-emerald-400 font-semibold">Judul</th>
                      <th className="px-6 py-4 text-emerald-400 font-semibold">Tipe</th>
                      <th className="px-6 py-4 text-emerald-400 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {paginatedData.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-slate-300">{item.No}</td>
                        <td className="px-6 py-4 text-white font-medium">{item.Judul}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm">{item.Tipe || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <a href={item.Link} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                            <ExternalLink size={20} className="inline" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination UI */}
              <div className="p-6 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
                <p>Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} dokumen</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">Prev</button>
                  <span className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-700">Hal {currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}