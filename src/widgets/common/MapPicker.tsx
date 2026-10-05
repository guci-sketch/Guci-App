import React, { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  className?: string;
}

// 1. Perbaikan Bug "Grey Map" / Render Modal:
// Memaksa Leaflet menghitung ulang ukurannya setelah modal selesai di-render.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Timeout memberi waktu agar animasi modal (fade/zoom) selesai
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    
    // Observer jika layar diputar / di-resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
    }
    
    return () => {
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

// 2. Perbaikan Sinkronisasi Titik:
// Melacak kordinat tengah peta saat digeser (pan/drag), bukan berdasarkan klik.
function MapCenterTracker({ onCenterChanged, readOnly }: { onCenterChanged: (lat: number, lng: number) => void, readOnly: boolean }) {
  const map = useMapEvents({
    moveend: () => {
      if (!readOnly) {
        const center = map.getCenter();
        onCenterChanged(center.lat, center.lng);
      }
    }
  });
  return null;
}

// 3. Sinkronisasi Kordinat Eksternal:
// Pindahkan map view ketika props latitude/longitude diubah dari luar (misalnya dari hasil geocoding)
function MapPanner({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    // Only pan if the map's current center is significantly different
    const currentCenter = map.getCenter();
    const distance = map.distance(currentCenter, [lat, lng]);
    // If distance > 10 meters, pan to new location
    if (distance > 10) {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
    }
  }, [map, lat, lng]);
  return null;
}

export const MapPicker: React.FC<MapPickerProps> = ({ 
  latitude, 
  longitude, 
  onChange, 
  readOnly = false, 
  className = "h-64 w-full rounded-xl overflow-hidden z-10" 
}) => {
  // Gunakan lokasi dari props, atau fallback ke Jakarta Pusat jika kosong
  const center = [latitude || -6.200000, longitude || 106.816666] as [number, number];

  const handleCenterChanged = useCallback((lat: number, lng: number) => {
    if (onChange) {
      onChange(lat, lng);
    }
  }, [onChange]);

  return (
    <div className={`relative ${className} bg-slate-100`}>
      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizer />
        <MapCenterTracker onCenterChanged={handleCenterChanged} readOnly={readOnly} />
        <MapPanner lat={latitude || -6.200000} lng={longitude || 106.816666} />
      </MapContainer>
      
      {/* 3. PIN Statis di Tengah Layar:
          Pin ini tidak menempel di koordinat peta, tapi diam tepat di tengah kotak (crosshair).
          Saat peta digeser, kordinat peta di bawah pin ini yang akan diambil.
          Ini menghilangkan bug "titik melenceng dari kursor/sentuhan".
      */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400] pb-8">
         <MapPin 
           size={36} 
           className="text-rose-600 drop-shadow-xl animate-bounce" 
           style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.4))' }} 
           fill="currentColor" 
         />
      </div>

      {!readOnly && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg text-[11px] font-bold tracking-wide pointer-events-none whitespace-nowrap border border-white/10">
          GESER PETA KE TITIK LOKASI
        </div>
      )}
    </div>
  );
};
