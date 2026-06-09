'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Info, X, Shield } from 'lucide-react';
import { fetchSheetData } from '@/lib/googleSheets';

export default function JadwalMingguanPage() {
  const [selectedActivity, setSelectedActivity] = useState<{ name: string; detail: string } | null>(null);

  // Fetch data dari Sheet JADWAL MINGGUAN
  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['jadwal-mingguan'],
    queryFn: async () => {
      const values = await fetchSheetData('JADWAL MINGGUAN');
      return values || [];
    },
  });

  // Proses data sesuai logika: Jika cell kosong, ikuti cell di atasnya (Jam sebelumnya)
  const processedJadwal = useMemo(() => {
    if (rawData.length < 2) return { week1: null, week2: null, activityMap: {} as Record<string, string> };
    const headers = rawData[0];
    const rawBody = rawData.slice(1);

    // Build activityMap dari kolom S (index 18) dan T (index 19)
    const activityMap: Record<string, string> = {};
    rawBody.forEach((row: any[]) => {
      const activityName = row[18]?.toString().trim();
      const activityDetail = row[19]?.toString().trim();
      if (activityName && activityDetail) activityMap[activityName] = activityDetail;
    });

    const processWeek = (dayIndices: number[]) => {
      const body: any[][] = [];
      rawBody.forEach((row: any[], rowIndex: number) => {
        if (!row[0] || row[0].toString().trim() === '') return;

        // Ambil Jam Ke (0) dan Waktu (1) + Hari-hari yang ditentukan
        const currentRow = [row[0], row[1], ...dayIndices.map(idx => row[idx] || '')];
        
        if (body.length > 0) {
          const prevRow = body[body.length - 1];
          // Mulai dari index 2 (Hari pertama)
          for (let i = 2; i < currentRow.length; i++) {
            if (!currentRow[i] || currentRow[i].toString().trim() === '') {
              currentRow[i] = prevRow[i];
            }
          }
        }
        body.push(currentRow);
      });

      // Hitung rowSpan
      const spans = body.map(row => row.map(() => 1));
      for (let col = 2; col < body[0]?.length; col++) {
        for (let row = 0; row < body.length; row++) {
          let count = 1;
          while (
            row + count < body.length && 
            body[row + count][col] === body[row][col] &&
            body[row][col] !== '-'
          ) {
            spans[row + count][col] = 0;
            count++;
          }
          spans[row][col] = count;
          row += count - 1;
        }
      }
      return { body, spans };
    };

    // Minggu 1: Kolom C-I (Index 2-8)
    const week1 = processWeek([2, 3, 4, 5, 6, 7, 8]);
    // Minggu 2: Kolom K-Q (Index 10-16)
    const week2 = processWeek([10, 11, 12, 13, 14, 15, 16]);

    return {
      week1: {
        title: `Hari ${headers[2] || '?'} s.d ${headers[8] || '?'}`,
        headers: [headers[0], headers[1], ...[2, 3, 4, 5, 6, 7, 8].map(i => headers[i])],
        ...week1
      },
      week2: {
        title: `Hari ${headers[10] || '?'} s.d ${headers[16] || '?'}`,
        headers: [headers[0], headers[1], ...[10, 11, 12, 13, 14, 15, 16].map(i => headers[i])],
        ...week2
      },
      activityMap
    };
  }, [rawData]);

  const renderTable = (data: any) => (
    <div className="glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-16">
      <div className="bg-emerald-500/10 py-4 px-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-3">
          <Calendar size={20} /> {data.title}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-950/50">
              {data.headers.map((header: any, i: number) => (
                <th key={i} className={`px-4 py-6 text-emerald-400 font-bold text-xs uppercase tracking-wider text-center border-r border-slate-700/50 last:border-r-0 ${i < 2 ? 'w-24 bg-black/20' : ''}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="border-t border-slate-700">
            {data.body.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell: any, cellIndex: number) => {
                  const span = data.spans[rowIndex][cellIndex];
                  if (span === 0) return null;
                  return (
                    <td
                      key={cellIndex}
                      rowSpan={span}
                      className={`px-4 py-5 text-center border border-slate-700 align-middle select-none transition-all duration-200 group/cell ${
                        cellIndex < 2 
                          ? 'bg-slate-900/50 font-bold text-slate-400 text-xs' 
                          : 'text-white font-medium text-sm hover:bg-emerald-500/20 hover:text-emerald-300 cursor-pointer active:scale-[0.98]'
                      }`}
                      onClick={() => {
                        if (cellIndex >= 2 && cell && cell !== '-') {
                          setSelectedActivity({
                            name: cell,
                            detail: processedJadwal.activityMap[String(cell).trim()] || 'Informasi detail belum diisi di kolom S & T.'
                          });
                        }
                      }}
                    >
                      {cellIndex === 1 && cell ? (
                        <span className="flex items-center justify-center gap-1 font-mono">
                          <Clock size={12} className="text-amber-500/50" /> {cell}
                        </span>
                      ) : (
                        <div className="relative">
                          {cell || '-'}
                          {cellIndex >= 2 && cell && cell !== '-' && (
                            <Info size={10} className="absolute -top-3 -right-2 text-emerald-500/40 group-hover/cell:text-emerald-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen military-gradient pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 rounded-2xl bg-emerald-500/10 mb-4 border border-emerald-500/20">
            <Calendar className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent mb-4">
            JADWAL MINGGUAN
          </h1>
          <p className="text-slate-400 font-medium">
            Rencana Pelaksanaan Kegiatan Harian Yonkes 2 / YBH / 2 Kostrad
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {processedJadwal.week1 && renderTable(processedJadwal.week1)}
            {processedJadwal.week2 && renderTable(processedJadwal.week2)}
          </motion.div>
        )}

        {/* Modal Detail Kegiatan */}
        <AnimatePresence>
          {selectedActivity && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedActivity(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg glass rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl"
              >
                <div className="bg-emerald-500/20 px-8 py-6 border-b border-emerald-500/30 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Shield className="text-emerald-400 w-6 h-6" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Detail Kegiatan</h3>
                  </div>
                  <button onClick={() => setSelectedActivity(null)} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8">
                  <div className="mb-6">
                    <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2 block">Nama Kegiatan</label>
                    <p className="text-2xl font-black text-white">{selectedActivity.name}</p>
                  </div>
                  <div>
                    <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2 block">Keterangan / Instruksi</label>
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                      "{selectedActivity.detail}"
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}