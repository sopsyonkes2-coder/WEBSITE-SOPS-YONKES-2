'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ReviewItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

const ADMIN_PASSWORD = 'COBRALINUD02';
const ADMIN_STORAGE_KEY = 'yonkes-admin-authenticated';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(ADMIN_STORAGE_KEY) : null;
    setAuthenticated(saved === 'true');
  }, []);

  const {
    data: reviews = [],
    isLoading,
  } = useQuery<ReviewItem[]>({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error('Gagal memuat ulasan');
      return res.json();
    },
    enabled: authenticated,
  });

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      setAuthenticated(true);
      setAuthError('');
      toast.success('Berhasil masuk sebagai admin.');
      return;
    }

    setAuthError('Password salah. Silakan coba lagi.');
  };

  const handleLogout = () => {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAuthenticated(false);
    setPassword('');
    toast.success('Admin logout berhasil.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus ulasan ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal menghapus ulasan.');
      }

      toast.success('Ulasan berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    } catch (error) {
      toast.error((error as Error).message || 'Gagal menghapus ulasan.');
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.14),_transparent_30%),#020617] text-slate-100 py-14 px-4 sm:px-6 w-full">
      <div className="w-full px-0">
        <div className="mb-10 rounded-[2.5rem] border border-white/10 bg-slate-950/80 p-10 shadow-2xl backdrop-blur-xl overflow-hidden relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-400/10 to-transparent" />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <p className="text-emerald-300 uppercase tracking-[0.35em] text-xs font-semibold mb-3">
                Admin Portal
              </p>
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                Panel Kontrol Ulasan
              </h1>
              <p className="mt-5 max-w-2xl text-slate-400 leading-relaxed">
                Kelola ulasan pengunjung dengan cepat dan aman. Hanya admin yang memiliki akses dapat melihat dan menghapus data yang tidak sesuai.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 border border-emerald-500/20">
                  Hak akses admin
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-900/80 px-4 py-2 text-sm text-slate-300 border border-white/10">
                  Akses aman hanya di /admin
                </span>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Status Login</p>
                  <p className="text-xl font-semibold text-white">{authenticated ? 'Tersedia' : 'Belum masuk'}</p>
                </div>
                <div className="rounded-3xl bg-slate-800 px-4 py-2 text-sm text-slate-200">Admin</div>
              </div>
              <p className="text-slate-400 leading-relaxed">
                {authenticated
                  ? 'Anda sudah masuk dan dapat mengelola review pengunjung. Gunakan tombol logout untuk mengakhiri sesi.'
                  : 'Masukkan kata sandi admin untuk membuka panel manajemen ulasan dan melihat daftar ulasan terbaru.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8">
          {!authenticated ? (
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
              <h2 className="text-3xl font-semibold text-white mb-4">Login Admin</h2>
              <p className="text-slate-400 mb-8">
                Silakan masukkan kata sandi untuk membuka akses administrasi ulasan.
              </p>
              <form className="grid gap-4 max-w-xl" onSubmit={handleLogin}>
                <label className="grid gap-2 text-sm text-slate-300">
                  Kata sandi admin
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none focus:border-emerald-400"
                    placeholder="Masukkan kata sandi"
                  />
                </label>
                {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
                <Button type="submit" className="w-full justify-center">
                  Masuk
                </Button>
              </form>
            </div>
          ) : (
            <div className="grid gap-8">
              <section className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Total Ulasan</p>
                  <p className="mt-4 text-4xl font-black text-white">{reviews.length}</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Panel</p>
                  <p className="mt-4 text-4xl font-black text-white">Admin Review</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Login</p>
                  <p className="mt-4 text-4xl font-black text-white">Aman</p>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Daftar Ulasan</h2>
                    <p className="text-slate-400 mt-1">Hapus ulasan yang bermasalah dengan satu klik.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })}>
                      Segarkan
                    </Button>
                    <Button variant="destructive" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 text-slate-400">
                    Memuat ulasan...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 text-slate-400">
                    Belum ada ulasan pengunjung.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-inner shadow-black/10">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-white">{review.name}</p>
                            <p className="text-sm text-slate-400">{review.role}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(review.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </Button>
                        </div>
                        <p className="mt-4 text-slate-300 leading-relaxed">{review.quote}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
