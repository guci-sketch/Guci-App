const fs = require('fs');
let code = fs.readFileSync('src/components/executor/CreateProjectModal.tsx', 'utf8');

// Add import for MapPicker
if (!code.includes('MapPicker')) {
  code = code.replace(
    "import { ContractType, ServiceType } from '../../types';",
    "import { ContractType, ServiceType } from '../../types';\nimport { MapPicker } from '../common/MapPicker';"
  );
}

// Add state for project location
if (!code.includes('const [locationLat, setLocationLat]')) {
  code = code.replace(
    "const [address, setAddress] = useState('');",
    "const [address, setAddress] = useState('');\n  const [locationLat, setLocationLat] = useState<number>(-6.200000);\n  const [locationLng, setLocationLng] = useState<number>(106.816666);\n  const [isLocationPicked, setIsLocationPicked] = useState(false);\n\n  // Try to get user's location initially for the map center\n  React.useEffect(() => {\n    if (navigator.geolocation && !isLocationPicked) {\n      navigator.geolocation.getCurrentPosition(pos => {\n        setLocationLat(pos.coords.latitude);\n        setLocationLng(pos.coords.longitude);\n      }, () => {}, { enableHighAccuracy: false, timeout: 5000 });\n    }\n  }, []);\n"
  );
}

// Update handleSubmit to use the picked location instead of fetching on submit
code = code.replace(
  /const pos = await new Promise<GeolocationPosition>\(\(resolve, reject\) => \{\s*navigator\.geolocation\.getCurrentPosition\(resolve, reject, \{ enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 \}\);\s*\}\)\.catch\(\(\) => null\);\s*await onSubmit\(\{/g,
  `await onSubmit({`
);

code = code.replace(
  /latitude: pos \? pos\.coords\.latitude : -6\.200000,\s*longitude: pos \? pos\.coords\.longitude : 106\.816666,/g,
  `latitude: locationLat,
        longitude: locationLng,`
);

// Add the MapPicker UI
const addressSection = `<textarea
              id="input-address"
              rows={2}
              placeholder="Jl. Pahlawan Seribu Kav. 1, BSD City, Serpong..."
              value={address}
              onChange={e => {
                setAddress(e.target.value);
                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs resize-none"
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">{errors.address}</p>
            )}`;

const mapSection = `${addressSection}
          </div>
          
          {/* Map Location Picker */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Titik Kordinat Proyek (Geser Pin)
            </label>
            <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-300">
              <MapPicker 
                latitude={locationLat} 
                longitude={locationLng} 
                onChange={(lat, lng) => { setLocationLat(lat); setLocationLng(lng); setIsLocationPicked(true); }}
                className="h-full w-full"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Geser peta untuk menentukan titik akurat yang akan menjadi pusat radius check-in teknisi.</p>`;

code = code.replace(addressSection, mapSection);

fs.writeFileSync('src/components/executor/CreateProjectModal.tsx', code);
