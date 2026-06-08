'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Send, User, FileText, MessageSquare, ShieldAlert, Clock } from 'lucide-react';
import { fetchSheetData } from '@/lib/googleSheets';

export default function LaporPage() {
  const [formData, setFormData] = useState({
    nama: '',
    perihal: '',
    pesan: ''
  });

  // Mengambil nomor WA dari Spreadsheet KONTAK Cell C2
  const { data: waNumberSheet } = useQuery({
    queryKey: ['wa-number-root'],
    queryFn: async () => {
      const values = await fetchSheetData('KONTAK');
      return values?.[1]?.[2] || "6285859114726";
    }
  });

  const WA_NUMBER = waNumberSheet || "6285859114726";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Format pesan WhatsApp yang rapi
    const text = `*LAPORAN PORTAL YONKES 2*%0A` +
                 `--------------------------------%0A` +
                 `*Waktu:* ${tanggal} | Pkl ${jam} WIB%0A` +
                 `*Dari:* ${formData.nama}%0A` +
                 `*Perihal:* ${formData.perihal}%0A%0A` +
                 `*Isi Laporan:*%0A${formData.pesan}%0A` +
                 `--------------------------------`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${text}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen military-gradient pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 rounded-2xl bg-emerald-500/10 mb-4 border border-emerald-500/20">
            <ShieldAlert className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent mb-4">
            PUSAT PELAPORAN
          </h1>
          <p className="text-slate-400 font-medium">
            Sampaikan laporan atau aspirasi Anda secara langsung kepada Staf Operasi
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 rounded-3xl border border-white/10 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nama Pengirim */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
                <User size={14} className="text-emerald-400" /> Nama Pengirim / NRP
              </label>
              <input
                required
                type="text"
                placeholder="Masukkan nama lengkap / NRP..."
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border border-slate-700 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 font-medium"
              />
            </div>

            {/* Perihal */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
                <FileText size={14} className="text-amber-400" /> Perihal Laporan
              </label>
              <input
                required
                type="text"
                placeholder="Contoh: Laporan Giat, Pengajuan Izin, dsb..."
                value={formData.perihal}
                onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border border-slate-700 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 font-medium"
              />
            </div>

            {/* Isi Pesan */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
                <MessageSquare size={14} className="text-cyan-400" /> Isi Laporan
              </label>
              <textarea
                required
                rows={5}
                placeholder="Tuliskan detail laporan Anda di sini..."
                value={formData.pesan}
                onChange={(e) => setFormData({ ...formData, pesan: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl bg-slate-900/50 border border-slate-700 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 font-medium resize-none"
              ></textarea>
            </div>

            {/* Info Tanggal Otomatis */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter bg-slate-900/30 p-3 rounded-xl border border-white/5">
              <Clock size={12} />
              Laporan akan dikirim dengan stempel waktu otomatis hari ini
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              KIRIM LAPORAN KE WHATSAPP
            </button>
          </form>
        </motion.div>

        {/* Footer info */}
        <p className="mt-8 text-center text-slate-500 text-xs font-medium">
          Pastikan perangkat Anda terhubung dengan WhatsApp. <br/>
          Data yang Anda kirimkan bersifat rahasia dan langsung menuju ke admin terkait.
        </p>
      </div>
    </div>
  );
}