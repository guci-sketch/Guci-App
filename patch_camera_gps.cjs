const fs = require('fs');
let code = fs.readFileSync('src/components/camera/CameraCaptureModal.tsx', 'utf8');

const regex = /navigator\.geolocation\.getCurrentPosition\(\s*pos => setGps\(\{ status: 'ready', latitude: pos\.coords\.latitude, longitude: pos\.coords\.longitude, accuracy: pos\.coords\.accuracy \|\| 15 \}\),\s*err => setGps\(\{ status: 'denied', message: err\.code === err\.PERMISSION_DENIED \? 'Izin lokasi ditolak\. Aktifkan GPS dan izinkan akses lokasi untuk melanjutkan\.' : 'Lokasi belum tersedia\. Pastikan GPS aktif dan coba lagi\.' \}\),\s*\{ enableHighAccuracy: true, timeout: 10000 \}\s*\);/;

const fallback = `navigator.geolocation.getCurrentPosition(
      pos => setGps({ status: 'ready', latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy || 15 }),
      err => {
        console.warn('High accuracy GPS failed, falling back to low accuracy...', err);
        navigator.geolocation.getCurrentPosition(
          pos2 => setGps({ status: 'ready', latitude: pos2.coords.latitude, longitude: pos2.coords.longitude, accuracy: pos2.coords.accuracy || 50 }),
          err2 => setGps({ status: 'denied', message: err2.code === err2.PERMISSION_DENIED ? 'Izin lokasi ditolak. Aktifkan GPS peramban.' : 'Sinyal GPS lemah atau tidak tersedia. Pastikan fitur Lokasi HP menyala.' }),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );`;

code = code.replace(regex, fallback);
fs.writeFileSync('src/components/camera/CameraCaptureModal.tsx', code);
