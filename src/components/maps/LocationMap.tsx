import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { formatDistance } from '../../utils/geo';
import { MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

interface LocationMapProps {
  projectName: string;
  projectLat: number;
  projectLng: number;
  projectRadius: number; // meters
  executorLat?: number | null;
  executorLng?: number | null;
  executorAccuracy?: number | null;
  distanceMeters?: number | null;
  isWithinRadius?: boolean | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  height?: string;
  interactive?: boolean;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  projectName,
  projectLat,
  projectLng,
  projectRadius,
  executorLat,
  executorLng,
  executorAccuracy = 10,
  distanceMeters,
  isWithinRadius,
  checkOutLat,
  checkOutLng,
  height = '320px',
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hasExecutorLoc = typeof executorLat === "number" && typeof executorLng === "number";

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const centerLat = hasExecutorLoc ? (projectLat + executorLat!) / 2 : projectLat;
      const centerLng = hasExecutorLoc ? (projectLng + executorLng!) / 2 : projectLng;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: hasExecutorLoc && distanceMeters && distanceMeters > 500 ? 15 : 17,
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      if (interactive) {
        L.control.zoom({ position: 'bottomright' }).addTo(map);
      }

      // Add Google Maps Hybrid (Satellite + Labels) tiles for high-res coverage
      L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 18,
        attribution: '© Google Maps'
      }).addTo(map);

      // 1. Project Radius Circle
      const circleColor = isWithinRadius === false ? '#ef4444' : '#10b981';
      L.circle([projectLat, projectLng], {
        radius: projectRadius,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 6',
      }).addTo(map);

      // 2. Project Marker (Custom SVG icon)
      const projectIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div style="background-color:#1e293b; color:#ffffff; padding:6px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; width:34px; height:34px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1M9 13h1M9 17h1M14 13h1M14 17h1"/></svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([projectLat, projectLng], { icon: projectIcon })
        .addTo(map)
        .bindPopup(`<b>Titik Proyek:</b> ${projectName}<br/>Radius: ${projectRadius}m`);

      // 3. Executor Marker (if available)
      if (hasExecutorLoc) {
        const execPinColor = isWithinRadius === false ? '#dc2626' : '#059669';
        const executorIcon = L.divIcon({
          className: 'custom-leaflet-exec-pin',
          html: `
            <div style="background-color:${execPinColor}; color:#ffffff; padding:6px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; width:34px; height:34px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        L.marker([executorLat!, executorLng!], { icon: executorIcon })
          .addTo(map)
          .bindPopup(`<b>Lokasi Check-In Pelaksana</b><br/>Akurasi GPS: ±${Math.round(executorAccuracy || 10)}m<br/>Jarak: ${distanceMeters ? formatDistance(distanceMeters) : '-'}`);

        // Connecting Line
        L.polyline(
          [
            [projectLat, projectLng],
            [executorLat!, executorLng!],
          ],
          {
            color: isWithinRadius === false ? '#ef4444' : '#059669',
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.85,
          }
        ).addTo(map);

        // Optional Check-Out location
        if (checkOutLat && checkOutLng && (checkOutLat !== executorLat || checkOutLng !== executorLng)) {
          const checkOutIcon = L.divIcon({
            className: 'custom-leaflet-cout-pin',
            html: `
              <div style="background-color:#2563eb; color:#ffffff; padding:5px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; width:30px; height:30px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          L.marker([checkOutLat, checkOutLng], { icon: checkOutIcon })
            .addTo(map)
            .bindPopup('<b>Titik Check-Out</b>');
        }

        // Fit bounds nicely
        const group = L.featureGroup([
          L.marker([projectLat, projectLng]),
          L.marker([executorLat!, executorLng!]),
        ]);
        map.fitBounds(group.getBounds().pad(0.25));
      }
    } catch (e) {
      console.warn('Leaflet render fallback:', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [projectLat, projectLng, projectRadius, executorLat, executorLng, distanceMeters, isWithinRadius, checkOutLat, checkOutLng, projectName, executorAccuracy, interactive, hasExecutorLoc]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10" />
      
      {/* Floating Status Card Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 border border-slate-200/80 rounded-lg p-2.5 shadow-md text-xs max-w-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <MapPin size={14} className="text-slate-600 shrink-0" />
          <span className="truncate">{projectName}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Radius Toleransi: <span className="font-semibold text-slate-700">{projectRadius} meter</span>
        </div>
        
        {distanceMeters !== undefined && distanceMeters !== null && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-slate-500 text-[11px]">Jarak Pelaksana:</span>
            {isWithinRadius ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck size={12} /> {formatDistance(distanceMeters)} (Valid)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                <AlertTriangle size={12} /> {formatDistance(distanceMeters)} (Di Luar)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 border border-slate-200 rounded-md px-2.5 py-1 text-[10px] text-slate-600 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" /> Proyek
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Pelaksana
        </div>
      </div>
    </div>
  );
};
