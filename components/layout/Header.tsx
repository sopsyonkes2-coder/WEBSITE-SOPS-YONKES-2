'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Home, Users, FileText, Calendar, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/profil', label: 'Profil', icon: Users },
  { href: '/dokumen', label: 'Dokumen', icon: FileText },
  { href: '/kalender', label: 'Kalender', icon: Calendar },
  { href: '/anggaran', label: 'Anggaran', icon: DollarSign },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setHidden(current > lastScrollY && current > 80);
      setLastScrollY(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-700"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg bg-slate-950/50 flex items-center justify-center">
            <Image
              src="/images/logo-yonkes.png"
              alt="Logo Yonkes 2"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-xl tracking-tight text-white">SOPS YONKES 2</div>
            <div className="text-[10px] text-slate-400 -mt-1">KOSTRAD • YBH</div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors"
            >
              <link.icon size={18} />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white p-2"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-800 bg-slate-950"
          >
            <div className="px-6 py-8 flex flex-col gap-6 text-lg">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 text-slate-300 hover:text-white"
                >
                  <link.icon size={24} />
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}