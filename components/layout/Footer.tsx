export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950/80 border-t border-slate-700 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">SOPS YONKES 2</h3>
            <p className="text-slate-400 text-sm">
              Portal Staf Operasi 
              <br />
              Yonkes 2 / YBH / 2 Kostrad
            </p>
          </div>

          {/* Motto */}
          <div className="flex flex-col justify-center">
            <p className="text-slate-300 italic font-semibold">
              "Siap Siaga, Disiplin, Profesional"
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Untuk Tugas, Untuk Negara
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/" className="hover:text-emerald-400 transition">Beranda</a></li>
              <li><a href="/kalender" className="hover:text-emerald-400 transition">Kalender</a></li>
              <li><a href="/anggaran" className="hover:text-emerald-400 transition">Anggaran</a></li>
              <li><a href="/dokumen" className="hover:text-emerald-400 transition">Dokumen</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm">
              &copy; {currentYear} Sops Yonkes 2 / YBH / 2 Kostrad. All rights reserved.
            </p>
            <p className="text-slate-500 text-xs mt-4 md:mt-0">
              Portal Informasi Operasional
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
