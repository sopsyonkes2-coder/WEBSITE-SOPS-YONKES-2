'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import idLocale from '@fullcalendar/core/locales/id';
import { CalendarDays, Search, MapPin, Clock } from 'lucide-react';
import { fetchSheetData, valuesToObjects } from '@/lib/googleSheets';

// Fungsi parsing tanggal yang aman & akurat
function parseDate(dateInput: any): Date | undefined {
  if (!dateInput) return undefined;
  
  if (typeof dateInput === 'number') {
    return new Date((dateInput - 25569) * 86400 * 1000);
  }

  const str = dateInput.toString().trim().toLowerCase();
  
  // Penanganan format "DD Month YYYY"
  const months: Record<string, number> = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };
  
  const parts = str.split(' ');
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = months[parts[1]];
    const y = parseInt(parts[2]);
    if (!isNaN(d) && m !== undefined && !isNaN(y)) {
      // MENGGUNAKAN UTC AGAR TIDAK TERGANTUNG ZONA WAKTU LOKAL
      // Set jam ke 12:00 untuk mengunci tanggal
      const date = new Date(Date.UTC(y, m, d, 12, 0, 0));
      return date;
    }
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

export default function KalenderPage() {
  const [search, setSearch] = useState('');

  const { data: latihan = [] } = useQuery({
    queryKey: ['kalender-latihan'],
    queryFn: async () => {
      const values = await fetchSheetData('KALENDER LATIHAN');
      return valuesToObjects<any>(values);
    },
  });

  const { data: libur = [] } = useQuery({
    queryKey: ['kalender-libur'],
    queryFn: async () => {
      const values = await fetchSheetData('KALENDER LIBUR NASIONAL');
      return valuesToObjects<any>(values);
    },
  });

  const events = useMemo(() => {
    const latihanEvents = latihan.map((item: any) => ({
      title: item['Kegiatan'],
      start: parseDate(item['Tanggal Mulai']),
      end: parseDate(item['Tanggal Selesai']),
      backgroundColor: '#16a34a',
      borderColor: '#16a34a',
      extendedProps: { tempat: item['Tempat'] || '-', tipe: 'Latihan' }
    })).filter((e: any) => e.start);

    const liburEvents = libur.map((item: any) => ({
      title: item['Kegiatan'],
      start: parseDate(item['Tanggal']),
      backgroundColor: '#dc2626',
      borderColor: '#dc2626',
      extendedProps: { tempat: 'Nasional', tipe: 'Libur Nasional' }
    })).filter((e: any) => e.start);

    return [...latihanEvents, ...liburEvents];
  }, [latihan, libur]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e: any) => e.start >= now)
      .sort((a: any, b: any) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [events]);

  const filteredEvents = events.filter((e: any) => 
    e.title?.toLowerCase().includes(search.toLowerCase()) || 
    e.extendedProps?.tempat?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen military-gradient pt-28 pb-20 px-6 max-w-7xl mx-auto">
      <motion.h1 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black text-center mb-12 bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent"
      >
        KALENDER OPERASI & LATIHAN
      </motion.h1>

      <div className="glass p-6 rounded-3xl mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kegiatan atau tempat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
          />
        </div>
      </div>

      <div className="glass rounded-3xl p-6 mb-12 overflow-hidden text-white">
        <FullCalendar
          locale={idLocale}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={filteredEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth',
          }}
        />
      </div>

      <div className="glass rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <CalendarDays className="text-emerald-400" />
          <h2 className="text-3xl font-bold">KEGIATAN KE DEPAN</h2>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-slate-400 text-center py-10">Tidak ada agenda ke depan.</div>
        ) : (
          <div className="grid gap-4">
            {upcomingEvents.map((event: any, index: number) => (
              <div key={index} className="glass p-6 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="text-xl font-bold text-white">{event.title}</div>
                  <div className="flex items-center gap-4 text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Clock size={16} /> {event.start.toLocaleDateString('id-ID')}</span>
                    <span className="flex items-center gap-1"><MapPin size={16} /> {event.extendedProps.tempat}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}