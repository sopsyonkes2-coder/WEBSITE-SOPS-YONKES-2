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

function parseDate(dateString: string) {
  if (!dateString) return null;

  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/');
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  return new Date(dateString);
}

export default function KalenderPage() {
  const [search, setSearch] = useState('');

  const { data: latihan = [] } = useQuery({
    queryKey: ['kalender-latihan'],
    queryFn: async () => {
      const values = await fetchSheetData('KALENDER LATIHAN');
      return valuesToObjects(values);
    },
  });

  const { data: libur = [] } = useQuery({
    queryKey: ['kalender-libur'],
    queryFn: async () => {
      const values = await fetchSheetData('KALENDER LIBUR NASIONAL');
      return valuesToObjects(values);
    },
  });

  const events = useMemo(() => {
    const latihanEvents = latihan.map((item: any) => ({
      title: item['Kegiatan'],
      start: parseDate(item['Tanggal Mulai']),
      end: parseDate(item['Tanggal Selesai']),
      backgroundColor: '#16a34a',
      borderColor: '#16a34a',
      extendedProps: {
        tempat: item['Tempat'],
        tipe: 'Latihan',
      },
    }));

    const liburEvents = libur.map((item: any) => ({
      title: item['Kegiatan'],
      start: parseDate(item['Tanggal']),
      backgroundColor: '#dc2626',
      borderColor: '#dc2626',
      extendedProps: {
        tipe: 'Libur Nasional',
      },
    }));

    return [...latihanEvents, ...liburEvents];
  }, [latihan, libur]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();

    const next14Days = new Date();
    next14Days.setDate(today.getDate() + 14);

    return events
      .filter((event: any) => {
        const eventDate = new Date(event.start);

        return (
          eventDate >= today &&
          eventDate <= next14Days
        );
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.start).getTime() -
          new Date(b.start).getTime()
      );
  }, [events]);

  const filteredEvents = events.filter((event: any) => {
    const keyword = search.toLowerCase();

    return (
      event.title?.toLowerCase().includes(keyword) ||
      event.extendedProps?.tempat
        ?.toLowerCase()
        .includes(keyword)
    );
  });

  return (
    <div className="min-h-screen military-gradient pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-6">

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black text-center mb-12 bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent"
        >
          KALENDER OPERASI & LATIHAN
        </motion.h1>

        {/* SEARCH */}

        <div className="glass p-6 rounded-3xl mb-8">

          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" />

            <input
              type="text"
              placeholder="Cari kegiatan atau tempat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full
                pl-12
                py-3
                rounded-xl
                bg-slate-900
                border
                border-slate-700
                text-white
              "
            />
          </div>

        </div>

        {/* CALENDAR */}

        <div className="glass rounded-3xl p-6 mb-12 overflow-hidden">

          <FullCalendar
  locale={idLocale}
  plugins={[
    dayGridPlugin,
    timeGridPlugin,
    listPlugin,
    interactionPlugin,
  ]}
  initialView="dayGridMonth"
  height="auto"
  dayMaxEvents={3}
  fixedWeekCount={false}
  showNonCurrentDates={true}
  events={filteredEvents.map(event => ({
  ...event,
  start: event.start || new Date() // Jika start null, gunakan tanggal hari ini
}))}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right:
                'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
            }}
          />

        </div>

        {/* UPCOMING EVENT */}

        <div className="glass rounded-3xl p-8">

          <div className="flex items-center gap-3 mb-8">
            <CalendarDays className="text-emerald-400" />
            <h2 className="text-3xl font-bold">
              KEGIATAN 14 HARI KE DEPAN
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-slate-400">
              Tidak ada kegiatan dalam 14 hari ke depan.
            </div>
          ) : (
            <div className="grid gap-4">

              {upcomingEvents.map(
                (event: any, index: number) => {
                  const eventDate = new Date(event.start);

                  const diff =
                    Math.ceil(
                      (
                        eventDate.getTime() -
                        Date.now()
                      ) /
                        (1000 * 60 * 60 * 24)
                    );

                  return (
                    <motion.div
                      key={index}
                      whileHover={{
                        scale: 1.01,
                      }}
                      className="glass p-6 rounded-2xl"
                    >
                      <div className="flex flex-col md:flex-row md:justify-between gap-4">

                        <div>
                          <div className="text-xl font-bold text-white">
                            {event.title}
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 mt-2">
                            <Clock size={16} />
                            {eventDate.toLocaleDateString(
                              'id-ID'
                            )}
                          </div>

                          {event.extendedProps
                            ?.tempat && (
                            <div className="flex items-center gap-2 text-slate-400 mt-2">
                              <MapPin size={16} />
                              {
                                event.extendedProps
                                  .tempat
                              }
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-3xl font-black text-emerald-400">
                            D-{diff}
                          </div>

                          <div className="text-slate-400">
                            Countdown
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
