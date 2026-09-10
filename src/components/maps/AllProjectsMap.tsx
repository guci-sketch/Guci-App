import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Project, UserLocation } from '../../types';
import { MapPin, User, Navigation } from 'lucide-react';

interface AllProjectsMapProps {
  projects: Project[];
  userLocations: UserLocation[];
  height?: string;
}

export const AllProjectsMap: React.FC<AllProjectsMapProps> = ({
  projects,
  userLocations,
  height = '600px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [-6.200000, 106.816666], // Default to Jakarta
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;

      // Add CartoDB Positron tiles for a clean dashboard look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      // Draw Projects
      projects.forEach(project => {
        if (!project.latitude || !project.longitude) return;
        
        bounds.extend([project.latitude, project.longitude]);

        // Radius circle
        L.circle([project.latitude, project.longitude], {
          radius: project.radius,
          color: '#3b82f6', // blue-500
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '4, 4',
        }).addTo(map);

        // Project Marker
        const projectIcon = L.divIcon({
          className: 'custom-leaflet-project-pin',
          html: `
            <div style="background-color:#1e293b; color:#ffffff; padding:4px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; width:28px; height:28px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1M9 13h1M9 17h1M14 13h1M14 17h1"/></svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([project.latitude, project.longitude], { icon: projectIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1">
              <div class="text-xs text-slate-500 font-bold uppercase mb-1">Area Proyek</div>
              <div class="font-bold text-sm mb-1">${project.projectName}</div>
              <div class="text-xs text-slate-600">${project.clientName}</div>
            </div>
          `);
      });

      // Draw Users
      userLocations.forEach(loc => {
        if (!loc.latitude || !loc.longitude) return;
        
        bounds.extend([loc.latitude, loc.longitude]);

        const userIcon = L.divIcon({
          className: 'custom-leaflet-user-pin',
          html: `
            <div style="background-color:#10b981; color:#ffffff; padding:4px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; width:30px; height:30px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        L.marker([loc.latitude, loc.longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1">
              <div class="text-xs text-emerald-600 font-bold uppercase mb-1">Pelaksana (Live)</div>
              <div class="font-bold text-sm mb-1">${loc.userName}</div>
              <div class="text-xs text-slate-600">Update Terakhir: ${new Date(loc.trackedAt).toLocaleTimeString('id-ID')}</div>
            </div>
          `);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
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
  }, [projects, userLocations]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10" />
      
      {/* Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 border border-slate-200 rounded-lg p-3 text-xs shadow-md">
        <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
          <Navigation size={14} className="text-emerald-600" />
          Peta Persebaran Aktif
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-800 inline-block border border-white shadow-sm" /> 
            <span className="text-slate-600 font-medium">Titik Proyek ({projects.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white shadow-sm" /> 
            <span className="text-slate-600 font-medium">Lokasi Pelaksana ({userLocations.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
