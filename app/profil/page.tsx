'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Users, Target, Award, UserCheck, Building2 } from 'lucide-react';
import { fetchSheetData, valuesToObjects } from '@/lib/googleSheets';

interface DataObject {
  [key: string]: any;
}

const fotoPejabat: Record<string, string> = {
  'Danyonkes 2 Kostrad': '/images/pejabat/danyonkes.png',
  'Wadanyonkes 2 Kostrad': '/images/pejabat/wadanyonkes.png',
  'Pasi Intel Yonkes 2 Kostrad': '/images/pejabat/pasi-intel.png',
  'Pasi Ops Yonkes 2 Kostrad': '/images/pejabat/pasi-ops.png',
  'Pasi Pers Yonkes 2 Kostrad': '/images/pejabat/pasi-pers.png',
  'Pasi Log Yonkes 2 Kostrad': '/images/pejabat/pasi-log.png',
  'Dokter Yonkes 2 Kostrad': '/images/pejabat/dokter.png',
  'Danki Markas Yonkes 2 Kostrad': '/images/pejabat/danki-markas.png',
  'Danki Rumkitlap Yonkes 2 Kostrad': '/images/pejabat/danki-rumkitlap.png',
  'Danki Evakuasi Yonkes 2 Kostrad': '/images/pejabat/danki-evakuasi.png',
  'Danki Kesban Yonkes 2 Kostrad': '/images/pejabat/danki-kesban.png',
  'Danki Keslap 1 Yonkes 2 Kostrad': '/images/pejabat/danki-keslap-1.png',
  'Danki Keslap 2 Yonkes 2 Kostrad': '/images/pejabat/danki-keslap-2.png',
  'Danki Keslap 3 Yonkes 2 Kostrad': '/images/pejabat/danki-keslap-3.png',
};

export default function ProfilPage() {
  const { data: profil } = useQuery<DataObject>({
    queryKey: ['profil'],
    queryFn: async () => {
      const values = await fetchSheetData('PROFIL');
      return valuesToObjects(values)[0] || {};
    },
  });

  const { data: kekuatan } = useQuery<any>({
    queryKey: ['ket-pers'],
    queryFn: async () => {
      const [values, orgValues] = await Promise.all([
        fetchSheetData('KET PERS'),
        fetchSheetData('ORGANISASI'),
      ]);

      if (!values || values.length < 4) return null;
      
      return {
        totals: {
          top: orgValues?.[1]?.[0],    // ORGANISASI A2
          nyata: orgValues?.[1]?.[1],  // ORGANISASI B2
          kurang: orgValues?.[1]?.[2], // ORGANISASI C2
        },
        PA: { top: values[2]?.[1], nyata: values[2]?.[2], kurang: values[2]?.[3] },
        BA: { top: values[1]?.[1], nyata: values[1]?.[2], kurang: values[1]?.[3] },
        TA: { top: values[3]?.[1], nyata: values[3]?.[2], kurang: values[3]?.[3] },
      };
    },
  });

  const { data: pejabatRaw } = useQuery<Record<string, string>>({
    queryKey: ['pejabat'],
    queryFn: async () => {
      const values = await fetchSheetData('ORGANISASI');
      if (!values || values.length < 2) return {};
      const headers = values[0] || [];
      const row = values[1] || [];
      const pejabat: Record<string, string> = {};
      for (let i = 3; i < headers.length; i++) {
        const jabatanKey = headers[i]?.trim();
        if (jabatanKey) pejabat[jabatanKey] = row[i] || '';
      }
      return pejabat;
    },
  });

  return (
    <div className="min-h-screen military-gradient pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
            PROFIL YONKES 2
          </h1>
          <h2 className="text-2xl text-slate-300 mt-3">Yudha Bhakti Husada</h2>
          <p className="text-slate-400 mt-4">Satuan Bantuan Administrasi Kesehatan Divif 2 Kostrad</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="glass rounded-3xl p-8">
            <Target className="w-12 h-12 mx-auto mb-5 text-emerald-400" />
            <h2 className="text-3xl font-bold text-center mb-5">TUGAS POKOK</h2>
            <p className="text-center text-slate-300 leading-relaxed">{profil?.['Tugas Pokok']}</p>
          </div>
          <div className="glass rounded-3xl p-8">
            <Award className="w-12 h-12 mx-auto mb-5 text-amber-400" />
            <h2 className="text-3xl font-bold text-center mb-5">VISI</h2>
            <p className="text-center text-slate-300">{profil?.Visi}</p>
          </div>
          <div className="glass rounded-3xl p-8">
            <Users className="w-12 h-12 mx-auto mb-5 text-emerald-400" />
            <h2 className="text-3xl font-bold text-center mb-5">MISI</h2>
            <p className="text-center text-slate-300 whitespace-pre-line">{profil?.Misi}</p>
          </div>
        </div>

        <div className="glass rounded-3xl p-10 text-center mb-12 border-l-4 border-amber-500">
          <h2 className="text-3xl font-bold mb-6">SASANTI</h2>
          <p className="text-3xl md:text-4xl italic text-amber-400 font-semibold">"{profil?.Sasanti}"</p>
        </div>

        <div className="glass rounded-3xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 flex justify-center items-center gap-3">
            <Building2 className="text-emerald-400" /> STRUKTUR ORGANISASI
          </h2>
          <Image
            src="/images/struktur-organisasi.png"
            alt="Struktur Organisasi"
            width={1600}
            height={900}
            priority
            style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
            className="rounded-2xl"
          />
        </div>

        <div className="glass rounded-3xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-8"><UserCheck className="inline mr-3 text-emerald-400" /> KEKUATAN PERSONEL</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* KOLOM TOP */}
            <div className="flex flex-col gap-4">
              <div className="text-center border-b border-slate-700 pb-4">
                <div className="text-4xl font-black text-white">{kekuatan?.totals?.top || 0}</div>
                <div className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mt-1">TOP</div>
              </div>
              <div className="glass bg-white/5 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-white">{kekuatan?.PA?.top || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase mt-1">Perwira</div>
              </div>
              <div className="glass bg-white/5 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-white">{kekuatan?.BA?.top || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase mt-1">Bintara</div>
              </div>
              <div className="glass bg-white/5 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-white">{kekuatan?.TA?.top || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase mt-1">Tamtama</div>
              </div>
            </div>

            {/* KOLOM NYATA */}
            <div className="flex flex-col gap-4">
              <div className="text-center border-b border-emerald-900/50 pb-4">
                <div className="text-4xl font-black text-emerald-400">{kekuatan?.totals?.nyata || 0}</div>
                <div className="text-xs font-bold text-emerald-500/60 tracking-[0.2em] uppercase mt-1">NYATA</div>
              </div>
              <div className="glass bg-emerald-500/5 border-emerald-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-emerald-400">{kekuatan?.PA?.nyata || 0}</div>
                <div className="text-[10px] text-emerald-500/60 uppercase mt-1">Perwira</div>
              </div>
              <div className="glass bg-emerald-500/5 border-emerald-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-emerald-400">{kekuatan?.BA?.nyata || 0}</div>
                <div className="text-[10px] text-emerald-500/60 uppercase mt-1">Bintara</div>
              </div>
              <div className="glass bg-emerald-500/5 border-emerald-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-emerald-400">{kekuatan?.TA?.nyata || 0}</div>
                <div className="text-[10px] text-emerald-500/60 uppercase mt-1">Tamtama</div>
              </div>
            </div>

            {/* KOLOM KURANG */}
            <div className="flex flex-col gap-4">
              <div className="text-center border-b border-amber-900/50 pb-4">
                <div className="text-4xl font-black text-amber-400">{kekuatan?.totals?.kurang || 0}</div>
                <div className="text-xs font-bold text-amber-500/60 tracking-[0.2em] uppercase mt-1">KURANG</div>
              </div>
              <div className="glass bg-amber-500/5 border-amber-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-amber-400">{kekuatan?.PA?.kurang || 0}</div>
                <div className="text-[10px] text-amber-500/60 uppercase mt-1">Perwira</div>
              </div>
              <div className="glass bg-amber-500/5 border-amber-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-amber-400">{kekuatan?.BA?.kurang || 0}</div>
                <div className="text-[10px] text-amber-500/60 uppercase mt-1">Bintara</div>
              </div>
              <div className="glass bg-amber-500/5 border-amber-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-amber-400">{kekuatan?.TA?.kurang || 0}</div>
                <div className="text-[10px] text-amber-500/60 uppercase mt-1">Tamtama</div>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs mt-8 italic">
            * Data bersumber dari tabel ORGANISASI (Total) & KET PERS (Detail PA, BA, TA)
          </p>
        </div>

        <div className="glass rounded-3xl p-8">
          <h2 className="text-3xl font-bold text-center mb-10">DATA PEJABAT SATUAN</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Object.entries(pejabatRaw || {}).map(([jabatan, nama], index) => {
              const keyMatch = Object.keys(fotoPejabat).find(k => jabatan.includes(k) || k.includes(jabatan));
              const srcFoto = keyMatch ? fotoPejabat[keyMatch] : '/images/pejabat/placeholder.png';
              const isPriority = index < 4;

              return (
                <motion.div key={jabatan} whileHover={{ scale: 1.03 }} className="glass rounded-2xl p-6 text-center">
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-emerald-500 mb-4">
                    <Image
                      src={srcFoto}
                      alt={nama}
                      width={120}
                      height={120}
                      className="object-cover w-full h-full"
                      style={{ aspectRatio: "1 / 1" }}
                      priority={isPriority}
                      loading={isPriority ? "eager" : "lazy"}
                    />
                  </div>
                  <div className="text-emerald-400 text-sm font-semibold">{jabatan}</div>
                  <div className="text-white font-bold mt-2">{nama}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}