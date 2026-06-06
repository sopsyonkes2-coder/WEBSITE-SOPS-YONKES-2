import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
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
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <ClientProviders>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          {/* WhatsApp floating button */}
          <a
            href="https://wa.me/6285859114726?text=Hallo%20Admin%20saya%20mau%20bertanya"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat via WhatsApp"
            className="fixed right-6 bottom-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.52 3.48A11.92 11.92 0 0012.01 0C5.38 0 .01 5.37.01 12c0 2.11.55 4.17 1.59 5.99L0 24l6.27-1.64A11.95 11.95 0 0012.01 24c6.63 0 12.01-5.37 12.01-12 0-3.21-1.25-6.22-3.5-8.52zM12.01 21.6c-1.4 0-2.78-.36-3.98-1.04l-.28-.16-3.72.97.99-3.62-.18-.3A8.46 8.46 0 013.53 12c0-4.69 3.82-8.5 8.48-8.5 2.27 0 4.4.88 6.01 2.49a8.45 8.45 0 012.48 6.01c0 4.68-3.81 8.6-8.49 8.6z" />
              <path d="M17.2 14.06c-.27-.14-1.6-.78-1.85-.86-.25-.08-.43-.14-.61.14-.18.27-.7.86-.86 1.04-.16.18-.33.2-.6.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.56.12-.12.27-.33.4-.5.13-.17.18-.28.27-.47.09-.18.05-.35-.02-.49-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47l-.53-.01c-.18 0-.47.07-.72.35-.25.28-.96.94-.96 2.3 0 1.36.98 2.67 1.12 2.86.14.18 1.93 2.97 4.68 4.05 1.04.45 1.85.72 2.48.92.99.31 1.89.27 2.6.16.79-.12 1.6-.66 1.82-1.3.22-.64.22-1.19.15-1.31-.07-.12-.26-.18-.54-.31z" fill="#fff" />
            </svg>
          </a>
          <Toaster position="top-center" richColors closeButton />
        </ClientProviders>
      </body>
    </html>
  );
}