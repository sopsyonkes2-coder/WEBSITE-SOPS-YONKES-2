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

export default function AdminSecretPage() {
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
      toast.success('Anda berhasil masuk sebagai admin.');
      return;
    }

    setAuthError('Password salah. Pastikan Anda memasukkan kata sandi admin.');
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
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 w-full">
      <div className="w-full px-0">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-emerald-400 uppercase tracking-[0.35em] text-xs font-semibold mb-2">
              Halaman Admin Tersembunyi
            </p>
            <h1 className="text-4xl font-black text-white mb-4">Panel Admin Ulasan</h1>
            <p className="text-slate-400 leading-relaxed">
              Hanya admin yang dapat menghapus ulasan pengunjung. Masukkan kata sandi admin untuk mengakses.
            </p>
          </div>

          {!authenticated ? (
            <form className="grid gap-4 max-w-xl" onSubmit={handleLogin}>
              <label className="grid gap-2 text-sm text-slate-300">
                Kata sandi admin
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  placeholder="Masukkan kata sandi"
                />
              </label>
              {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
              <Button type="submit">Masuk sebagai Admin</Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-slate-400">
                    Anda sedang masuk sebagai admin. Hanya admin dapat menghapus ulasan di sini.
                  </p>
                </div>
                <Button variant="secondary" onClick={handleLogout}>
                  Logout Admin
                </Button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950 p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Ulasan Pengunjung</h2>
                    <p className="text-slate-400 mt-1">
                      Hapus ulasan yang tidak sesuai langsung dari halaman admin.
                    </p>
                  </div>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })}>
                    Muat ulang
                  </Button>
                </div>

                {isLoading ? (
                  <p className="text-slate-400">Memuat ulasan...</p>
                ) : reviews.length === 0 ? (
                  <p className="text-slate-400">Belum ada ulasan pengunjung.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-3xl border border-white/10 bg-slate-900 p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold text-white">{review.name}</p>
                            <p className="text-slate-400">{review.role}</p>
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
                        <p className="mt-4 text-slate-300">{review.quote}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
