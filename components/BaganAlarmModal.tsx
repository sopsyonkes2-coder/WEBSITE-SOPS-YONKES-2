'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function BaganAlarmModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <div
        onClick={() => setIsOpen(true)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img
          src="/images/bagan alarm.jpg"
          alt="Bagan Alarm"
          className="max-w-full h-auto rounded-lg shadow-lg"
        />
      </div>

      {/* Modal Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)} // Klik background untuk tutup
        >
          {/* Modal Content */}
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Supaya tidak tertutup saat klik gambar
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 z-[1000] bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Image Container dengan Scroll jika gambar terlalu tinggi */}
            <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
              <img
                src="/images/bagan alarm.jpg"
                alt="Bagan Alarm - Detail"
                className="max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}