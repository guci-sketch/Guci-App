import React, { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MapPin } from 'lucide-react';

// Global guard against Leaflet zoom-transition race when map container unmounts mid-transition
if (typeof L !== 'undefined' && L.Map && L.Map.prototype) {
  const proto = L.Map.prototype as any;
  if (!proto.__safePanePosPatched) {
    proto.__safePanePosPatched = true;
    const origGetMapPanePos = proto._getMapPanePos;
    if (typeof origGetMapPanePos === 'function') {
      proto._getMapPanePos = function () {
        if (!this._mapPane) return new L.Point(0, 0);
        return origGetMapPanePos.call(this);
      };
    }
    const origOnZoomEnd = proto._onZoomTransitionEnd;
    if (typeof origOnZoomEnd === 'function') {
      proto._onZoomTransitionEnd = function () {
        if (!this._mapPane) return;
        return origOnZoomEnd.call(this);
      };
    }
  }
}

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  className?: string;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const safeInvalidate = () => {
      try {
        if ((map as any)._loaded && (map as any)._mapPane) {
          map.invalidateSize({ animate: false });
        }
      } catch {
        // ignore if map is unmounting
      }
    };

    const timeout = setTimeout(safeInvalidate, 200);
    const resizeObserver = new ResizeObserver(safeInvalidate);

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

function MapCenterTracker({ onCenterChanged, readOnly }: { onCenterChanged: (lat: number, lng: number) => void; readOnly: boolean }) {
  const map = useMapEvents({
    moveend: () => {
      if (!readOnly && (map as any)._loaded && (map as any)._mapPane) {
        const center = map.getCenter();
        onCenterChanged(center.lat, center.lng);
      }
    },
  });
  return null;
}

function MapPanner({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (!(map as any)._loaded || !(map as any)._mapPane) return;
      const currentCenter = map.getCenter();
      const distance = map.distance(currentCenter, [lat, lng]);
      if (distance > 10) {
        map.setView([lat, lng], 16, { animate: false });
      }
    } catch {
      // ignore if map is unmounted
    }
  }, [map, lat, lng]);
  return null;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  readOnly = false,
  className = 'h-56 w-full rounded-xl overflow-hidden z-10',
}) => {
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
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapResizer />
        <MapCenterTracker onCenterChanged={handleCenterChanged} readOnly={readOnly} />
        <MapPanner lat={latitude || -6.200000} lng={longitude || 106.816666} />
      </MapContainer>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400] pb-7">
        <MapPin
          size={30}
          className="text-rose-600 drop-shadow-xl animate-bounce"
          style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.4))' }}
          fill="currentColor"
        />
      </div>

      {!readOnly && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded-full shadow-md text-[10px] font-bold tracking-wide pointer-events-none whitespace-nowrap border border-white/10">
          GESER PETA KE TITIK LOKASI
        </div>
      )}
    </div>
  );
};
