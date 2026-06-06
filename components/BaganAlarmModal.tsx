'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function BaganAlarmModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img
          src="/images/bagan alarm.jpg"
          alt="Bagan Alarm"
          className="max-w-full h-auto rounded-lg shadow-lg"
          style={{ maxWidth: '900px' }}
        />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 z-[1000] bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={32} />
          </button>

          <img
            src="/images/bagan alarm.jpg"
            alt="Bagan Alarm - Fullscreen"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
