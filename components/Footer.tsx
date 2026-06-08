'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, MapPin, ShieldCheck, MessageSquareWarning } from 'lucide-react';
import { fetchSheetData } from '@/lib/googleSheets';

export default function Footer() {
  const { data: kontak } = useQuery({
    queryKey: ['kontak-footer'],
    queryFn: async () => {
      const values = await fetchSheetData('KONTAK');
      if (!values || values.length < 2) return null;
      return {
        telepon: values[1]?.[0] || '-', // Cell A2
        email: values[1]?.[1] || '-',   // Cell B2
        wa: values[1]?.[2] || '',       // Cell C2
        alamat: values[1]?.[6] || '-',  // Cell G2 (Index 6)
        mapsLink: values[1]?.[7] || '#', // Cell H2 (Index 7)
      };
    },
  });

  return (
    <footer className="mt-20 border-t border-white/10 bg-slate-950/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          {/* Identitas Satuan */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <ShieldCheck className="text-emerald-400 w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white uppercase">
                YONKES 2 <span className="text-emerald-500">KOSTRAD</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Satuan Bantuan Administrasi Kesehatan Divisi Infanteri 2 Kostrad. 
              Berbakti untuk kesehatan prajurit dan masyarakat dengan semangat Yudha Bhakti Husada.
            </p>
          </div>

          {/* Informasi Kontak */}
          <div className="space-y-6">
            <h3 className="text-white font-bold tracking-wide uppercase text-xs opacity-50">Kontak Resmi</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors">
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Telepon</div>
                  <div className="text-slate-200 font-medium">{kontak?.telepon}</div>
                </div>
              </div>
              {kontak?.email && kontak.email !== '-' ? (
                <a 
                  href={`mailto:${kontak.email}`}
                  className="flex items-center gap-4 group hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors">
                    <Mail className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Email</div>
                    <div className="text-slate-200 font-medium">{kontak.email}</div>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-4 opacity-50">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Email</div>
                    <div className="text-slate-400 font-medium italic">Loading...</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Layanan Cepat */}
          <div className="space-y-6">
            <h3 className="text-white font-bold tracking-wide uppercase text-xs opacity-50">Layanan Cepat</h3>
            <div className="space-y-4">
              <Link href="/Lapor" className="flex items-center gap-4 group transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors">
                  <MessageSquareWarning className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pengaduan</div>
                  <div className="text-slate-200 font-medium group-hover:text-emerald-400 transition-colors">Pusat Pelaporan</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Lokasi Markas */}
          <div className="space-y-6">
            <h3 className="text-white font-bold tracking-wide uppercase text-xs opacity-50">Markas Satuan</h3>
            <a 
              href={kontak?.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 group hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Alamat</div>
                <div className="text-slate-200 text-sm leading-relaxed font-medium italic">
                  {kontak?.alamat}
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} Portal Staf Operasi Yonkes 2 / YBH / 2 Kostrad
          </p>
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
            Divisi Infanteri 2 Kostrad • TNI Angkatan Darat
          </div>
        </div>
      </div>
    </footer>
  );
}