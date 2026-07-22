'use client';

import { useMemo, useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import {
  Users,
  FileText,
  Calendar,
  Target,
  Clock,
  Wallet,
  BadgeDollarSign,
  Coins,
  ShieldAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchSheetData,
  valuesToObjects,
} from '@/lib/googleSheets';

import StatsGrid from '@/components/dashboard/StatsGrid';
import BaganAlarmModal from '@/components/BaganAlarmModal';

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

function normalizeRemoteMediaUrl(rawValue: unknown) {
  const value = rawValue?.toString().trim();
  if (!value) return '';

  try {
    const idMatch = value.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/);
    if (idMatch?.[1]) {
      return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }

    const ucMatch = value.match(/https?:\/\/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]{10,})/);
    if (ucMatch?.[1]) return `https://drive.google.com/uc?export=download&id=${ucMatch[1]}`;

    return value.split('?')[0];
  } catch (e) {
    return value;
  }
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(url);
}

export default function Home() {
  const { data: anggaran = [] } =
    useQuery({
      queryKey: ['home-anggaran'],
      queryFn: async () => {
        const values = await fetchSheetData('ANGGARAN');
        return valuesToObjects<any>(values);
      },
    });

  const { data: reviewData = [] } =
    useQuery<ReviewItem[]>({
      queryKey: ['home-reviews'],
      queryFn: async () => {
        const res = await fetch('/api/reviews');
        if (!res.ok) return [];
        return res.json();
      },
    });

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  type ReviewItem = {
    id?: string;
    name: string;
    role: string;
    quote: string;
  };

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewItem>({
    name: '',
    role: '',
    quote: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [galleryPreviewOpen, setGalleryPreviewOpen] = useState(false);
  const [activeGalleryItem, setActiveGalleryItem] = useState<GalleryItem | null>(null);

  const queryClient = useQueryClient();

  type GalleryItem = {
    url: string;
    title?: string;
    description?: string;
    isVideo?: boolean;
  };

  const { data: galleryItems = [] } =
    useQuery<GalleryItem[]>({
      queryKey: ['home-gallery'],
      queryFn: async () => {
        const values = await fetchSheetData('GALERI');
        const objs = valuesToObjects<any>(values);

        const items = await Promise.all(
          objs.map(async (row: any) => {
            const rawUrl = row['URL FOTO'] || row['URL'] || row['A'] || Object.values(row)[0] || '';
            const url = normalizeRemoteMediaUrl(rawUrl);
            if (!url) return null;

            let isVideo = isVideoUrl(url);
            try {
              const headRes = await fetch(`/api/image?url=${encodeURIComponent(url)}`, { method: 'HEAD' });
              const contentType = headRes.headers.get('content-type') || '';
              if (contentType.startsWith('video/')) {
                isVideo = true;
              }
            } catch (_) {
              // ignore HEAD failures, fallback to extension-based detection
            }

            return {
              url,
              title: row['JUDUL'] || row['Judul'] || row['B'] || '',
              description: row['DESKRIPSI'] || row['Deskripsi'] || row['C'] || '',
              isVideo,
            } as GalleryItem;
          })
        );

        return items.filter((g): g is GalleryItem => !!g?.url);
      },
    });

  const testimonials = reviewData;

  const openGalleryPreview = (item: GalleryItem) => {
    setActiveGalleryItem(item);
    setGalleryPreviewOpen(true);
  };

  const closeGalleryPreview = () => {
    setActiveGalleryItem(null);
    setGalleryPreviewOpen(false);
  };

  const handleReviewSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!reviewForm.name || !reviewForm.role || !reviewForm.quote) {
      toast.error('Silakan isi nama, jabatan, dan ulasan terlebih dahulu.');
      return;
    }

    try {
      setSubmittingReview(true);
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal menyimpan ulasan.');
      }

      await queryClient.invalidateQueries({ queryKey: ['home-reviews'] });
      setReviewForm({ name: '', role: '', quote: '' });
      setReviewDialogOpen(false);
      toast.success('Ulasan berhasil dikirim.');
    } catch (error) {
      toast.error((error as Error).message || 'Gagal mengirim ulasan.');
    } finally {
      setSubmittingReview(false);
    }
  };


  const totalPagu = useMemo(() => {
    return anggaran.reduce(
      (
        acc: number,
        item: any
      ) =>
        item.Tahun?.toString().trim() !== currentYear
          ? acc
          : acc + cleanCurrency(item['Total Pagu']),
      0
    );
  }, [anggaran, currentYear]);

  const totalRealisasi =
    useMemo(() => {
      return anggaran.reduce(
        (
          acc: number,
          item: any
        ) =>
          item.Tahun?.toString().trim() !== currentYear
            ? acc
            : acc + cleanCurrency(item['Total Realisasi']),
        0
      );
    }, [anggaran, currentYear]);

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
          className="absolute top-24 left-1/2 -translate-x-1/2 text-slate-400"
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
            Monitoring Pelaksanaan Anggaran SOPS Yonkes 2 / YBH / 2 Kostrad
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

      <section className="max-w-7xl mx-auto px-6 py-16">

        <h2 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent mb-10 text-center">
          QUICK ACCESS
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">

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
              icon: Clock,
              label: 'Jadwal',
              href: '/jadwal-mingguan',
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
            {
              icon: ShieldAlert,
              label: 'Lapor',
              href: '/Lapor',
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

      <section className="max-w-7xl mx-auto px-6 py-16">

        <h2 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent mb-10 text-center">
          BAGAN ALARM
        </h2>

        <div className="glass rounded-3xl p-6 flex justify-center">

          <BaganAlarmModal />

        </div>

      </section>

      {/* ULASAN PENGUNJUNG */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center mb-12">
          <div>
            <h2 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              ULASAN PENGUNJUNG
            </h2>
            <p className="text-slate-400 mt-3">
              Terima kasih, ulasan Anda sangat berguna bagi pengembang.
            </p>
          </div>

          <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button">Tulis Ulasan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Isi Ulasan Pengunjung</DialogTitle>
                <DialogDescription>
                  Masukkan nama, jabatan, dan komentar Anda. Ulasan akan ditampilkan setelah disimpan.
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4 py-4" onSubmit={handleReviewSubmit}>
                <label className="grid gap-2 text-sm text-slate-300">
                  Nama
                  <input
                    value={reviewForm.name}
                    onChange={(event) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Nama Anda"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  Jabatan
                  <input
                    value={reviewForm.role}
                    onChange={(event) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        role: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Jabatan Anda"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  Ulasan
                  <textarea
                    value={reviewForm.quote}
                    onChange={(event) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        quote: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Tulis ulasan Anda di sini"
                  />
                </label>
                <DialogFooter className="gap-2">
                  <Button type="submit" disabled={submittingReview}>
                    {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className={"grid gap-6 " + (testimonials.length === 0 ? 'justify-items-center' : 'lg:grid-cols-3')}>
          {testimonials.length === 0 ? (
            <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl text-center text-slate-300 w-full max-w-xl">
              Belum ada ulasan pengunjung.
            </div>
          ) : (
            testimonials.map((item, index) => (
              <div key={item.id ?? index} className="glass rounded-3xl p-8 border border-white/10 shadow-2xl">
                <p className="text-2xl italic font-[cursive] text-emerald-400 mb-6">{item.quote}</p>
                <div>
                  <p className="text-lg font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-slate-400">{item.role}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {galleryItems.length > 0 && (
          <div className="mt-14 glass rounded-3xl border border-white/10 p-6 bg-slate-950/80">
            <div className="mb-8 text-center">
              <h3 className="text-3xl font-black text-white">Galeri Kegiatan</h3>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/90 p-4">
              <div className="gallery-marquee items-center">
                {galleryItems.concat(galleryItems).map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => openGalleryPreview(item)}
                    className="min-w-[260px] flex-shrink-0 rounded-3xl overflow-hidden border border-white/10 bg-slate-900/80 shadow-xl relative focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {item.isVideo ? (
                      <div className="relative h-52 w-full">
                        <video className="h-52 w-full object-cover" src={`/api/image?url=${encodeURIComponent(item.url)}`} loop />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-2xl">▶</div>
                      </div>
                    ) : (
                      <img
                        src={`/api/image?url=${encodeURIComponent(item.url)}`}
                        alt={item.title || `Galeri ${index + 1}`}
                        className="h-52 w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/520x300?text=Gambar+tidak+tersedia';
                        }}
                      />
                    )}

                    {(item.title || item.description) && (
                      <div className="absolute left-0 right-0 bottom-0 bg-black/50 px-4 py-3">
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        {item.description && <div className="text-xs text-slate-300 mt-1">{item.description}</div>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <Dialog open={galleryPreviewOpen} onOpenChange={setGalleryPreviewOpen}>
          <DialogContent className="max-w-4xl min-w-[70vw] p-0 overflow-hidden bg-slate-950">
            <DialogHeader>
              <DialogTitle>{activeGalleryItem?.title || 'Preview Galeri'}</DialogTitle>
            </DialogHeader>
            <div className="relative bg-black">
              <button
                type="button"
                onClick={closeGalleryPreview}
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ✕
              </button>

              {activeGalleryItem && activeGalleryItem.isVideo ? (
                <video
                  className="h-[60vh] w-full bg-black object-contain"
                  src={`/api/image?url=${encodeURIComponent(activeGalleryItem.url)}`}
                  controls
                  playsInline
                />
              ) : activeGalleryItem ? (
                <img
                  src={`/api/image?url=${encodeURIComponent(activeGalleryItem.url)}`}
                  alt={activeGalleryItem.title || 'Preview galeri'}
                  className="h-[60vh] w-full object-contain bg-black"
                />
              ) : null}
            </div>

            {activeGalleryItem && (
              <div className="space-y-2 p-6 text-left text-white">
                <h3 className="text-2xl font-bold">{activeGalleryItem.title || 'Preview Galeri'}</h3>
                {activeGalleryItem.description && <p className="text-slate-300">{activeGalleryItem.description}</p>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>

    </div>
  );
}