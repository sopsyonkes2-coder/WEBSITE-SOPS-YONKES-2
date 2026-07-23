'use client';

import { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import idLocale from '@fullcalendar/core/locales/id';
import { CalendarDays, Search, MapPin, Clock, X, Info, Tag } from 'lucide-react';
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
      // Gunakan jam 00:00:00 agar perbandingan tanggal lebih bersih
      const date = new Date(y, m, d, 0, 0, 0);
      return date;
    }
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

export default function KalenderPage() {
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // State untuk navigasi cepat
  const calendarRef = useRef<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i); // Rentang 10 tahun
  }, []);

  const handleJump = (m: number, y: number) => {
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
  };

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
    const latihanEvents = latihan.map((item: any) => {
      const start = parseDate(item['Tanggal Mulai']);
      const end = parseDate(item['Tanggal Selesai']);
      
      // FullCalendar end date bersifat exclusive. 
      // Jika selesai tanggal 27, kita harus set ke tanggal 28 agar tanggal 27 tetap muncul di kalender.
      let adjustedEnd = end;
      if (end) {
        adjustedEnd = new Date(end);
        adjustedEnd.setDate(adjustedEnd.getDate() + 1);
      }

      return {
        title: item['Kegiatan'],
        start: start,
        end: adjustedEnd,
        backgroundColor: '#16a34a',
        borderColor: '#16a34a',
        allDay: true,
        extendedProps: { tempat: item['Tempat'] || '-', tipe: 'Latihan' }
      };
    }).filter((e: any) => e.start);

    const liburEvents = libur.map((item: any) => {
      const start = parseDate(item['Tanggal']);
      return {
        title: item['Kegiatan'],
        start: start,
        end: undefined, // Tambahkan properti end meskipun nilainya undefined
        backgroundColor: '#dc2626',
        borderColor: '#dc2626',
        allDay: true,
        extendedProps: { tempat: 'Nasional', tipe: 'Libur Nasional' }
      };
    }).filter((e: any) => e.start);

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
    <div className="min-h-screen military-gradient px-4 sm:px-6 pt-28 pb-20 w-full">
      <motion.h1 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black text-center mb-12 bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent"
      >
        KALENDER OPERASI & LATIHAN
      </motion.h1>

      {/* Custom Style untuk mempercantik Kalender */}
      <style dangerouslySetInnerHTML={{ __html: `
        .fc .fc-toolbar-title {
          font-size: 1.5rem !important;
          font-weight: 800;
          background: linear-gradient(to right, #34d399, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .fc .fc-button-primary {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          text-transform: capitalize;
          font-weight: 600;
          border-radius: 12px !important;
          transition: all 0.2s ease;
        }
        .fc .fc-button-primary:hover {
          background-color: #1e293b !important;
          border-color: #10b981 !important;
          color: #10b981 !important;
        }
        .fc .fc-button-active {
          background-color: #10b981 !important;
          border-color: #10b981 !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: rgba(51, 65, 85, 0.5) !important;
        }
        /* Styling Angka Tanggal */
        .fc-daygrid-day-number {
          color: white !important;
          font-size: clamp(1rem, 2vw, 1.5rem) !important; /* Ukuran responsif */
          font-weight: 900 !important;
          padding: 12px !important;
          text-decoration: none !important;
          opacity: 0.9;
        }
        /* Styling Hari Libur & Minggu (Red Day) */
        .highlight-red-day {
          background-color: rgba(220, 38, 38, 0.15) !important;
          transition: all 0.2s ease;
        }
        .highlight-red-day:hover {
          background-color: rgba(220, 38, 38, 0.25) !important;
        }
        .fc-day-sun { background-color: transparent; } /* Reset default FullCalendar Sunday */

        /* Styling Kotak Tanggal agar terlihat clickable */
        .fc-daygrid-day {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .fc-daygrid-day:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        /* Styling Judul Hari (Senin, Selasa, dsb) */
        .fc-col-header-cell-cushion {
          color: #94a3b8 !important;
          font-weight: 700 !important;
          padding: 10px 0 !important;
          text-transform: uppercase;
          font-size: 0.875rem;
        }
        /* Styling Baris Kegiatan */
        .fc-event {
          cursor: pointer;
          color: white !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          margin: 2px !important;
          font-weight: 600 !important;
          border: none !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }
        .fc-event:hover {
          transform: translateY(-1px) scale(1.02);
          filter: brightness(1.1);
        }
        .fc-day-today {
          background: rgba(16, 185, 129, 0.05) !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          color: #10b981 !important;
        }
        /* Perbaikan untuk Tampilan List/Agenda agar tidak putih di atas putih */
        .fc-list {
          background: transparent !important;
          border: none !important;
        }
        .fc-list-day-cushion {
          background: rgba(15, 23, 42, 0.8) !important;
        }
        .fc-list-event {
          background: transparent !important;
        }
        .fc-list-event:hover td {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .fc-list-event-title {
          color: white !important;
          font-weight: 600;
        }
        /* Perbaikan tampilan Mobile */
        @media (max-width: 640px) {
          .fc .fc-toolbar { flex-direction: column; gap: 10px; }
          .fc-daygrid-day-number { font-size: 1.1rem !important; padding: 6px !important; }
          .fc-event-title { font-size: 0.7rem !important; }
        }
      `}} />

      <div className="glass p-6 rounded-3xl mb-8 flex flex-col md:flex-row gap-4 items-center">
        {/* Pencarian */}
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Navigasi Cepat */}
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={selectedMonth}
            onChange={(e) => {
              const m = parseInt(e.target.value);
              setSelectedMonth(m);
              handleJump(m, selectedYear);
            }}
            className="flex-grow md:w-40 bg-slate-900/80 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 cursor-pointer hover:bg-slate-800 transition-all font-bold"
          >
            {months.map((m, i) => <option key={i} value={i} className="bg-slate-900">{m}</option>)}
          </select>

          <select 
            value={selectedYear}
            onChange={(e) => {
              const y = parseInt(e.target.value);
              setSelectedYear(y);
              handleJump(selectedMonth, y);
            }}
            className="w-28 bg-slate-900/80 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 cursor-pointer hover:bg-slate-800 transition-all font-bold"
          >
            {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
          </select>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 mb-12 overflow-hidden text-white">
        <FullCalendar
          ref={calendarRef}
          locale={idLocale}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={filteredEvents}
          displayEventTime={false}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth',
          }}
          eventClick={(info) => {
            setSelectedEvent({
              title: info.event.title,
              start: info.event.start,
              end: info.event.end,
              extendedProps: info.event.extendedProps,
              color: info.event.backgroundColor
            });
          }}
          dateClick={(info) => {
            // Efek feedback saat tanggal diklik (bisa dikembangkan lebih lanjut)
            console.log('Tanggal diklik:', info.dateStr);
          }}
          dayCellClassNames={(arg) => {
            const d = arg.date;
            const isSunday = d.getDay() === 0;
            
            // Buat penanda waktu 00:00 untuk hari ini di kalender
            const cellTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

            // Cek apakah ada Libur Nasional di tanggal ini
            const isHoliday = events.some((e: any) => 
              e.extendedProps.tipe === 'Libur Nasional' && 
              e.start && new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate()).getTime() === cellTime
            );

            // Cek apakah ada Latihan di tanggal ini
            const hasLatihan = events.some((e: any) => 
              e.extendedProps.tipe === 'Latihan' && e.start && e.end &&
              cellTime >= new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate()).getTime() && 
              cellTime < new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate()).getTime()
            );

            // Warnai merah jika Minggu/Libur DAN tidak ada Latihan
            if ((isSunday || isHoliday) && !hasLatihan) {
              return ['highlight-red-day'];
            }
            return [];
          }}
          datesSet={(arg) => {
            // Sinkronisasi dropdown saat tombol prev/next diklik manual di kalender
            const date = arg.view.calendar.getDate();
            setSelectedMonth(date.getMonth());
            setSelectedYear(date.getFullYear());
          }}
        />
      </div>

      {/* Modal Detail Kegiatan */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-lg w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
            >
              <div className="p-6 relative">
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <Info size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white pr-8">Detail Kegiatan</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Nama Kegiatan</label>
                    <div className="text-xl font-bold text-white leading-tight">{selectedEvent.title}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Clock size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tanggal</span>
                      </div>
                      <div className="text-sm font-medium text-slate-200">
                        {(() => {
                          const start = selectedEvent.start;
                          const end = selectedEvent.end;
                          
                          // Karena end date di FullCalendar bersifat eksklusif (+1 hari), 
                          // kita kurangi 1 hari untuk tampilan tanggal selesai yang sebenarnya.
                          const realEnd = end ? new Date(end.getTime() - 86400000) : null;

                          if (!realEnd || start.getTime() === realEnd.getTime()) {
                            return start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                          }

                          return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${realEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                        })()}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2 text-amber-400 mb-1">
                        <MapPin size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Lokasi</span>
                      </div>
                      <div className="text-sm font-medium text-slate-200">{selectedEvent.extendedProps.tempat}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-cyan-400 mb-1">
                      <Tag size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Kategori</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEvent.color }}></div>
                      <div className="text-sm font-medium text-slate-200">{selectedEvent.extendedProps.tipe}</div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="w-full mt-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  TUTUP DETAIL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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