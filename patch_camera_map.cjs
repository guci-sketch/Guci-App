const fs = require('fs');
let code = fs.readFileSync('src/components/camera/CameraCaptureModal.tsx', 'utf8');

if (!code.includes('MapPicker')) {
  code = code.replace(
    "import { PhotoType } from '../../types';",
    "import { PhotoType } from '../../types';\nimport { MapPicker } from '../common/MapPicker';"
  );
}

// Replace the Denied screen with a Map picker fallback!
const deniedRegex = /\{gps\.status === 'denied' && \([\s\S]*?<\/div>\s*\)\}/;

const mapFallback = `{gps.status === 'denied' && (
              <div className="absolute inset-0 z-50 flex flex-col bg-slate-950 p-4">
                <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-700">
                  <MapPicker 
                    latitude={projectLat} 
                    longitude={projectLng} 
                    onChange={(lat, lng) => {
                      // Silently update the GPS state to ready using the map's pinned location
                      setGps({ status: 'ready', latitude: lat, longitude: lng, accuracy: 50 });
                    }}
                  />
                  <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-[400] pointer-events-none">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2"><MapPin size={16} className="text-rose-400" /> Sinyal GPS Lemah</h3>
                    <p className="text-slate-300 text-[10px] mt-1">Geser peta untuk menentukan posisi akurat Anda saat ini secara manual.</p>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={onClose} className="py-3 px-4 rounded-xl bg-slate-800 text-white font-semibold text-sm transition-colors hover:bg-slate-700">
                    Batal
                  </button>
                  <button 
                    onClick={() => {
                      // It updates onChange, so we just dismiss the overlay if they are happy
                      setGps(prev => prev.status === 'ready' ? prev : { status: 'ready', latitude: projectLat, longitude: projectLng, accuracy: 50 });
                    }} 
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Konfirmasi Posisi
                  </button>
                </div>
              </div>
            )}`;

code = code.replace(deniedRegex, mapFallback);

fs.writeFileSync('src/components/camera/CameraCaptureModal.tsx', code);
