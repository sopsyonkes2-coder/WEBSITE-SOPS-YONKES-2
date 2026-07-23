import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Toaster } from 'sonner';
import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portal Staf Operasi Yonkes 2/YBH/2 Kostrad',
  description: 'Sistem Informasi Operasi, Latihan dan Anggaran Yonkes 2 Kostrad',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <ClientProviders>
          <Header />
          <main className="min-h-screen w-full">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
          <Toaster position="top-center" richColors closeButton />
        </ClientProviders>
      </body>
    </html>
  );
}