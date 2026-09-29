const fs = require('fs');
let code = fs.readFileSync('src/components/camera/CameraCaptureModal.tsx', 'utf8');

code = code.replace(/if \(!navigator\.geolocation\) \{/g, `
    if (!navigator.geolocation) {
`);

const replacement = `
    navigator.geolocation.getCurrentPosition(
      pos => {
        // ANTI-SPOOFING / FAKE LOCATION CHECK (Mocked location detection)
        // Note: Full prevention requires native app APIs, but we can do a heuristic check
        // Often, mocked locations on Android report exactly 0.0 or very perfectly rounded accuracy/altitude, 
        // or lack altitude entirely when high accuracy is requested. 
        // We reject if it looks suspicious.
        const isSuspicious = pos.coords.accuracy === 0; // Impossible in real-world GPS
        
        if (isSuspicious) {
           setGps({ status: 'denied', message: 'Sistem mendeteksi penggunaan Fake GPS / Lokasi Palsu. Mohon matikan aplikasi Fake GPS dan coba lagi.' });
           return;
        }

        setGps({ status: 'ready', latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy || 15 });
      },
      err => {
        console.warn('High accuracy GPS failed, falling back to low accuracy...', err);
        navigator.geolocation.getCurrentPosition(
          pos2 => {
            if (pos2.coords.accuracy === 0) {
              setGps({ status: 'denied', message: 'Sistem mendeteksi penggunaan Fake GPS / Lokasi Palsu. Mohon matikan aplikasi Fake GPS dan coba lagi.' });
              return;
            }
            setGps({ status: 'ready', latitude: pos2.coords.latitude, longitude: pos2.coords.longitude, accuracy: pos2.coords.accuracy || 50 });
          },
          err2 => setGps({ status: 'denied', message: err2.code === err2.PERMISSION_DENIED ? 'Izin lokasi ditolak. Aktifkan GPS peramban.' : 'Sinyal GPS lemah atau tidak tersedia. Pastikan fitur Lokasi HP menyala.' }),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
`;

code = code.replace(/navigator\.geolocation\.getCurrentPosition\([\s\S]*?\{ enableHighAccuracy: true, timeout: 8000 \}\s*\);/, replacement.trim());

fs.writeFileSync('src/components/camera/CameraCaptureModal.tsx', code);
