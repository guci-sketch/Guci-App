const fs = require('fs');
let code = fs.readFileSync('src/components/executor/CreateProjectModal.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { CreateProjectInput } from '../../api/projects';",
  "import { CreateProjectInput } from '../../api/projects';\nimport { geocodeAddress, reverseGeocode } from '../../utils/geocoding';"
);

// 2. Add states
const stateInjection = `const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Debounce for geocoding
  React.useEffect(() => {
    if (isMapLocked || !address || address.length < 5) return;
    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      const coords = await geocodeAddress(address);
      if (coords) {
        setLocationLat(coords.lat);
        setLocationLng(coords.lng);
        setIsLocationPicked(true);
      }
      setIsGeocoding(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [address, isMapLocked]);

  const handleLockLocation = async () => {
    setIsGeocoding(true);
    const resultAddress = await reverseGeocode(locationLat, locationLng);
    if (resultAddress) {
      setAddress(resultAddress);
      if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
    }
    setIsMapLocked(true);
    setIsGeocoding(false);
  };`;
code = code.replace("const [isSubmitting, setIsSubmitting] = useState(false);", stateInjection);

// 3. Address Textarea Hint & Loading
code = code.replace(
  `value={address}`,
  `disabled={isMapLocked}
              value={address}`
);

// 4. Map rendering and Lock button
const mapOld = `<MapPicker latitude={locationLat} longitude={locationLng} onChange={(lat, lng) => { setLocationLat(lat); setLocationLng(lng); setIsLocationPicked(true); }} />`;
const mapNew = `<MapPicker latitude={locationLat} longitude={locationLng} onChange={(lat, lng) => { setLocationLat(lat); setLocationLng(lng); setIsLocationPicked(true); setIsMapLocked(false); }} readOnly={isMapLocked} />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                {isGeocoding ? <><Loader2 size={12} className="animate-spin" /> Mencari lokasi...</> : isMapLocked ? 'Titik terkunci' : 'Ketik alamat atau geser peta'}
              </span>
              {isMapLocked ? (
                <button type="button" onClick={() => setIsMapLocked(false)} className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300">
                  Buka Kunci Titik
                </button>
              ) : (
                <button type="button" onClick={handleLockLocation} disabled={isGeocoding || !isLocationPicked} className="px-3 py-1.5 rounded bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] disabled:opacity-50">
                  Kunci Titik Lokasi
                </button>
              )}
            </div>`;
code = code.replace(mapOld, mapNew);

fs.writeFileSync('src/components/executor/CreateProjectModal.tsx', code);
