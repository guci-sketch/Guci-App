const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

const replacement = `
      {showGpsPrompt && gpsPermissionStatus !== 'granted' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4 mx-auto">
              <MapPin size={24} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Izinkan Akses GPS</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Fieldwork membutuhkan akses lokasi Anda untuk validasi kehadiran di area proyek (Check-In).
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-6">
              <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1 mb-1">
                <AlertTriangle size={14} /> Tips Error Overlay
              </h4>
              <p className="text-[10px] text-rose-700 leading-relaxed">
                Jika Anda melihat error <strong>"This site can't ask for your permission"</strong> di browser Anda, itu adalah fitur keamanan Android untuk mencegah penipuan klik. <br/><br/>
                Silakan <strong>tutup terlebih dahulu semua gelembung melayang (seperti Chat Bubbles)</strong> atau aplikasi overlay layar lainnya, lalu tekan tombol izinkan di bawah.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    () => { setShowGpsPrompt(false); trackLocation(); },
                    (err) => { 
                      console.error("GPS Request Denied", err); 
                      if(err.code === err.PERMISSION_DENIED) {
                        alert("Izin GPS ditolak secara permanen. Mohon buka Setelan > Situs > Lokasi pada browser Anda, lalu izinkan aplikasi ini.");
                      }
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Izinkan Akses GPS
              </button>
              <button 
                onClick={() => setShowGpsPrompt(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(/\{showGpsPrompt && gpsPermissionStatus !== 'granted' && \([\s\S]*?Nanti Saja[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/, replacement.trim());

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
