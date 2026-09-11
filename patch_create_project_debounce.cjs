const fs = require('fs');
let code = fs.readFileSync('src/components/executor/CreateProjectModal.tsx', 'utf8');

// Modify the effect to run geocoding only when the address explicitly changes by typing
const newEffect = `
  // Debounce for geocoding
  React.useEffect(() => {
    // Only auto-pan if the map is NOT locked, the address has some content, 
    // AND the user hasn't explicitly picked a location from the map yet (or we want address to override)
    if (isMapLocked || !address || address.length < 5) return;
    
    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      const coords = await geocodeAddress(address);
      if (coords) {
        setLocationLat(coords.lat);
        setLocationLng(coords.lng);
        // We don't set location picked here, so the map panning doesn't get blocked
      }
      setIsGeocoding(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [address]); // removed isMapLocked from deps so it doesn't retrigger when unlocking
`;

code = code.replace(/\/\/ Debounce for geocoding[\s\S]*?\}, \[address, isMapLocked\]\);/, newEffect.trim());

fs.writeFileSync('src/components/executor/CreateProjectModal.tsx', code);
